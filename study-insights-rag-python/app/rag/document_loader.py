from PyPDF2 import PdfReader


def extract_pdf_pages(pdf_path: str) -> list[dict]:
    """Extract text while preserving page numbers."""
    reader = PdfReader(pdf_path)
    pages = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = " ".join(text.split())

        if text:
            pages.append({
                "page": page_number,
                "text": text
            })

    return pages
