import React, { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { motion } from "framer-motion";
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { cn } from "../../lib/utils";
import { Annotation, AnnotationType } from "../../types";
import { MessageSquare, Trash2 } from "lucide-react";

// Set up the worker accurately for Vite environment
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PageRendererProps {
  pageNumber: number;
  pdfDoc: any;
  zoom: number;
  rotation: number;
  isActive: boolean;
  isDarkMode: boolean;
  annotations: Annotation[];
  activeTool: string;
  highlightColor: string;
  drawLineWidth: number;
  onAddAnnotation: (
    page: number,
    x: number,
    y: number,
    w?: number,
    h?: number,
    type?: AnnotationType,
    path?: { x: number; y: number }[],
    lineWidth?: number,
  ) => void;
  onRemoveAnnotation: (id: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    page: number,
    x: number,
    y: number,
    annotationId?: string,
  ) => void;
  onPageVisible: (page: number) => void;
}

export const PageRenderer: React.FC<PageRendererProps> = ({
  pageNumber,
  pdfDoc,
  zoom,
  rotation,
  isActive,
  isDarkMode,
  annotations,
  activeTool,
  highlightColor,
  drawLineWidth,
  onAddAnnotation,
  onRemoveAnnotation,
  onContextMenu,
  onPageVisible,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [renderedZoom, setRenderedZoom] = useState(zoom);
  const [isRendering, setIsRendering] = useState(false);

  // 1. PDF Rendering with Off-screen Buffer (Zero Flash)
  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      if (renderTaskRef.current) renderTaskRef.current.cancel();

      setIsRendering(true);
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: zoom, rotation });
        const dpr = window.devicePixelRatio || 1;

        // Create an invisible Off-screen canvas
        const offScreenCanvas = document.createElement("canvas");
        const offScreenContext = offScreenCanvas.getContext("2d", { alpha: false });

        offScreenCanvas.width = viewport.width * dpr;
        offScreenCanvas.height = viewport.height * dpr;

        if (offScreenContext) {
          offScreenContext.setTransform(1, 0, 0, 1, 0, 0);
          offScreenContext.scale(dpr, dpr);
          // Fill background with white
          offScreenContext.fillStyle = "#FFFFFF";
          offScreenContext.fillRect(0, 0, viewport.width, viewport.height);
        }

        // Render the PDF onto the off-screen canvas
        const renderTask = page.render({
          canvasContext: offScreenContext!,
          viewport: viewport,
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!isCancelled) {
          // Render is complete! Now safely update the main visible canvas
          const mainCanvas = canvasRef.current;
          if (mainCanvas) {
            const mainContext = mainCanvas.getContext("2d", { alpha: false });
            
            // Resize main canvas
            mainCanvas.width = viewport.width * dpr;
            mainCanvas.height = viewport.height * dpr;
            mainCanvas.style.height = `${viewport.height}px`;
            mainCanvas.style.width = `${viewport.width}px`;

            // Draw the ready image from off-screen to main canvas
            if (mainContext) {
              mainContext.drawImage(offScreenCanvas, 0, 0);
            }
          }

          setLoading(false);
          setIsRendering(false);
          setRenderedZoom(zoom); // Update renderedZoom only AFTER the canvas has the new image
        }
      } catch (error: any) {
        if (error.name === "RenderingCancelledException") return;
        console.error("Error rendering page:", error);
        setIsRendering(false);
      }
    };

    // Fast render trigger since we are buffering off-screen
    const timer = setTimeout(renderPage, 10);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNumber, zoom, rotation]);

  // 2. Intersection Observer for Page Visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onPageVisible(pageNumber);
        }
      },
      { threshold: 0.5 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [pageNumber, onPageVisible]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  // 3. Mouse Handlers (Using renderedZoom for accurate coordinates)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === "view" || activeTool === "hand") return;
    if (!canvasRef.current || e.button !== 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / renderedZoom; 
    const y = (e.clientY - rect.top) / renderedZoom;

    setDragStart({ x, y });
    setDragEnd({ x, y });
    setIsDragging(true);

    if (activeTool === "draw") {
      setCurrentPath([{ x, y }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / renderedZoom; 
    const y = (e.clientY - rect.top) / renderedZoom;

    setDragEnd({ x, y });

    if (activeTool === "draw") {
      setCurrentPath((prev) => [...prev, { x, y }]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const rect = canvasRef.current!.getBoundingClientRect();
    const endX = (e.clientX - rect.left) / renderedZoom; 
    const endY = (e.clientY - rect.top) / renderedZoom;

    const w = Math.abs(endX - dragStart.x);
    const h = Math.abs(endY - dragStart.y);
    const x = Math.min(dragStart.x, endX);
    const y = Math.min(dragStart.y, endY);

    if (activeTool === "draw") {
      if (currentPath.length > 2) {
        const minX = Math.min(...currentPath.map((p) => p.x));
        const maxX = Math.max(...currentPath.map((p) => p.x));
        const minY = Math.min(...currentPath.map((p) => p.y));
        const maxY = Math.max(...currentPath.map((p) => p.y));

        onAddAnnotation(
          pageNumber,
          minX,
          minY,
          maxX - minX,
          maxY - minY,
          "draw",
          currentPath,
          drawLineWidth,
        );
      }
      setCurrentPath([]);
      return;
    }

    if (w < 5 && h < 5) {
      if (activeTool === "note") {
        onAddAnnotation(pageNumber, x, y, undefined, undefined, "note");
      }
    } else if (w > 5 || h > 5) {
      if (activeTool !== "view" && activeTool !== "hand") {
        onAddAnnotation(pageNumber, x, y, w, h, activeTool as AnnotationType);
      }
    }
  };

  const handleContextMenuInternal = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / renderedZoom; 
    const y = (e.clientY - rect.top) / renderedZoom;
    onContextMenu(e, pageNumber, x, y);
  };

  // 4. Calculate visual scale for the CSS transform transition
  const visualScale = zoom / renderedZoom;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center mb-16 px-4"
    >
      <motion.div
        className="relative group shadow-2xl origin-top will-change-transform overflow-visible"
        style={{
          transform: `scale(${visualScale})`,
          transformOrigin: "top center", // Ensures zooming happens from the top evenly
          transition: "transform 0.3s ease-out", // Smooth scaling before the high-res canvas drops in
          overflow: "visible",
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenuInternal}
          className={cn(
            "bg-white rounded-sm block",
            activeTool === "view"
              ? "cursor-default"
              : activeTool === "hand"
                ? "cursor-grab"
                : activeTool === "note"
                  ? "cursor-text"
                  : "cursor-crosshair",
            isActive ? "shadow-[0_0_50px_rgba(59,130,246,0.1)]" : "shadow-none",
          )}
        />

        {/* Render Annotations Overlay */}
        <div className="absolute inset-0 pointer-events-none rounded-sm">
          {annotations
            .filter((a) => a.page === pageNumber)
            .map((ann) => {
              const rect = ann.rects[0];
              const isLeftSide = rect.x < 150;
              const isRightSide = rect.x > 450;

              // Ensure we use renderedZoom for stable positions
              const style = {
                left: rect.x * renderedZoom,
                top: rect.y * renderedZoom,
                width: rect.w * renderedZoom,
                height: rect.h * renderedZoom,
                backgroundColor:
                  ann.type === "highlight" ? ann.color : "transparent",
                borderBottom:
                  ann.type === "underline" ? `2px solid ${ann.color}` : "none",
                border:
                  ann.type === "box" || ann.type === "circle"
                    ? `2px solid ${ann.color}`
                    : "none",
                borderRadius: ann.type === "circle" ? "100%" : "none",
              };

              if (ann.type === "draw" && ann.path) {
                return (
                  <div
                    key={ann.id}
                    className="absolute z-20 pointer-events-auto group/ann"
                    onContextMenu={(e) => {
                      e.stopPropagation();
                      onContextMenu(e, pageNumber, rect.x, rect.y, ann.id);
                    }}
                  >
                    <svg
                      className="absolute overflow-visible pointer-events-none"
                      style={{ left: 0, top: 0 }}
                    >
                      <polyline
                        points={ann.path
                          .map(
                            (p) => `${p.x * renderedZoom},${p.y * renderedZoom}`,
                          )
                          .join(" ")}
                        fill="none"
                        stroke={ann.color}
                        strokeWidth={ann.lineWidth || 2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <button
                      onClick={() => onRemoveAnnotation(ann.id)}
                      className="absolute bg-slate-900 text-white p-1 rounded shadow-lg opacity-0 group-hover/ann:opacity-100 transition-all whitespace-nowrap flex items-center gap-1 z-30 pointer-events-auto -translate-y-full"
                      style={{
                        left: rect.x * renderedZoom,
                        top: rect.y * renderedZoom,
                      }}
                    >
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
                );
              }

              if (ann.type === "note") {
                return (
                  <div
                    key={ann.id}
                    className="absolute z-20 pointer-events-auto -translate-x-1/2 -translate-y-1/2 group/note cursor-help"
                    style={{
                      left: rect.x * renderedZoom,
                      top: rect.y * renderedZoom,
                    }}
                    onContextMenu={(e) => {
                      e.stopPropagation();
                      onContextMenu(e, pageNumber, rect.x, rect.y, ann.id);
                    }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="bg-amber-400 p-2 rounded-full shadow-lg"
                    >
                      <MessageSquare size={14} className="text-amber-900" />
                    </motion.div>
                    <div
                      className={cn(
                        "absolute bottom-full w-56 pb-3 opacity-0 group-hover/note:opacity-100 pointer-events-none group-hover/note:pointer-events-auto transition-all translate-y-2 group-hover/note:translate-y-0 z-50",
                        isLeftSide
                          ? "left-0 translate-x-0"
                          : isRightSide
                            ? "right-0 translate-x-0"
                            : "left-1/2 -translate-x-1/2",
                      )}
                    >
                      <div
                        className={cn(
                          "p-4 rounded-xl shadow-2xl text-sm border transition-colors",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700"
                            : "bg-white border-slate-200",
                        )}
                      >
                        <div
                          className={cn(
                            "flex justify-between items-center mb-2 border-b pb-2",
                            isDarkMode
                              ? "border-slate-800"
                              : "border-slate-100",
                          )}
                        >
                          <span className="font-bold text-blue-400 uppercase tracking-widest text-[9px]">
                            Contextual Note
                          </span>
                          <button
                            onClick={() => onRemoveAnnotation(ann.id)}
                            className={cn(
                              "transition-colors p-1 rounded",
                              isDarkMode
                                ? "text-slate-500 hover:text-red-400 hover:bg-red-400/10"
                                : "text-slate-400 hover:text-red-600 hover:bg-red-50",
                            )}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <p className="text-slate-300 leading-relaxed font-medium">
                          {ann.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "absolute rounded-[2px] group/ann pointer-events-auto",
                    ann.type === "highlight"
                      ? "mix-blend-multiply"
                      : "mix-blend-normal",
                  )}
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    onContextMenu(e, pageNumber, rect.x, rect.y, ann.id);
                  }}
                  style={{
                    ...style,
                    backgroundColor:
                      ann.type === "highlight"
                        ? ann.color
                        : style.backgroundColor,
                  }}
                >
                  <button
                    onClick={() => onRemoveAnnotation(ann.id)}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-1 rounded shadow-lg opacity-0 group-hover/ann:opacity-100 transition-opacity whitespace-nowrap flex items-center gap-1 z-30 pointer-events-auto"
                  >
                    <Trash2 size={12} className="text-red-400" />
                    <span className="text-[8px] uppercase tracking-tighter">
                      Delete
                    </span>
                  </button>
                </motion.div>
              );
            })}

          {/* Dragging Preview */}
          {isDragging && activeTool !== "view" && activeTool !== "hand" && (
            <>
              {activeTool === "draw" ? (
                <svg className="absolute inset-0 overflow-visible pointer-events-none">
                  <polyline
                    points={currentPath
                      .map((p) => `${p.x * renderedZoom},${p.y * renderedZoom}`)
                      .join(" ")}
                    fill="none"
                    stroke={highlightColor}
                    strokeWidth={drawLineWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <div
                  className={cn(
                    "absolute transition-all",
                    activeTool === "highlight"
                      ? "mix-blend-multiply rounded-[2px]"
                      : activeTool === "underline"
                        ? "border-b-2 border-x-0 border-t-0 border-blue-400"
                        : activeTool === "circle"
                          ? "border-2 border-blue-500 rounded-full"
                          : activeTool === "box"
                            ? "border-2 border-blue-500 rounded-sm"
                            : "bg-blue-500/10 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]",
                  )}
                  style={{
                    left: Math.min(dragStart.x, dragEnd.x) * renderedZoom,
                    top: Math.min(dragStart.y, dragEnd.y) * renderedZoom,
                    width: Math.abs(dragEnd.x - dragStart.x) * renderedZoom,
                    height: Math.abs(dragEnd.y - dragStart.y) * renderedZoom,
                    backgroundColor:
                      activeTool === "highlight"
                        ? `${highlightColor}99`
                        : undefined,
                    borderColor:
                      activeTool === "circle" || activeTool === "box"
                        ? highlightColor
                        : undefined,
                  }}
                />
              )}
            </>
          )}
        </div>

        <div className="absolute -top-8 left-0 right-0 flex justify-between items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Page {pageNumber}
          </span>
          <span
            className={cn(
              "text-[9px] font-mono px-2 py-0.5 rounded border transition-colors",
              isDarkMode
                ? "text-slate-600 bg-slate-900/50 border-slate-800"
                : "text-slate-500 bg-white/80 border-slate-200 shadow-sm",
            )}
          >
            {activeTool === "view" ? "Selection" : activeTool}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};