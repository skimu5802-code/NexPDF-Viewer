import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { motion } from 'framer-motion';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { cn } from '../../lib/utils';
import { Annotation } from '../../types';
import { MessageSquare, Trash2 } from 'lucide-react';

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
  onAddAnnotation: (page: number, x: number, y: number, w?: number, h?: number) => void;
  onRemoveAnnotation: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, page: number, x: number, y: number, annotationId?: string) => void;
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
  onAddAnnotation,
  onRemoveAnnotation,
  onContextMenu,
  onPageVisible
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [renderedZoom, setRenderedZoom] = useState(zoom);
  const [isRendering, setIsRendering] = useState(false);
  
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
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false });
        const dpr = window.devicePixelRatio || 1;
        
        // We only resize the canvas AFTER we have the page data to minimize the white flash
        canvas.height = viewport.height * dpr;
        canvas.width = viewport.width * dpr;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.width = `${viewport.width}px`;
        
        if (context) {
          context.setTransform(1, 0, 0, 1, 0, 0);
          context.scale(dpr, dpr);
        }

        const renderTask = page.render({
          canvasContext: context!,
          viewport: viewport,
        });
        
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        
        if (!isCancelled) {
          setLoading(false);
          setIsRendering(false);
          setRenderedZoom(zoom);
        }
      } catch (error: any) {
        if (error.name === 'RenderingCancelledException') return;
        console.error('Error rendering page:', error);
        setIsRendering(false);
      }
    };

    const timer = setTimeout(renderPage, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNumber, zoom, rotation]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onPageVisible(pageNumber);
        }
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [pageNumber, onPageVisible]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'view') return;
    if (!canvasRef.current || e.button !== 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    setDragStart({ x, y });
    setDragEnd({ x, y });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    setDragEnd({ x, y });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    const rect = canvasRef.current!.getBoundingClientRect();
    const endX = (e.clientX - rect.left) / zoom;
    const endY = (e.clientY - rect.top) / zoom;

    const w = Math.abs(endX - dragStart.x);
    const h = Math.abs(endY - dragStart.y);
    const x = Math.min(dragStart.x, endX);
    const y = Math.min(dragStart.y, endY);

    if (w < 5 && h < 5) {
      if (activeTool === 'note') {
        onAddAnnotation(pageNumber, x, y);
      }
    } else if (w > 5 || h > 5) {
      if (activeTool !== 'view') {
         onAddAnnotation(pageNumber, x, y, w, h); 
      }
    }
  };

  const handleContextMenuInternal = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    onContextMenu(e, pageNumber, x, y);
  };

  // Calculate logic factor for smooth transition
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
        className="relative group shadow-2xl origin-top will-change-transform"
        animate={{ scale: visualScale }}
        transition={{ 
          type: "spring",
          stiffness: 400,
          damping: 40,
          mass: 1,
          restDelta: 0.001
        }}
      >
        <canvas 
          ref={canvasRef} 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenuInternal}
          className={cn(
            "bg-white rounded-sm",
            activeTool === 'view' ? "cursor-default" : 
            activeTool === 'note' ? "cursor-text" : "cursor-crosshair",
            isActive ? "shadow-[0_0_50px_rgba(59,130,246,0.1)]" : "shadow-none"
          )}
        />
        
        {/* Render Annotations Overlay */}
        <div className="absolute inset-0 pointer-events-none rounded-sm">
          {annotations.filter(a => a.page === pageNumber).map(ann => {
             const rect = ann.rects[0];
             const isLeftSide = rect.x < 150;
             const isRightSide = rect.x > 450;
             
             const style = {
               left: (rect.x * zoom),
               top: (rect.y * zoom),
               width: (rect.w * zoom),
               height: (rect.h * zoom),
               backgroundColor: ann.type === 'highlight' ? ann.color : 'transparent',
               borderBottom: ann.type === 'underline' ? `2px solid ${ann.color}` : 'none',
             };

             if (ann.type === 'note') {
               return (
                 <div 
                   key={ann.id}
                   className="absolute z-20 pointer-events-auto -translate-x-1/2 -translate-y-1/2 group/note cursor-help"
                   style={{ left: (rect.x * zoom), top: (rect.y * zoom) }}
                   onContextMenu={(e) => {
                      e.stopPropagation();
                      onContextMenu(e, pageNumber, rect.x, rect.y, ann.id);
                   }}
                 >
                   <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="bg-amber-400 p-1.5 rounded-full shadow-lg"
                   >
                     <MessageSquare size={14} className="text-amber-900" />
                   </motion.div>
                   <div className={cn(
                     "absolute bottom-full w-56 pb-3 opacity-0 group-hover/note:opacity-100 pointer-events-none group-hover/note:pointer-events-auto transition-all translate-y-2 group-hover/note:translate-y-0 z-50",
                     isLeftSide ? "left-0 translate-x-0" : isRightSide ? "right-0 translate-x-0" : "left-1/2 -translate-x-1/2"
                   )}>
                     <div className={cn(
                        "p-4 rounded-xl shadow-2xl text-xs border transition-colors",
                        isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                      )}>
                       <div className={cn("flex justify-between items-center mb-2 border-b pb-2", isDarkMode ? "border-slate-800" : "border-slate-100")}>
                          <span className="font-bold text-blue-400 uppercase tracking-widest text-[9px]">Contextual Note</span>
                          <button 
                            onClick={() => onRemoveAnnotation(ann.id)}
                            className={cn(
                               "transition-colors p-1 rounded",
                               isDarkMode ? "text-slate-500 hover:text-red-400 hover:bg-red-400/10" : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                             )}
                          >
                            <Trash2 size={10} />
                          </button>
                       </div>
                       <p className="text-slate-300 leading-relaxed font-medium">{ann.content}</p>
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
                   ann.type === 'highlight' ? "mix-blend-multiply" : "mix-blend-normal"
                 )}
                 onContextMenu={(e) => {
                    e.stopPropagation();
                    onContextMenu(e, pageNumber, rect.x, rect.y, ann.id);
                 }}
                 style={{
                   ...style,
                   backgroundColor: ann.type === 'highlight' ? 'rgba(255, 255, 0, 0.7)' : style.backgroundColor, 
                 }}
                >
                  <button 
                    onClick={() => onRemoveAnnotation(ann.id)}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-1 rounded shadow-lg opacity-0 group-hover/ann:opacity-100 transition-opacity whitespace-nowrap flex items-center gap-1 z-30 pointer-events-auto"
                  >
                    <Trash2 size={10} className="text-red-400" />
                    <span className="text-[8px] uppercase tracking-tighter">Delete</span>
                  </button>
                </motion.div>
             );
          })}

          {/* Dragging Preview */}
          {isDragging && activeTool !== 'view' && (
            <div 
              className={cn(
                "absolute",
                activeTool === 'highlight' ? "bg-yellow-400/60 mix-blend-multiply rounded-[2px]" : 
                activeTool === 'underline' ? "border-b-2 border-x-0 border-t-0 border-blue-400" : 
                "bg-blue-500/10 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              )}
              style={{
                left: Math.min(dragStart.x, dragEnd.x) * zoom,
                top: Math.min(dragStart.y, dragEnd.y) * zoom,
                width: Math.abs(dragEnd.x - dragStart.x) * zoom,
                height: Math.abs(dragEnd.y - dragStart.y) * zoom,
              }}
            />
          )}
        </div>

        <div className="absolute -top-8 left-0 right-0 flex justify-between items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Page {pageNumber}</span>
          <span className={cn(
            "text-[9px] font-mono px-2 py-0.5 rounded border transition-colors",
            isDarkMode ? "text-slate-600 bg-slate-900/50 border-slate-800" : "text-slate-500 bg-white/80 border-slate-200 shadow-sm"
          )}>
            {activeTool === 'view' ? 'Selection' : activeTool}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};
