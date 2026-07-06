from pypdf import PdfReader
import io
from langchain_text_splitters import RecursiveCharacterTextSplitter

async def extract_pdf_text(files) -> str:
    """Reads PDF files asynchronously and extracts all text content."""
    combined_text = ""
    for file in files:
        pdf_bytes = await file.read()
        reader = PdfReader(io.BytesIO(pdf_bytes))
        for page in reader.pages:
            text = page.extract_text()
            if text:
                combined_text += text + "\n"
    return combined_text

def split_text(text: str) -> list[str]:
    """Splits a body of text into recursive overlapping character chunks."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )
    return splitter.split_text(text)