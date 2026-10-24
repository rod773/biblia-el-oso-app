"""Genera src/pages.json a partir del PDF reorganizado del libro.

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


def main() -> None:
    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    if not pdf.exists():
        sys.exit(f"No existe el PDF: {pdf}")

    doc = fitz.open(pdf)
    pages = [
        {"page": i + 1, "text": normalize(doc[i].get_text())}
        for i in range(doc.page_count)
    ]
    doc.close()

    OUT.write_text(json.dumps(pages, ensure_ascii=False, indent=2), encoding="utf-8")
    empty = sum(1 for p in pages if not p["text"])
    print(f"Wrote {len(pages)} pages to {OUT} ({empty} empty)")


if __name__ == "__main__":
    main()
