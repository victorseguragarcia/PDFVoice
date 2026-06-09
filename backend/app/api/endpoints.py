from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from pydantic import BaseModel
from app.services.pdf_service import PdfService, is_toc_page, TOC_ENTRY_PATTERN, TOC_HEADING_KEYWORDS
from app.services.tts_service import TTSService
from app.models.schemas import PdfProcessResponse, ErrorResponse, SaveAnnotationsRequest
import traceback
import fitz
import os
import time
import json

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class SynthesizeRequest(BaseModel):
    text: str
    voice: str = "es-ES-ElviraNeural"
    rate: str = "+0%"
    pitch: str = "+0Hz"

router = APIRouter()


@router.post("/upload", response_model=PdfProcessResponse)
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(success=False, error="El archivo debe ser un PDF").model_dump()
        )
    try:
        content = await file.read()
        
        timestamp = int(time.time())
        safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        with open(file_path, "wb") as f:
            f.write(content)

        response_data = PdfService.extract_content(content)
        response_data.metadata.filename = safe_filename
        return response_data
    except Exception as e:
        error_msg = f"Error interno: {str(e)}\n{traceback.format_exc()}"
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(success=False, error=error_msg).model_dump()
        )


@router.post("/debug")
async def debug_pdf(file: UploadFile = File(...)):
    """Endpoint de diagnóstico: devuelve el análisis página por página."""
    content = await file.read()
    doc = fitz.open(stream=content, filetype="pdf")

    native_toc = doc.get_toc()
    pages_info = []

    for page_num, page in enumerate(doc):
        blocks = [b for b in page.get_text("dict")["blocks"] if b["type"] == 0]
        all_lines = [
            " ".join(s["text"] for s in line["spans"]).strip()
            for block in blocks
            for line in block["lines"]
        ]
        all_lines = [l for l in all_lines if len(l) > 2]
        toc_like_lines = [l for l in all_lines if TOC_ENTRY_PATTERN.match(l)]

        keyword_found = None
        for block in blocks:
            text = " ".join(
                s["text"] for line in block["lines"] for s in line["spans"]
            ).strip().lower()
            for kw in TOC_HEADING_KEYWORDS:
                if kw in text:
                    keyword_found = kw
                    break
            if keyword_found:
                break

        ratio = len(toc_like_lines) / len(all_lines) if all_lines else 0
        detected = is_toc_page(page)

        pages_info.append({
            "page": page_num + 1,
            "is_toc_detected": detected,
            "keyword_found": keyword_found,
            "total_lines": len(all_lines),
            "toc_like_lines": len(toc_like_lines),
            "toc_ratio": round(ratio, 2),
            "first_lines": all_lines[:6],
        })

    doc.close()

    return {
        "total_pages": len(pages_info),
        "native_toc_entries": len(native_toc),
        "native_toc_sample": native_toc[:10],
        "pages": pages_info
    }

@router.post("/synthesize")
async def synthesize_text(request: SynthesizeRequest):
    try:
        audio_io = await TTSService.synthesize(
            text=request.text,
            voice=request.voice,
            rate=request.rate,
            pitch=request.pitch,
        )
        return StreamingResponse(audio_io, media_type="audio/wav")
    except Exception as e:
        error_msg = f"Error TTS: {str(e)}"
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(success=False, error=error_msg).model_dump()
        )

@router.get("/voices")
async def list_voices():
    try:
        voices = await TTSService.list_voices()
        return {"success": True, "voices": voices}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(success=False, error=str(e)).model_dump()
        )

@router.get("/history")
async def get_history():
    files = []
    for filename in os.listdir(UPLOAD_DIR):
        if filename.endswith(".pdf"):
            filepath = os.path.join(UPLOAD_DIR, filename)
            stats = os.stat(filepath)
            original_name = filename.split("_", 1)[-1] if "_" in filename else filename
            files.append({
                "filename": filename,
                "original_name": original_name,
                "size": stats.st_size,
                "created_at": stats.st_ctime
            })
    files.sort(key=lambda x: x["created_at"], reverse=True)
    return {"success": True, "history": files}

@router.get("/history/{filename}", response_model=PdfProcessResponse)
async def load_history_pdf(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path) or not file_path.startswith(UPLOAD_DIR):
        return JSONResponse(
            status_code=404,
            content=ErrorResponse(success=False, error="Archivo no encontrado").model_dump()
        )
    
    try:
        with open(file_path, "rb") as f:
            content = f.read()
        response_data = PdfService.extract_content(content)
        response_data.metadata.filename = filename
        return response_data
    except Exception as e:
        error_msg = f"Error interno: {str(e)}\n{traceback.format_exc()}"
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(success=False, error=error_msg).model_dump()
        )


@router.get("/raw-pdf/{filename}")
async def get_raw_pdf(filename: str):
    """Serves the raw, unmodified PDF file."""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path) or not file_path.startswith(UPLOAD_DIR):
        return JSONResponse(
            status_code=404,
            content=ErrorResponse(success=False, error="Archivo no encontrado").model_dump()
        )
    return FileResponse(file_path, media_type="application/pdf")


@router.get("/page-image/{filename}/{page_number}")
async def get_page_image(filename: str, page_number: int):
    """Renders a PDF page to an image and returns it."""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path) or not file_path.startswith(UPLOAD_DIR):
        return JSONResponse(
            status_code=404,
            content=ErrorResponse(success=False, error="Archivo no encontrado").model_dump()
        )
    try:
        # Open PDF
        doc = fitz.open(file_path)
        
        # Check page_number range (1-indexed)
        if page_number < 1 or page_number > len(doc):
            doc.close()
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(success=False, error=f"Página fuera de rango (1-{len(doc)})").model_dump()
            )
            
        page = doc[page_number - 1]
        
        # Render page to high quality image (DPI=150)
        pix = page.get_pixmap(dpi=150)
        img_data = pix.tobytes("png")
        
        doc.close()
        
        from io import BytesIO
        return StreamingResponse(BytesIO(img_data), media_type="image/png")
    except Exception as e:
        error_msg = f"Error renderizando página: {str(e)}"
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(success=False, error=error_msg).model_dump()
        )

@router.get("/annotations/{filename}")
async def get_annotations(filename: str):
    file_path = os.path.join(UPLOAD_DIR, f"{filename}_annotations.json")
    if not os.path.exists(file_path) or not file_path.startswith(UPLOAD_DIR):
        return {"success": True, "annotations": []}
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            annotations = json.load(f)
        return {"success": True, "annotations": annotations}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(success=False, error=str(e)).model_dump()
        )

@router.post("/annotations/{filename}")
async def save_annotations(filename: str, request: SaveAnnotationsRequest):
    file_path = os.path.join(UPLOAD_DIR, f"{filename}_annotations.json")
    if not file_path.startswith(UPLOAD_DIR):
        return JSONResponse(status_code=400, content=ErrorResponse(success=False, error="Ruta inválida").model_dump())
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump([ann.model_dump() for ann in request.annotations], f, ensure_ascii=False)
        return {"success": True}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(success=False, error=str(e)).model_dump()
        )
