import fitz  # PyMuPDF
import numpy as np
import cv2
import logging
import zipfile
import io
import xml.etree.ElementTree as ET
from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from rapidocr_onnxruntime import RapidOCR
from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import settings

logger = logging.getLogger(__name__)

def process_doc_pages(doc) -> list[dict]:
    """Synchronous function to process PDF pages and run OCR fallback."""
    pages_data = []
    ocr = None
    ocr_pages_count = 0
    
    for idx, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            pages_data.append({"page": idx + 1, "text": text})
        else:
            ocr_pages_count += 1
            if ocr_pages_count > 10:
                raise HTTPException(
                    status_code=400,
                    detail="This scanned document exceeds the maximum limit of 10 pages for OCR processing."
                )
            if ocr is None:
                ocr = RapidOCR()
            zoom = 2
            mat = fitz.Matrix(zoom, zoom)
            try:
                pix = page.get_pixmap(matrix=mat)
                img_bytes = pix.tobytes("png")
                nparr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                result, _ = ocr(img)
                if result:
                    page_text = "\n".join([line[1] for line in result])
                    pages_data.append({"page": idx + 1, "text": page_text})
            except Exception as ocr_err:
                logger.error(f"Failed to OCR page {idx+1}: {ocr_err}")
    return pages_data

def extract_docx_pages(content_bytes: bytes) -> list[dict]:
    try:
        with zipfile.ZipFile(io.BytesIO(content_bytes)) as docx:
            xml_content = docx.read('word/document.xml')
            root = ET.fromstring(xml_content)
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            text_runs = root.findall('.//w:t', namespaces)
            full_text = ' '.join([node.text for node in text_runs if node.text])
            
            # Segment text into page chunks (~2500 chars per page)
            pages = []
            chunk_size = 2500
            for idx in range(0, len(full_text), chunk_size):
                pages.append({
                    "page": (idx // chunk_size) + 1,
                    "text": full_text[idx:idx + chunk_size]
                })
            return pages
    except Exception as e:
        logger.error(f"DOCX parser error: {e}")
        return [{"page": 1, "text": content_bytes.decode('utf-8', errors='ignore')[:3000]}]

def extract_pptx_pages(content_bytes: bytes) -> list[dict]:
    try:
        pages = []
        with zipfile.ZipFile(io.BytesIO(content_bytes)) as pptx:
            slide_files = sorted([f for f in pptx.namelist() if f.startswith('ppt/slides/slide')])
            for idx, slide_file in enumerate(slide_files):
                xml_content = pptx.read(slide_file)
                root = ET.fromstring(xml_content)
                namespaces = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
                slide_text = " ".join([node.text for node in root.findall('.//a:t', namespaces) if node.text])
                pages.append({
                    "page": idx + 1,
                    "text": slide_text if slide_text.strip() else f"[Empty Slide {idx+1}]"
                })
        return pages
    except Exception as e:
        logger.error(f"PPTX parser error: {e}")
        return [{"page": 1, "text": "[Error parsing slide deck]"}]

def extract_xlsx_pages(content_bytes: bytes) -> list[dict]:
    try:
        text_runs = []
        with zipfile.ZipFile(io.BytesIO(content_bytes)) as xlsx:
            shared_strings = []
            if 'xl/sharedStrings.xml' in xlsx.namelist():
                root_ss = ET.fromstring(xlsx.read('xl/sharedStrings.xml'))
                namespaces = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                shared_strings = [node.text for node in root_ss.findall('.//ns:t', namespaces) if node.text]
            
            sheet_files = sorted([f for f in xlsx.namelist() if f.startswith('xl/worksheets/sheet')])
            for sheet_file in sheet_files:
                root_sheet = ET.fromstring(xlsx.read(sheet_file))
                namespaces = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                for row in root_sheet.findall('.//ns:row', namespaces):
                    row_vals = []
                    for cell in row.findall('.//ns:v', namespaces):
                        val = cell.text
                        t_attr = cell.get('t')
                        if t_attr == 's' and val is not None:
                            idx = int(val)
                            if idx < len(shared_strings):
                                row_vals.append(shared_strings[idx])
                        elif val is not None:
                            row_vals.append(val)
                    if row_vals:
                        text_runs.append(" | ".join(row_vals))
                        
        # Split into groups of 30 spreadsheet rows = Page
        pages = []
        rows_per_page = 30
        for idx in range(0, len(text_runs), rows_per_page):
            page_text = "\n".join(text_runs[idx:idx + rows_per_page])
            pages.append({
                "page": (idx // rows_per_page) + 1,
                "text": page_text
            })
        return pages
    except Exception as e:
        logger.error(f"XLSX parser error: {e}")
        return [{"page": 1, "text": "[Error parsing spreadsheet rows]"}]

def extract_txt_pages(content_bytes: bytes) -> list[dict]:
    try:
        full_text = content_bytes.decode('utf-8', errors='ignore')
        pages = []
        chunk_size = 2500
        for idx in range(0, len(full_text), chunk_size):
            pages.append({
                "page": (idx // chunk_size) + 1,
                "text": full_text[idx:idx + chunk_size]
            })
        return pages
    except Exception as e:
        logger.error(f"Text decoding failed: {e}")
        return [{"page": 1, "text": ""}]

async def extract_file_text(files) -> list[dict]:
    """Universal text parser routing ingestion based on file extension."""
    all_pages = []
    
    for file in files:
        file_bytes = await file.read()
        filename = file.filename.lower()
        logger.info(f"Ingesting file: {filename}, size: {len(file_bytes)} bytes")
        
        pages_data = []
        # Route depending on formats
        if filename.endswith(".pdf"):
            try:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                page_count = len(doc)
                if page_count > 100:
                    doc.close()
                    raise HTTPException(
                        status_code=400,
                        detail="PDF exceeds the maximum limit of 100 pages."
                    )
                pages_data = await run_in_threadpool(process_doc_pages, doc)
                doc.close()
            except HTTPException as he:
                raise he
            except Exception as open_err:
                logger.error(f"PyMuPDF failed to open document: {open_err}")
                raise HTTPException(
                    status_code=400,
                    detail="Failed to open PDF document."
                )
        elif filename.endswith(".docx") or filename.endswith(".doc"):
            pages_data = extract_docx_pages(file_bytes)
        elif filename.endswith(".pptx") or filename.endswith(".ppt"):
            pages_data = extract_pptx_pages(file_bytes)
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            pages_data = extract_xlsx_pages(file_bytes)
        elif filename.endswith(".csv"):
            pages_data = extract_txt_pages(file_bytes)
        else:
            # Fallback for plain text, markdown, json, etc.
            pages_data = extract_txt_pages(file_bytes)
            
        for p in pages_data:
            p["filename"] = file.filename
        all_pages.extend(pages_data)
            
    return all_pages

def extract_topic_header(text: str) -> str:
    import re
    # Match date patterns (e.g. 1/23/2026 26) inside strings to strip them out
    date_slide_pattern = re.compile(r'\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}(\s+\d+)?\b')
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if not lines:
        return "Concept Node"
        
    # Match strings that consist entirely of metadata like page numbers, dates, times or separator lines
    metadata_pattern = re.compile(
        r'^(\d{1,4}[/\-.]\d{1,4}[/\-.]\d{2,4}(\s+\d+)?|'
        r'\d{1,2}:\d{2}(\s*[aApP][mM])?|'
        r'page\s*\d+|'
        r'\d+|'
        r'slide\s*\d+|'
        r'[.\-\s_#*]+)$',
        re.IGNORECASE
    )
    
    topic_line = None
    for line in lines:
        cleaned_line = date_slide_pattern.sub('', line).strip()
        if metadata_pattern.match(line) or not cleaned_line:
            continue
        if len(cleaned_line) > 2:
            topic_line = cleaned_line
            break
            
    if not topic_line:
        for line in lines:
            cleaned = date_slide_pattern.sub('', line).strip()
            if cleaned:
                topic_line = cleaned
                break
                
    if not topic_line:
        return "Concept Node"
        
    # Collapse consecutive spaces
    topic_line = re.sub(r'\s+', ' ', topic_line).strip()
    
    if len(topic_line) > 60:
        return topic_line[:57] + "..."
    return topic_line

def split_parent_child_by_page(pages: list[dict]) -> list[dict]:
    parent_splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.parent_chunk_size,
        chunk_overlap=settings.parent_chunk_overlap
    )
    child_splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.child_chunk_size,
        chunk_overlap=settings.child_chunk_overlap
    )
    chunk_mappings = []
    for page_data in pages:
        page_num = page_data["page"]
        page_text = page_data["text"]
        parent_chunks = parent_splitter.split_text(page_text)
        for parent_chunk in parent_chunks:
            child_chunks = child_splitter.split_text(parent_chunk)
            for child_chunk in child_chunks:
                chunk_mappings.append({
                    "child": child_chunk,
                    "parent": parent_chunk,
                    "page": page_num,
                    "filename": page_data.get("filename", "")
                })
    return chunk_mappings

def detect_missing_clauses_hybrid(chunks: list[dict]) -> list[str]:
    """
    Scans the extracted parent chunks using a hybrid keyword/phrase matching strategy
    to identify missing protective clause categories in vendor agreements.
    """
    categories = {
        "Limitation of Liability": ["limitation of liability", "cap liability", "liability cap", "maximum liability", "disclaim consequential", "limit of liability"],
        "Force Majeure": ["force majeure", "act of god", "excusable delay", "unforeseen event", "suspension of performance"],
        "Data Protection (DPA)": ["data protection", "dpa", "personal data", "gdpr", "data privacy", "information security", "processing of data"],
        "Assignment Restriction": ["assignment", "assign", "transfer restriction", "delegate", "change of control", "consent to transfer"],
        "Indemnity Cap": ["indemnity cap", "limit indemnity", "indemnification limit", "cap on indemnity", "indemnify cap"],
        "Governing Law": ["governing law", "applicable law", "choice of law", "governed by", "jurisdiction of"],
        "Dispute Resolution": ["dispute resolution", "arbitration", "mediation", "litigation", "settling disputes", "resolve dispute"]
    }
    
    missing = []
    parent_texts_lower = [c["parent"].lower() for c in chunks if "parent" in c]
    
    for category, keywords in categories.items():
        found = False
        for text in parent_texts_lower:
            if any(kw in text for kw in keywords):
                found = True
                break
        if not found:
            missing.append(category)
            
    return missing

def check_ats_structure(raw_text: str) -> dict:
    """
    Evaluates raw resume text for structural ATS-friendliness.
    """
    import re
    text_lower = raw_text.lower()
    
    # 1. Missing standard sections
    sections = {
        "Experience/Work History": ["experience", "employment", "work history", "history", "professional experience"],
        "Education": ["education", "academic", "university", "college", "school"],
        "Skills": ["skills", "technologies", "expertise", "specialties", "competencies"]
    }
    missing_sections = []
    for section_name, keywords in sections.items():
        if not any(kw in text_lower for kw in keywords):
            missing_sections.append(section_name)
            
    # 2. Text layout / column wrapping issues (short lines check)
    lines = [line.strip() for line in raw_text.split("\n") if line.strip()]
    short_lines = [line for line in lines if len(line) < 15]
    non_linear_warning = len(short_lines) / len(lines) > 0.35 if lines else False
    
    # 3. Encoding / Unicode errors
    replacement_char_count = raw_text.count("")
    unusual_char_pattern = re.compile(r"[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]")
    unusual_chars = unusual_char_pattern.findall(raw_text)
    encoding_warning = (replacement_char_count > 2) or (len(unusual_chars) > len(raw_text) * 0.01)
    
    # 4. Contact details validation
    email_match = re.search(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b", raw_text)
    phone_match = re.search(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", raw_text)
    missing_contact = not (email_match or phone_match)
    
    return {
        "missing_sections": missing_sections,
        "non_linear_warning": non_linear_warning,
        "encoding_warning": encoding_warning,
        "missing_contact": missing_contact,
        "score": max(0, 100 - (len(missing_sections) * 20) - (20 if non_linear_warning else 0) - (15 if encoding_warning else 0) - (25 if missing_contact else 0))
    }

def classify_seniority_tier(raw_text: str) -> str:
    """
    Classifies candidate experience level based on resume keyword metrics.
    """
    import re
    text_lower = raw_text.lower()
    
    # Check for direct staff/principal titles
    staff_keywords = ["staff", "principal", "director", "architect"]
    senior_keywords = ["senior", "lead", "manager", "head"]
    junior_keywords = ["junior", "intern", "student", "graduate", "new grad", "freshman"]
    
    # Match years of experience numbers
    yoe_matches = re.findall(r"(\d+)\+?\s*years?\b", text_lower)
    max_yoe = 0
    if yoe_matches:
        try:
            max_yoe = max(int(m) for m in yoe_matches)
        except ValueError:
            pass
            
    if any(kw in text_lower for kw in staff_keywords) or max_yoe >= 8:
        return "STAFF"
    if any(kw in text_lower for kw in senior_keywords) or max_yoe >= 5:
        return "SENIOR"
    if any(kw in text_lower for kw in junior_keywords) or (max_yoe > 0 and max_yoe < 2):
        return "NEW_GRAD"
        
    return "MID"

def analyze_spreadsheet_data(full_text: str) -> dict:
    import re
    lines = [line.strip() for line in full_text.split('\n') if line.strip()]
    if not lines:
        return {"variables": [], "outliers": [], "forecast": {}}
        
    # Detect delimiter
    first_line = lines[0]
    delimiter = '|' if '|' in first_line else ','
    
    # Split rows
    raw_rows = []
    for line in lines:
        row = [val.strip() for val in line.split(delimiter)]
        if row:
            raw_rows.append(row)
            
    if not raw_rows:
        return {"variables": [], "outliers": [], "forecast": {}}
        
    headers = raw_rows[0]
    num_cols = len(headers)
    
    # Identify numeric columns
    numeric_columns = {}
    for col_idx in range(num_cols):
        col_name = headers[col_idx]
        col_vals = []
        for row in raw_rows[1:]:
            if col_idx < len(row):
                val_str = row[col_idx].replace('$', '').replace('%', '').replace(',', '').strip()
                try:
                    val = float(val_str)
                    col_vals.append(val)
                except ValueError:
                    pass
        # If >= 70% of rows are numeric, classify as numeric column
        if len(col_vals) >= (len(raw_rows) - 1) * 0.7 and len(col_vals) > 0:
            numeric_columns[col_name] = col_vals
            
    # Calculate statistics and find outliers
    outliers = []
    variables = []
    
    for col_name, vals in numeric_columns.items():
        if len(vals) < 2:
            continue
        arr = np.array(vals)
        mean = float(np.mean(arr))
        std = float(np.std(arr))
        min_val = float(np.min(arr))
        max_val = float(np.max(arr))
        
        variables.append({
            "name": col_name,
            "min": min_val,
            "max": max_val,
            "value": mean,
            "mean": mean
        })
        
        # Outlier check: 3 standard deviations
        if std > 0:
            for row_idx, row in enumerate(raw_rows[1:]):
                if col_name in headers:
                    c_idx = headers.index(col_name)
                    if c_idx < len(row):
                        try:
                            val_str = row[c_idx].replace('$', '').replace('%', '').replace(',', '').strip()
                            val = float(val_str)
                            if abs(val - mean) > 2.5 * std:
                                # Estimate page (30 rows per page)
                                page_num = (row_idx // 30) + 1
                                outliers.append({
                                    "row": row_idx + 1,
                                    "page": page_num,
                                    "column": col_name,
                                    "value": val,
                                    "mean": mean,
                                    "std": std,
                                    "description": f"Value {val} in row {row_idx+1} is an outlier for {col_name} (mean: {mean:.2f}, std: {std:.2f})"
                                })
                        except ValueError:
                            pass
                            
    # Trend forecasting: first numeric column as Y, row index as X
    forecast = {}
    if variables:
        target_var = variables[0]["name"]
        y_vals = numeric_columns[target_var]
        x_vals = list(range(len(y_vals)))
        if len(y_vals) > 3:
            slope, intercept = np.polyfit(x_vals, y_vals, 1)
            # Forecast next 10 intervals
            future_x = list(range(len(y_vals), len(y_vals) + 10))
            future_y = [float(slope * x + intercept) for x in future_x]
            forecast = {
                "variable": target_var,
                "slope": float(slope),
                "intercept": float(intercept),
                "future_points": [{"x": x, "y": y} for x, y in zip(future_x, future_y)],
                "historical_points": [{"x": x, "y": y} for x, y in zip(x_vals, y_vals)]
            }
            
    return {
        "variables": variables,
        "outliers": outliers,
        "forecast": forecast
    }