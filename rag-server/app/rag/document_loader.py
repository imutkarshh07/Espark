from pathlib import Path
from typing import List, Dict, Any
import io


class PDFDocumentLoader:
    """
    Extracts text content page-by-page from PDF, text, and markdown files.
    """

    def load_pdf(self, pdf_path_or_bytes) -> List[Dict[str, Any]]:
        pages = []
        try:
            # Try importing pypdf first, then PyPDF2
            try:
                import pypdf as pdf_lib
            except ImportError:
                import PyPDF2 as pdf_lib

            if isinstance(pdf_path_or_bytes, (str, Path)):
                reader = pdf_lib.PdfReader(str(pdf_path_or_bytes))
            elif isinstance(pdf_path_or_bytes, bytes):
                reader = pdf_lib.PdfReader(io.BytesIO(pdf_path_or_bytes))
            else:
                reader = pdf_lib.PdfReader(pdf_path_or_bytes)

            for i, page in enumerate(reader.pages):
                extracted = page.extract_text() or ""
                pages.append({
                    "page": i + 1,
                    "text": extracted.strip(),
                })
        except Exception as e:
            print(f"[PDFDocumentLoader] Error extracting PDF text: {e}")
            raise e

        return pages

    def load_text(self, text_content: str, max_chars_per_page: int = 1500) -> List[Dict[str, Any]]:
        """Splits raw text into simulated pages for consistent chunking."""
        if not text_content:
            return []
        
        pages = []
        paragraphs = text_content.split("\n\n")
        current_page = []
        current_len = 0
        page_num = 1

        for p in paragraphs:
            clean = p.strip()
            if not clean:
                continue
            if current_len + len(clean) > max_chars_per_page and current_page:
                pages.append({"page": page_num, "text": "\n\n".join(current_page)})
                page_num += 1
                current_page = [clean]
                current_len = len(clean)
            else:
                current_page.append(clean)
                current_len += len(clean)

        if current_page:
            pages.append({"page": page_num, "text": "\n\n".join(current_page)})

        return pages

