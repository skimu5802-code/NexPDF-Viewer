import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { motion } from 'framer-motion';

// Set up the worker accurately for Vite environment
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { PageRenderer } from './PageRenderer';
import { SearchOverlay } from './SearchOverlay';
import { PDFState, INITIAL_STATE, Annotation, AnnotationType, PDFViewerProps } from '../../types';
import { cn } from '../../lib/utils';
import { FileUp, Loader2, Users, Highlighter, Type, Trash2, StickyNote, X } from 'lucide-react';

export default function PDFViewer({
  fileUrl,
  initialPage = 1,
  initialZoom = 1.0,
  allowUpload = true,
  showToolbar = true,
  showSidebar = true,
  searchEnabled = true,
  theme,
  externalAnnotations,
  onAnnotationChange,
  onPageChange,
  onLoadSuccess,
  className
}: PDFViewerProps) {
  const [state, setState] = useState<PDFState>(() => {
    return {
      ...INITIAL_STATE,
      currentPage: initialPage,
      zoom: initialZoom,
      isSidebarOpen: showSidebar
    };
  });
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [annotations, setAnnotations] = useState<Record<string, Annotation[]>>({});
  
  const [loading, setLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{ results: number; current: number }>({ results: 0, current: 0 });
  const [noteDialog, setNoteDialog] = useState<{ isOpen: boolean; page: number; x: number; y: number; text: string; annotationId?: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; page: number; canvasX: number; canvasY: number; annotationId?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculateZoom = useCallback(async (mode: 'fit-page' | 'fit-width') => {
    if (!pdfDoc || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(state.currentPage || 1);
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = containerRef.current.clientWidth - 96; // 48px padding on each side
      const containerHeight = containerRef.current.clientHeight - 80; // 40px padding top/bottom

      let newZoom = 1.0;
      if (mode === 'fit-width') {
        newZoom = containerWidth / viewport.width;
      } else if (mode === 'fit-page') {
        const zoomW = containerWidth / viewport.width;
        const zoomH = containerHeight / viewport.height;
        newZoom = Math.min(zoomW, zoomH);
      }
      
      setState(prev => ({ ...prev, zoom: newZoom, zoomMode: mode }));
    } catch (err) {
      console.error("Error calculating zoom:", err);
    }
  }, [pdfDoc, state.currentPage]);

  useEffect(() => {
    if (state.zoomMode !== 'custom') {
      calculateZoom(state.zoomMode);
    }
  }, [state.zoomMode, state.currentPage, calculateZoom]);

  useEffect(() => {
    if (!containerRef.current || state.zoomMode === 'custom') return;

    const observer = new ResizeObserver(() => {
      calculateZoom(state.zoomMode as any);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [state.zoomMode, calculateZoom]);

  // Load PDF from fileUrl if provided
  useEffect(() => {
    if (fileUrl) {
      fetch(fileUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], fileUrl.split('/').pop() || 'document.pdf', { type: 'application/pdf' });
          loadPDF(file);
        })
        .catch(err => console.error("Error fetching fileUrl:", err));
    }
  }, [fileUrl]);

  const loadPDF = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      loadingTask.onPassword = (updatePassword: (p: string) => void) => {
        const password = prompt('This document is password protected. Please enter the password:');
        if (password) {
          updatePassword(password);
        } else {
          setLoading(false);
          throw new Error('Password required');
        }
      };
      const doc = await loadingTask.promise;
      
      setPdfDoc(doc);
      setState(prev => ({
        ...prev,
        numPages: doc.numPages,
        currentPage: 1,
        fileName: file.name
      }));
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      if (error.name === 'PasswordException') {
        // Already handled by prompt/onPassword callback mostly, but good to catch
      } else {
        alert('Failed to load PDF. Please try another file.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      loadPDF(file);
    }
  };

  const [history, setHistory] = useState<{ id: string; timestamp: number; name: string }[]>([]);

  const handleAddAnnotation = (page: number, x: number, y: number, type: AnnotationType = 'note', w?: number, h?: number) => {
    if (!state.fileName) return;

    let content = '';
    let color = '#facc15'; // default for note
    
    if (type === 'note') {
      setNoteDialog({ isOpen: true, page, x, y, text: '' });
      return;
    } else if (type === 'highlight') {
      color = '#facc15'; // light yellow highlight
    } else if (type === 'underline') {
      color = '#3b82f6'; // blue underline
    }

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      page,
      type,
      color,
      rects: [{ 
        x, 
        y, 
        w: w || 100, 
        h: h || 15 
      }],
      content,
      author: 'User',
      createdAt: Date.now()
    };

    const currentFileAnnotations = annotations[state.fileName] || [];
    const updatedFileAnnotations = [...currentFileAnnotations, newAnnotation];
    
    const updatedAllAnnotations = {
      ...annotations,
      [state.fileName]: updatedFileAnnotations
    };

    setAnnotations(updatedAllAnnotations);
    onAnnotationChange?.(updatedFileAnnotations);
    
    // Simple History
    setHistory(prev => [{ 
      id: crypto.randomUUID(), 
      timestamp: Date.now(), 
      name: `Added ${type} on page ${page}` 
    }, ...prev.slice(0, 9)]);
  };

  const handleRemoveAnnotation = (id: string) => {
    if (!state.fileName) return;

    const currentFileAnnotations = annotations[state.fileName] || [];
    const updatedFileAnnotations = currentFileAnnotations.filter(ann => ann.id !== id);
    
    const updatedAllAnnotations = {
      ...annotations,
      [state.fileName]: updatedFileAnnotations
    };

    setAnnotations(updatedAllAnnotations);
    onAnnotationChange?.(updatedFileAnnotations);
    
    // History
    setHistory(prev => [{ 
      id: crypto.randomUUID(), 
      timestamp: Date.now(), 
      name: `Removed annotation` 
    }, ...prev.slice(0, 9)]);
  };

  const handleExport = (format: 'pdf' | 'docx') => {
    alert(`Exporting as ${format.toUpperCase()}... In a real app, this would process the PDF and annotations server-side.`);
  };

  const scrollToPage = (pageNum: number) => {
    const pageEl = document.getElementById(`page-${pageNum}`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleStateChange = (update: Partial<PDFState>) => {
    setState(prev => {
      const newState = { ...prev, ...update };
      return newState;
    });
  };

  const handlePageNavigation = (pageNum: number) => {
    scrollToPage(pageNum);
    handleStateChange({ currentPage: pageNum });
    onPageChange?.(pageNum);
  };

  const finishAddNote = (text: string) => {
    if (!noteDialog) return;
    
    const { page, x, y } = noteDialog;
    const type: AnnotationType = 'note';
    const color = '#facc15';
    const content = text || 'New Note';

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      page,
      type,
      color,
      rects: [{ x, y, w: 20, h: 20 }],
      content,
      author: 'User',
      createdAt: Date.now()
    };

    const currentFileAnnotations = annotations[state.fileName!] || [];
    const updatedFileAnnotations = [...currentFileAnnotations, newAnnotation];
    
    const updatedAllAnnotations = {
      ...annotations,
      [state.fileName!]: updatedFileAnnotations
    };

    setAnnotations(updatedAllAnnotations);
    onAnnotationChange?.(updatedFileAnnotations);
    setNoteDialog(null);
  };

  const handleContextMenu = (e: React.MouseEvent, page: number, canvasX: number, canvasY: number, annotationId?: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      page,
      canvasX,
      canvasY,
      annotationId
    });
  };

  const handleSearch = async (query: string) => {
    if (!pdfDoc || query.length < 3) {
      setSearchResults({ results: 0, current: 0 });
      return;
    }

    setLoading(true);
    try {
      let matches = 0;
      const foundOnPages: number[] = [];

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(' ');
        
        if (text.toLowerCase().includes(query.toLowerCase())) {
          matches++;
          foundOnPages.push(i);
        }
      }

      setSearchResults({ results: matches, current: matches > 0 ? 1 : 0 });
      if (foundOnPages.length > 0) {
        handlePageNavigation(foundOnPages[0]);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Basic browser print - for full PDF printing, specialized library or hidden iframe is needed
    // but window.print() is the standard first step.
    window.print();
  };

  const handleDownload = async () => {
    if (!pdfDoc) return;
    try {
      const data = await pdfDoc.getData();
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = state.fileName || 'document.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  const handleShowInfo = async () => {
    if (!pdfDoc) return;
    try {
      const { info } = await pdfDoc.getMetadata();
      const details = [
        `Title: ${info.Title || 'N/A'}`,
        `Author: ${info.Author || 'N/A'}`,
        `Subject: ${info.Subject || 'N/A'}`,
        `Creator: ${info.Creator || 'N/A'}`,
        `Producer: ${info.Producer || 'N/A'}`,
        `Creation Date: ${info.CreationDate || 'N/A'}`,
        `Modification Date: ${info.ModDate || 'N/A'}`,
      ].join('\n');
      alert(`Document Properties:\n\n${details}`);
    } catch (err) {
      console.error("Metadata error:", err);
    }
  };

  const handleToggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const currentAnnotations = state.fileName ? (annotations[state.fileName] || []) : [];

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const handlePanDown = (e: React.MouseEvent) => {
    if (state.activeTool !== 'hand' || !containerRef.current) return;
    setIsPanning(true);
    setPanStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop
    });
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning || !containerRef.current) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    containerRef.current.scrollLeft = panStart.scrollLeft - dx;
    containerRef.current.scrollTop = panStart.scrollTop - dy;
  };

  const handlePanUp = () => {
    setIsPanning(false);
  };

  return (
    <div className={cn(
      "flex flex-col h-screen overflow-hidden font-sans pt-2 transition-colors duration-300",
      state.isDarkMode ? "bg-[#0F172A] text-slate-200" : "bg-slate-50 text-slate-900",
      className
    )}>
      {noteDialog?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "border w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden p-8 transition-colors duration-300",
              state.isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
            )}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400">Add Note</h3>
              <button 
                onClick={() => setNoteDialog(null)}
                className={cn(
                  "transition-colors",
                  state.isDarkMode ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-900"
                )}
              >
                Cancel
              </button>
            </div>
            <textarea 
              autoFocus
              placeholder="Start typing your thoughts..."
              className={cn(
                "w-full border rounded-2xl p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[150px] mb-6 resize-none",
                state.isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-900"
              )}
              defaultValue={noteDialog.text}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  finishAddNote((e.target as HTMLTextAreaElement).value);
                }
              }}
              id="note-textarea"
            />
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              <span>CTRL + ENTER to Save</span>
              <button 
                onClick={() => {
                  const val = (document.getElementById('note-textarea') as HTMLTextAreaElement).value;
                  finishAddNote(val);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 translate-y-0 hover:-translate-y-0.5"
              >
                Save Note
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {contextMenu && (
        <div 
          className="fixed inset-0 z-[110]"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className={cn(
              "fixed backdrop-blur-xl border rounded-[1.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden py-2 w-60 z-[111] transition-colors duration-300",
              state.isDarkMode ? "bg-slate-900/90 border-slate-700/50 text-slate-300" : "bg-white/90 border-slate-200 text-slate-700"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={cn("px-4 py-2 border-b mb-1", state.isDarkMode ? "border-slate-800/50" : "border-slate-100")}>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                {contextMenu.annotationId ? 'Annotation Options' : `Page ${contextMenu.page} Quick Actions`}
              </p>
            </div>
            
            {contextMenu.annotationId ? (
              <button 
                onClick={() => {
                   handleRemoveAnnotation(contextMenu.annotationId!);
                   setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-400 hover:bg-red-400/10 transition-all group"
              >
                <div className="bg-red-400/10 p-1.5 rounded-lg group-hover:bg-red-400/20 transition-colors">
                  <Trash2 size={14} />
                </div>
                <span className="font-medium">Delete Annotation</span>
              </button>
            ) : (
              <div className="space-y-0.5">
                <button 
                  onClick={() => {
                     handleAddAnnotation(contextMenu.page, contextMenu.canvasX, contextMenu.canvasY, 'note');
                     setContextMenu(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-all group",
                    state.isDarkMode ? "text-slate-300 hover:bg-white/5 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="bg-amber-400/10 p-1.5 rounded-lg group-hover:bg-amber-400/20 transition-colors">
                    <StickyNote size={14} className="text-amber-400" />
                  </div>
                  <span className="font-medium">Note</span>
                </button>

                <button 
                  onClick={() => {
                     handleAddAnnotation(contextMenu.page, contextMenu.canvasX, contextMenu.canvasY, 'highlight');
                     setContextMenu(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-all group",
                    state.isDarkMode ? "text-slate-300 hover:bg-white/5 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="bg-yellow-400/10 p-1.5 rounded-lg group-hover:bg-yellow-400/20 transition-colors">
                    <Highlighter size={14} className="text-yellow-400" />
                  </div>
                  <span className="font-medium">Highlight Here</span>
                </button>

                <button 
                  onClick={() => {
                     handleAddAnnotation(contextMenu.page, contextMenu.canvasX, contextMenu.canvasY, 'underline');
                     setContextMenu(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-all group",
                    state.isDarkMode ? "text-slate-300 hover:bg-white/5 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="bg-blue-400/10 p-1.5 rounded-lg group-hover:bg-blue-400/20 transition-colors">
                    <Type size={14} className="text-blue-400" />
                  </div>
                  <span className="font-medium">Underline Text</span>
                </button>
              </div>
            )}

            <div className={cn("h-px my-1 mx-2", state.isDarkMode ? "bg-slate-800/50" : "bg-slate-100")} />

            <button 
              onClick={() => setContextMenu(null)}
              className="w-full flex items-center gap-3 px-4 py-2 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              <div className="p-1.5">
                <X size={12} />
              </div>
              <span className="font-bold uppercase tracking-widest">Close</span>
            </button>
          </motion.div>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".pdf" 
        className="hidden" 
      />

      {showToolbar && (
        <Toolbar 
          state={state} 
          onStateChange={handleStateChange}
          onPageNavigation={handlePageNavigation}
          onUpload={() => fileInputRef.current?.click()}
          onSearchToggle={() => setIsSearchOpen(!isSearchOpen)}
          onToggleFullScreen={handleToggleFullScreen}
          onPrint={handlePrint}
          onDownload={handleDownload}
          onShowInfo={handleShowInfo}
          allowUpload={allowUpload}
          searchEnabled={searchEnabled}
        />
      )}

      <SearchOverlay 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={handleSearch}
        results={searchResults.results}
        currentResult={searchResults.current}
        onNext={() => {}}
        onPrev={() => {}}
        isDarkMode={state.isDarkMode}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {showSidebar && (
          <Sidebar 
            isOpen={state.isSidebarOpen}
            pdfDoc={pdfDoc}
            state={state}
            annotations={currentAnnotations}
            history={history}
            onPageSelect={handlePageNavigation}
            onCloudSync={(service) => alert(`Connecting to ${service}...`)}
          />
        )}

        <main 
          ref={containerRef}
          onMouseDown={handlePanDown}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanUp}
          onMouseLeave={handlePanUp}
          className={cn(
            "flex-1 overflow-y-auto px-12 py-10 transition-all duration-300 custom-scrollbar",
            state.isDarkMode ? "bg-slate-950/50" : "bg-slate-200/50",
            state.isSidebarOpen ? "ml-56" : "ml-0",
            state.activeTool === 'hand' ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
          )}
        >
          {pdfDoc && (
            <div className="max-w-4xl mx-auto mb-10">
              {/* Header removed for cleaner view as requested */}
            </div>
          )}

          {!pdfDoc && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={cn(
                  "backdrop-blur-xl p-10 rounded-[2.5rem] border w-full shadow-2xl transition-colors duration-300",
                  state.isDarkMode ? "bg-slate-900/50 border-slate-800/50" : "bg-white/80 border-slate-200"
                )}
              >
                <div className="w-20 h-20 bg-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-600/40">
                  <FileUp size={40} className="text-white" />
                </div>
                <h3 className={cn("text-2xl font-bold mb-3 tracking-tight", state.isDarkMode ? "text-white" : "text-slate-900")}>NexGen Viewer</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-8 px-4 uppercase tracking-widest font-medium opacity-60">
                   Symmetrical Document Management & Real-time Annotations
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20 active:scale-95 text-xs uppercase tracking-widest"
                >
                  Load PDF Database
                </button>
              </motion.div>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Decoding Manifest</p>
            </div>
          )}

          {pdfDoc && (
            <div className={cn(
              "max-w-7xl mx-auto pb-32",
              state.viewMode === 'double' ? "flex flex-wrap justify-center gap-x-8 gap-y-16" : "space-y-16"
            )}>
              {state.viewMode === 'continuous' ? (
                Array.from({ length: state.numPages }, (_, i) => i + 1).map((pageNum) => (
                  <div key={pageNum} id={`page-${pageNum}`} className="group/page relative max-w-4xl mx-auto">
                    <div className="absolute -left-12 top-0 h-full w-[2px] bg-slate-800/50 group-hover/page:bg-blue-500/30 transition-colors" />
                    <PageRenderer 
                      pageNumber={pageNum}
                      pdfDoc={pdfDoc}
                      zoom={state.zoom}
                      rotation={state.rotation}
                      isActive={state.currentPage === pageNum}
                      isDarkMode={state.isDarkMode}
                      annotations={currentAnnotations}
                      activeTool={state.activeTool}
                      onAddAnnotation={(p, x, y, w, h) => handleAddAnnotation(p, x, y, state.activeTool === 'view' ? 'note' : state.activeTool as any, w, h)}
                      onPageVisible={(p) => handleStateChange({ currentPage: p })}
                      onRemoveAnnotation={handleRemoveAnnotation}
                      onContextMenu={handleContextMenu}
                    />
                  </div>
                ))
              ) : state.viewMode === 'single' ? (
                <div key={state.currentPage} id={`page-${state.currentPage}`} className="group/page relative max-w-4xl mx-auto">
                  <PageRenderer 
                    pageNumber={state.currentPage}
                    pdfDoc={pdfDoc}
                    zoom={state.zoom}
                    rotation={state.rotation}
                    isActive={true}
                    isDarkMode={state.isDarkMode}
                    annotations={currentAnnotations}
                    activeTool={state.activeTool}
                    onAddAnnotation={(p, x, y, w, h) => handleAddAnnotation(p, x, y, state.activeTool === 'view' ? 'note' : state.activeTool as any, w, h)}
                    onPageVisible={() => {}}
                    onRemoveAnnotation={handleRemoveAnnotation}
                    onContextMenu={handleContextMenu}
                  />
                </div>
              ) : (
                // Double view
                Array.from({ length: Math.ceil(state.numPages / 2) }, (_, i) => [i * 2 + 1, i * 2 + 2]).map(([p1, p2]) => (
                  <div key={`${p1}-${p2}`} className="flex justify-center gap-8 w-full">
                    {p1 <= state.numPages && (
                      <div id={`page-${p1}`} className="group/page relative">
                        <PageRenderer 
                          pageNumber={p1}
                          pdfDoc={pdfDoc}
                          zoom={state.zoom}
                          rotation={state.rotation}
                          isActive={state.currentPage === p1}
                          isDarkMode={state.isDarkMode}
                          annotations={currentAnnotations}
                          activeTool={state.activeTool}
                          onAddAnnotation={(p, x, y, w, h) => handleAddAnnotation(p, x, y, state.activeTool === 'view' ? 'note' : state.activeTool as any, w, h)}
                          onPageVisible={(p) => handleStateChange({ currentPage: p })}
                          onRemoveAnnotation={handleRemoveAnnotation}
                          onContextMenu={handleContextMenu}
                        />
                      </div>
                    )}
                    {p2 <= state.numPages && (
                      <div id={`page-${p2}`} className="group/page relative">
                        <PageRenderer 
                          pageNumber={p2}
                          pdfDoc={pdfDoc}
                          zoom={state.zoom}
                          rotation={state.rotation}
                          isActive={state.currentPage === p2}
                          isDarkMode={state.isDarkMode}
                          annotations={currentAnnotations}
                          activeTool={state.activeTool}
                          onAddAnnotation={(p, x, y, w, h) => handleAddAnnotation(p, x, y, state.activeTool === 'view' ? 'note' : state.activeTool as any, w, h)}
                          onPageVisible={(p) => handleStateChange({ currentPage: p })}
                          onRemoveAnnotation={handleRemoveAnnotation}
                          onContextMenu={handleContextMenu}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      <footer className={cn(
        "h-10 border-t px-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest overflow-hidden transition-colors duration-300",
        state.isDarkMode ? "bg-[#1E293B] border-slate-700/50 text-slate-500" : "bg-white border-slate-200 text-slate-400"
      )}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className={cn("tracking-tighter", state.isDarkMode ? "text-slate-300" : "text-slate-600")}>ProPDF Core v1.0</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className={cn("font-mono tracking-tighter", state.isDarkMode ? "text-slate-400" : "text-slate-500")}>Current Session: {new Date().toLocaleDateString()}</div>
        </div>
      </footer>
    </div>
  );
}
