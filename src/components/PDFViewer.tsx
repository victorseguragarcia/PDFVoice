import React from "react";
import { API_BASE, ContentBlock, AnnotationTool, Annotation } from "@/types";
import { BionicText } from "@/components/BionicText";
import { AnnotationOverlay } from "@/components/AnnotationOverlay";

interface PDFViewerProps {
  readerMode: boolean;
  wideMode: boolean;
  blocks: ContentBlock[];
  currentBlockIndex: number;
  goToBlock: (index: number) => void;
  bionicReading: boolean;
  pageNumbers: number[];
  serverFilename: string | null;
  currentTool: AnnotationTool;
  selectedWordIds: Set<string>;
  handleWordPointerDown: (flatIndex: number, wordId: string, e: React.PointerEvent) => void;
  handleWordPointerEnter: (flatIndex: number, wordId: string, allWordsOnPage: any[]) => void;
  annotationColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  annotations: Annotation[];
  handleAddAnnotation: (ann: Annotation) => void;
  handleUpdateAnnotation: (id: string, text: string) => void;
  handleDeleteAnnotation: (id: string) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  readerMode,
  wideMode,
  blocks,
  currentBlockIndex,
  goToBlock,
  bionicReading,
  pageNumbers,
  serverFilename,
  currentTool,
  selectedWordIds,
  handleWordPointerDown,
  handleWordPointerEnter,
  annotationColor,
  strokeWidth,
  strokeOpacity,
  annotations,
  handleAddAnnotation,
  handleUpdateAnnotation,
  handleDeleteAnnotation,
}) => {
  return (
    <div className={`flex-1 overflow-y-auto px-4 md:px-8 pb-32 animate-fade-in transition-all duration-500 ease-in-out scroll-smooth ${wideMode ? "max-w-full" : "max-w-4xl"} mx-auto w-full`}>
      {readerMode ? (
        <div className="space-y-6 pt-12 pb-24 text-lg leading-relaxed text-foreground/90 font-serif">
          {blocks.map((block, globalIndex) => {
            const isCurrent = currentBlockIndex === globalIndex;
            const isHeading = ["h1", "h2", "h3"].includes(block.type);
            
            return (
              <p
                key={globalIndex}
                id={`block-${globalIndex}`}
                onClick={() => goToBlock(globalIndex)}
                className={`cursor-pointer p-4 rounded-2xl transition-all duration-300 ${
                  isCurrent ? "bg-primary/20 ring-1 ring-primary shadow-lg scale-[1.01]" : "hover:bg-white/[0.04]"
                } ${isHeading ? "font-bold text-2xl text-white mt-8 mb-4 font-sans" : ""}`}
              >
                {bionicReading ? <BionicText text={block.content} /> : block.content}
              </p>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6 pt-8 relative">
        {pageNumbers.map((pageInfo) => {
        const pageBlocks = blocks.filter((b) => b.page === pageInfo);
        const isCurrentPage = pageBlocks.some((b) => blocks.indexOf(b) === currentBlockIndex);
        const firstBlock = pageBlocks[0];
        const pageWidth = firstBlock?.page_width || 800;
        const pageHeight = firstBlock?.page_height || 1100;

        return (
          <div key={`page-${pageInfo}`} className={`relative rounded-3xl overflow-hidden transition-all duration-500 ${isCurrentPage ? "ring-1 ring-white/10 shadow-2xl" : ""}`}>

            {/* PDF image as main view */}
            <div className="relative w-full bg-white" style={{ aspectRatio: `${pageWidth}/${pageHeight}` }}>
              {serverFilename && (
                <img
                  src={`${API_BASE}/page-image/${serverFilename}/${pageInfo}`}
                  alt={`Página ${pageInfo}`}
                  className="absolute inset-0 w-full h-full object-contain"
                  draggable={false}
                />
              )}

            {/* Invisible clickable areas positioned via bbox */}
            <div className="absolute inset-0 z-10">
              {currentTool === "text_highlight"
                ? (() => {
                    const allWordsOnPage = pageBlocks.flatMap((block) => {
                      const globalIndex = blocks.indexOf(block);
                      const words = block.words || [];
                      return words.map((word, wIdx) => ({
                        id: `${globalIndex}-${wIdx}`,
                        bbox: word.bbox || [0, 0, 0, 0],
                        text: word.text || "",
                        page_width: block.page_width || 800,
                        page_height: block.page_height || 1100,
                      }));
                    });

                    return allWordsOnPage.map((word, flatIndex) => {
                      const [x0, y0, x1, y1] = word.bbox;
                      const left = (x0 / word.page_width) * 100;
                      const top = (y0 / word.page_height) * 100;
                      const width = ((x1 - x0) / word.page_width) * 100;
                      const height = ((y1 - y0) / word.page_height) * 100;
                      const isSelected = selectedWordIds.has(word.id);
                      return (
                        <div
                          key={word.id}
                          data-word-id={word.id}
                          onPointerDown={(e) => handleWordPointerDown(flatIndex, word.id, e)}
                          onPointerEnter={() => handleWordPointerEnter(flatIndex, word.id, allWordsOnPage)}
                          className={`absolute cursor-pointer transition-colors duration-150 ${isSelected ? "bg-yellow-400/30" : "hover:bg-white/[0.06]"}`}
                          style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                          title={word.text}
                        />
                      );
                    });
                  })()
                : pageBlocks.map((block) => {
                    const globalIndex = blocks.indexOf(block);
                    const isCurrent = currentBlockIndex === globalIndex;

                    if (block.bbox && block.page_width && block.page_height) {
                      const left = (block.bbox[0] / block.page_width) * 100;
                      const top = (block.bbox[1] / block.page_height) * 100;
                      const width = ((block.bbox[2] - block.bbox[0]) / block.page_width) * 100;
                      const height = ((block.bbox[3] - block.bbox[1]) / block.page_height) * 100;

                      return (
                        <div
                          key={globalIndex}
                          id={`block-${globalIndex}`}
                          onClick={() => goToBlock(globalIndex)}
                          className={`absolute cursor-pointer transition-colors duration-200 ${isCurrent ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-white/[0.06]"}`}
                          style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                          title={block.content}
                        />
                      );
                    }

                    return (
                      <div
                        key={globalIndex}
                        id={`block-${globalIndex}`}
                        onClick={() => goToBlock(globalIndex)}
                        className={`cursor-pointer p-2 rounded transition-colors ${isCurrent ? "bg-primary/10" : "hover:bg-white/[0.06]"}`}
                      >
                        <p className="text-xs text-transparent">{block.content}</p>
                      </div>
                    );
                  })
              }
            </div>

              <AnnotationOverlay
                pageNum={pageInfo}
                currentTool={currentTool}
                annotationColor={annotationColor}
                strokeWidth={strokeWidth}
                strokeOpacity={strokeOpacity}
                annotations={annotations}
                onAddAnnotation={handleAddAnnotation}
                onUpdateAnnotation={handleUpdateAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
              />
            </div>

            <div className="absolute -left-3 top-8 flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold ring-4 ring-[#09090b] z-20">
              {pageInfo}
            </div>
          </div>
        );
      })}
      </div>
      )}
    </div>
  );
};
