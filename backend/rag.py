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
                all_pages.extend(pages_data)
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
            all_pages.extend(extract_docx_pages(file_bytes))
        elif filename.endswith(".pptx") or filename.endswith(".ppt"):
            all_pages.extend(extract_pptx_pages(file_bytes))
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            all_pages.extend(extract_xlsx_pages(file_bytes))
        elif filename.endswith(".csv"):
            all_pages.extend(extract_txt_pages(file_bytes))
        else:
            # Fallback for plain text, markdown, json, etc.
            all_pages.extend(extract_txt_pages(file_bytes))
            
    return all_pages

def extract_topic_header(text: str) -> str:
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if not lines:
        return "Concept Node"
    first_line = lines[0]
    if len(first_line) > 60:
        return first_line[:57] + "..."
    return first_line

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
                    "page": page_num
                })
    return chunk_mappings