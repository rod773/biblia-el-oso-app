"""Genera src/pages.json a partir del PDF reorganizado del libro.

Extrae libro y capítulo de los bookmarks (TOC) del PDF y los asigna a cada página.

Requiere: pip install pymupdf
Uso: python scripts/generate-pages.py [ruta-al-pdf]
"""
import json
import re
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PDF = ROOT / "Biblia el oso.pdf"
OUT = ROOT / "src" / "pages.json"

CHAPTER_RE = re.compile(r"(?:cap[ií]tulo|salmo)\s+(\d+)", re.IGNORECASE)


def normalize(text: str) -> str:
    text = (
        text.replace("\xa0", " ")
        .replace("\u2028", "\n")
        .replace("\u2029", "\n\n")
    )
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()
    text = re.sub(r"\n\d{1,3}$", "", text)
    return text


def build_segments(toc):
    """Devuelve lista de (libro, capítulo, página_inicial) a partir del TOC.

    Rastrear el libro (nivel 2) vigente mientras se recorre el TOC.
    """
    segments = []
    current_book = None
    for level, title, page in toc:
        if level == 2:
            current_book = title
        elif level == 3 and current_book is not None:
            m = CHAPTER_RE.search(title)
            if m:
                chapter = int(m.group(1))
                segments.append((current_book, chapter, page))
    return segments


def chapter_for_page(segments, page):
    """Devuelve (libro, capítulo) vigente para la página dada (1-indexed)."""
    book = None
    chapter = None
    for b, c, start in segments:
        if start <= page:
            book = b
            chapter = c
        else:
            break
    return book, chapter


def main() -> None:
    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    if not pdf.exists():
        sys.exit(f"No existe el PDF: {pdf}")

    doc = fitz.open(pdf)
    toc = doc.get_toc()
    segments = build_segments(toc)

    pages = []
    for i in range(doc.page_count):
        page_num = i + 1
        book, chapter = chapter_for_page(segments, page_num)
        pages.append({
            "page": page_num,
            "book": book,
            "chapter": chapter,
            "text": normalize(doc[i].get_text()),
        })
    doc.close()

    OUT.write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding="utf-8")

    books = {}
    for p in pages:
        if p["book"]:
            books.setdefault(p["book"], set()).add(p["chapter"])
    print(f"Wrote {len(pages)} pages to {OUT}")
    print(f"Libros detectados: {len(books)}")
    for b in sorted(books):
        print(f"  {b}: {len(books[b])} capítulos")


if __name__ == "__main__":
    main()
