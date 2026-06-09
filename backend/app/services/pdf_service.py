import fitz
import base64
import re
import unicodedata
from app.models.schemas import PdfProcessResponse, PdfMetadata, ContentBlock, TocEntry
from typing import List, Dict, Tuple, Optional

# ──────────────────────────────────────────────────────────────────
# TEXT UTILITIES
# ──────────────────────────────────────────────────────────────────

def normalize(text: str) -> str:
    """Lowercase, strip accents, collapse whitespace, remove non-alphanumeric."""
    text = text.lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\w\s]", "", text)
    return text.strip()


# ──────────────────────────────────────────────────────────────────
# TOC KEYWORD DETECTION (for labelling pages only)
# ──────────────────────────────────────────────────────────────────

TOC_PAGE_KEYWORDS = {
    "índice", "indice", "contenido", "tabla de contenido",
    "table of contents", "contents", "index", "summary", "sumario"
}

TOC_HEADING_KEYWORDS = TOC_PAGE_KEYWORDS

# Matches: "Title ...... 12" OR "Title   12"
TOC_ENTRY_PATTERN = re.compile(
    r"^.{2,100}([\s.·\-_]{2,}\d{1,4}|[ ]{3,}\d{1,4})\s*$"
)


def is_toc_page(page: fitz.Page) -> bool:
    blocks = [b for b in page.get_text("dict")["blocks"] if b["type"] == 0]
    if not blocks:
        return False

    all_lines, all_text_lower = [], []
    for block in blocks:
        for line in block["lines"]:
            t = " ".join(s["text"] for s in line["spans"]).strip()
            if len(t) > 1:
                all_lines.append(t)
                all_text_lower.append(t.lower())

    for text in all_text_lower:
        if any(kw == text.strip() or kw in text for kw in TOC_PAGE_KEYWORDS):
            return True

    if not all_lines:
        return False
    toc_like = sum(1 for l in all_lines if TOC_ENTRY_PATTERN.match(l))
    return (toc_like / len(all_lines)) > 0.30


# ──────────────────────────────────────────────────────────────────
# MAIN SERVICE
# ──────────────────────────────────────────────────────────────────

class PdfService:
    @staticmethod
    def extract_content(pdf_bytes: bytes) -> PdfProcessResponse:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        # ── 1. Native PDF bookmarks ───────────────────────────────
        native_toc_raw = doc.get_toc()
        has_native_toc = len(native_toc_raw) > 0

        # ── 2. Compute base font size ─────────────────────────────
        text_sizes: List[float] = []
        for page in doc:
            for block in page.get_text("dict")["blocks"]:
                if block["type"] == 0:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            if span["text"].strip():
                                text_sizes.append(span["size"])

        base_size = 12.0
        if text_sizes:
            size_counts: Dict[float, int] = {}
            for sz in text_sizes:
                s = round(sz, 1)
                size_counts[s] = size_counts.get(s, 0) + 1
            base_size = max(size_counts, key=size_counts.__getitem__)

        h1_threshold = base_size * 1.5
        h2_threshold = base_size * 1.2

        # ── 3. First pass: extract ALL blocks with metadata ───────
        # raw_blocks: list of dicts {type, content, page, tag, is_bold, max_size}
        raw_blocks = []

        for page_num, page in enumerate(doc):
            blocks = page.get_text("dict")["blocks"]
            blocks.sort(key=lambda b: (b["bbox"][1], b["bbox"][0]))
            page_height = page.rect.height

            for block in blocks:
                y0, y1 = block["bbox"][1], block["bbox"][3]
                if y0 < page_height * 0.08 or y1 > page_height * 0.92:
                    continue

                if block["type"] == 0:
                    block_text = ""
                    block_max_size = 0.0
                    is_bold = False

                    for line in block["lines"]:
                        for span in line["spans"]:
                            block_text += span["text"] + " "
                            if span["size"] > block_max_size:
                                block_max_size = span["size"]
                            font = span["font"].lower()
                            if "bold" in font or "black" in font or (span["flags"] & 16):
                                is_bold = True

                    block_text = block_text.strip()
                    if not block_text:
                        continue

                    tag = "p"
                    if block_max_size >= h1_threshold:
                        tag = "h1"
                    elif block_max_size >= h2_threshold:
                        tag = "h2"
                    elif is_bold and block_max_size > base_size:
                        tag = "h3"

                    raw_blocks.append({
                        "type": "text",
                        "tag": tag,
                        "content": block_text,
                        "page": page_num + 1,
                        "max_size": block_max_size,
                        "is_bold": is_bold,
                        "bbox": [block["bbox"][0], block["bbox"][1], block["bbox"][2], block["bbox"][3]],
                        "page_width": page.rect.width,
                        "page_height": page.rect.height,
                    })

                elif block["type"] == 1:
                    image_bytes = block.get("image")
                    if image_bytes:
                        b64 = base64.b64encode(image_bytes).decode("utf-8")
                        ext = block.get("ext", "png")
                        raw_blocks.append({
                            "type": "img",
                            "tag": "img",
                            "content": f"data:image/{ext};base64,{b64}",
                            "page": page_num + 1,
                        })

        total_pages = len(doc)
        doc.close()

        # ── 4. Duplicate-heading detection ────────────────────────
        # Strategy:
        #   a) If native bookmarks exist → use them + mark nothing as is_toc
        #   b) Otherwise:
        #      - Find all heading text → group by normalized form
        #      - For groups with ≥ 2 occurrences, the FIRST is a TOC entry
        #        (provided it appears in the first ~20% of pages)
        #      - Mark those blocks as is_toc=True
        #      - Also mark whole TOC pages (pages containing TOC keyword)

        toc_page_set: set = set()
        for i, rb in enumerate(raw_blocks):
            if rb["type"] == "img":
                continue
            pg = rb["page"] - 1
            # detect toc-keyword pages lazily
            # We'll check by scanning the document for keyword pages
        # Re-scan for TOC page indices
        doc2 = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page_num, page in enumerate(doc2):
            if is_toc_page(page):
                toc_page_set.add(page_num + 1)  # 1-indexed pages
        doc2.close()

        if has_native_toc:
            # Use native bookmarks; mark is_toc for pages in toc_page_set
            native_entries = [
                TocEntry(level=e[0], title=e[1].strip(), page=e[2])
                for e in native_toc_raw if e[1].strip()
            ]
            # Assign block_index by matching native entry titles to headings
            heading_list: List[Tuple[int, str]] = [
                (i, normalize(rb["content"]))
                for i, rb in enumerate(raw_blocks)
                if rb["type"] == "text" and rb["tag"] in ("h1", "h2", "h3")
                   and rb["page"] not in toc_page_set
            ]
            for entry in native_entries:
                nkey = normalize(entry.title)
                best_idx, best_score = None, 0.0
                for blk_i, nh in heading_list:
                    # exact or substring match
                    if nkey == nh:
                        best_idx = blk_i; break
                    if nkey and nh and (nkey in nh or nh in nkey):
                        score = len(min(nkey, nh, key=len)) / len(max(nkey, nh, key=len))
                        if score > best_score:
                            best_score, best_idx = score, blk_i
                entry.block_index = best_idx if (best_idx is not None and (best_idx == best_idx or best_score >= 0.5)) else None

            structured_content = [
                ContentBlock(
                    type=rb["tag"],
                    content=rb["content"],
                    page=rb["page"],
                    is_toc=rb["page"] in toc_page_set,
                    bbox=rb.get("bbox"),
                    page_width=rb.get("page_width"),
                    page_height=rb.get("page_height"),
                )
                for rb in raw_blocks
            ]
            return PdfProcessResponse(
                success=True,
                metadata=PdfMetadata(base_size=base_size, total_pages=total_pages, has_native_toc=True),
                toc=native_entries,
                content=structured_content,
            )

        # ── b) No native bookmarks: use duplicate detection ───────
        # Map normalized heading → list of raw_block indices
        heading_occurrences: Dict[str, List[int]] = {}
        for i, rb in enumerate(raw_blocks):
            if rb["type"] == "text" and rb["tag"] in ("h1", "h2", "h3"):
                key = normalize(rb["content"])
                if key and len(key) >= 3:
                    heading_occurrences.setdefault(key, []).append(i)

        # TOC entry = first occurrence of a heading that appears ≥ 2 times
        # AND (is on a detected TOC page OR is in the first 30% of pages)
        toc_block_indices: set = set()
        toc_entries_dup: List[TocEntry] = []

        page_threshold = max(2, round(total_pages * 0.30))

        for key, indices in heading_occurrences.items():
            if len(indices) >= 2:
                first_idx = indices[0]
                first_page = raw_blocks[first_idx]["page"]
                # Classify first occurrence as TOC if it's early or on a toc-keyword page
                if first_page <= page_threshold or first_page in toc_page_set:
                    toc_block_indices.add(first_idx)

        # Also mark all blocks on detected TOC pages as is_toc
        for i, rb in enumerate(raw_blocks):
            if rb["page"] in toc_page_set:
                toc_block_indices.add(i)

        # Build TOC entries from duplicate headings (in document order)
        seen_keys: set = set()
        for i, rb in enumerate(raw_blocks):
            if i not in toc_block_indices:
                continue
            if rb["type"] != "text":
                continue
            key = normalize(rb["content"])
            if key in seen_keys:
                continue
            seen_keys.add(key)

            # Find the BODY block (same text, NOT in toc_block_indices)
            body_idx: Optional[int] = None
            occurrences = heading_occurrences.get(key, [])
            for occ_i in occurrences:
                if occ_i not in toc_block_indices:
                    body_idx = occ_i
                    break

            level = 1 if rb["tag"] == "h1" else (2 if rb["tag"] == "h2" else 3)
            toc_entries_dup.append(TocEntry(
                level=level,
                title=rb["content"].strip(),
                page=rb["page"],
                block_index=body_idx
            ))

        # ── 5. Build final content list ───────────────────────────
        structured_content = [
            ContentBlock(
                type=rb["tag"],
                content=rb["content"],
                page=rb["page"],
                is_toc=(i in toc_block_indices),
                bbox=rb.get("bbox"),
                page_width=rb.get("page_width"),
                page_height=rb.get("page_height"),
            )
            for i, rb in enumerate(raw_blocks)
        ]

        return PdfProcessResponse(
            success=True,
            metadata=PdfMetadata(base_size=base_size, total_pages=total_pages, has_native_toc=False),
            toc=toc_entries_dup,
            content=structured_content,
        )
