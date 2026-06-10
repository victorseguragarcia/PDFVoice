from pydantic import BaseModel, Field
from typing import List, Optional

class WordPosition(BaseModel):
    text: str = Field(..., description="Texto del fragmento")
    bbox: List[float] = Field(..., description="Coordenadas: [x0, y0, x1, y1]")
    size: float = Field(0.0, description="Tamaño de fuente")

class TocEntry(BaseModel):
    level: int = Field(..., description="Nivel de profundidad: 1=h1, 2=h2, 3=h3")
    title: str = Field(..., description="Texto del título")
    page: int = Field(..., description="Número de página destino (1-indexed)")
    # block_index will be resolved on the frontend by matching title against content
    block_index: Optional[int] = Field(None, description="Índice del bloque de contenido correspondiente")

class ContentBlock(BaseModel):
    type: str = Field(..., description="Tipo de bloque: h1, h2, h3, p, img o toc_section")
    content: str = Field(..., description="Contenido en texto o base64 (para img)")
    page: int = Field(0, description="Página de origen del bloque (1-indexed)")
    is_toc: bool = Field(False, description="True si este bloque pertenece a la sección de índice del documento")
    bbox: Optional[List[float]] = Field(None, description="Coordenadas del bloque: [x0, y0, x1, y1]")
    page_width: Optional[float] = Field(None, description="Ancho de la página de origen")
    page_height: Optional[float] = Field(None, description="Alto de la página de origen")
    words: List[WordPosition] = Field(default_factory=list, description="Fragmentos del bloque con sus coordenadas")

class PdfMetadata(BaseModel):
    base_size: float = Field(..., description="Tamaño de letra base del documento")
    total_pages: int = Field(..., description="Número total de páginas")
    has_native_toc: bool = Field(False, description="Indica si el PDF tiene un índice nativo (bookmarks)")
    filename: Optional[str] = Field(None, description="Nombre de archivo en el servidor")

class PdfProcessResponse(BaseModel):
    success: bool = Field(True)
    metadata: PdfMetadata
    toc: List[TocEntry] = Field(default_factory=list, description="Entradas del índice del documento")
    content: List[ContentBlock] = Field(default_factory=list, description="Bloques de contenido del cuerpo")

class ErrorResponse(BaseModel):
    success: bool = Field(False)
    error: str

class Annotation(BaseModel):
    id: str
    page: int
    type: str  # 'draw', 'highlight', 'note'
    data: dict

class SaveAnnotationsRequest(BaseModel):
    annotations: List[Annotation]

