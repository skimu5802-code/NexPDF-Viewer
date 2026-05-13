import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { motion, AnimatePresence } from 'framer-motion';

// Set up the worker accurately for Vite environment
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { PageRenderer } from './PageRenderer';
import { SearchOverlay } from './SearchOverlay';
import { PDFState, INITIAL_STATE, Annotation, AnnotationType, PDFViewerProps } from '../../types';
import { cn } from '../../lib/utils';
import { FileUp, Loader2, Users, Highlighter, Type, Trash2, StickyNote, X, Info, Calendar, Hash, Shield, FileText } from 'lucide-react';
import { version } from '../../../package.json';

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
  annotationsApiUrl,
  annotationLoader,
  onAnnotationChange,
  onPageChange,
  onLoadSuccess,
  onDocumentLoad,
  height,
  width,
  fitPage,
  className
}: PDFViewerProps) {
  const [state, setState] = useState<PDFState>(() => {
    return {
      ...INITIAL_STATE,
      currentPage: initialPage,
      zoom: initialZoom,
      isSidebarOpen: showSidebar,
      zoomMode: fitPage === 'width' ? 'fit-width' : fitPage === 'page' ? 'fit-page' : INITIAL_STATE.zoomMode
    };
  });
  
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [annotations, setAnnotations] = useState<Record<string, Annotation[]>>({});
  const [undoStack, setUndoStack] = useState<{ type: 'add' | 'delete'; annotation: Annotation; fileId: string }[]>([]);
  const [redoStack, setRedoStack] = useState<{ type: 'add' | 'delete'; annotation: Annotation; fileId: string }[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{ results: number; current: number }>({ results: 0, current: 0 });
  const [noteDialog, setNoteDialog] = useState<{ isOpen: boolean; page: number; x: number; y: number; text: string; annotationId?: string } | null>(null);
  const [documentProps, setDocumentProps] = useState<{ isOpen: boolean; metadata: any } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; page: number; canvasX: number; canvasY: number; annotationId?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
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
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
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
        fileName: file.name,
        fileData: arrayBuffer
      }));

      onLoadSuccess?.(doc.numPages);
      onDocumentLoad?.(doc.numPages);

      // Fetch annotations from database if the consumer provided a source
      fetchAnnotations(file.name);
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

  const fetchAnnotations = async (fileId: string) => {
    if (!fileId || externalAnnotations) return;
    if (!annotationLoader && !annotationsApiUrl) return;

    try {
      let data: any;

      if (annotationLoader) {
        data = await annotationLoader(fileId);
      } else {
        const baseUrl = annotationsApiUrl?.replace(/\/$/, '') || '/api/annotations';
        const response = await fetch(`${baseUrl}/${encodeURIComponent(fileId)}`);

        if (!response.ok) {
          console.error('Error fetching annotations:', response.status, response.statusText);
          return;
        }

        data = await response.json();
      }

      const formattedData = data.map((item: any) => ({
        ...item,
        rects: item.width ? [{ x: item.x, y: item.y, w: item.width, h: item.height }] : [],
        path: item.path || undefined
      }));

      setAnnotations(prev => ({
        ...prev,
        [fileId]: formattedData
      }));
    } catch (error) {
      console.error('Error fetching annotations:', error);
    }
  };

  useEffect(() => {
    if (state.fileName && externalAnnotations) {
      setAnnotations(prev => ({
        ...prev,
        [state.fileName as string]: externalAnnotations
      }));
    }
  }, [externalAnnotations, state.fileName]);

  useEffect(() => {
    // Poll for changes every 5 seconds for collaboration
    if (!state.fileName || externalAnnotations || (!annotationLoader && !annotationsApiUrl)) return;
    const interval = setInterval(() => {
      fetchAnnotations(state.fileName || "");
    }, 5000);
    return () => clearInterval(interval);
  }, [state.fileName, externalAnnotations, annotationLoader, annotationsApiUrl]);

  useEffect(() => {
    // Collapse sidebar by default on small screens
    if (window.innerWidth < 768) {
      setState(prev => ({ ...prev, isSidebarOpen: false }));
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      loadPDF(file);
    }
  };

  const [history, setHistory] = useState<{ id: string; timestamp: number; name: string }[]>([]);

  const handleAddAnnotation = async (page: number, x: number, y: number, type: AnnotationType = 'note', w?: number, h?: number, path?: { x: number; y: number }[], lineWidth?: number) => {
    if (!state.fileName) return;

    let content = '';
    let color = state.highlightColor;
    
    if (type === 'note') {
      setNoteDialog({ isOpen: true, page, x, y, text: '' });
      return;
    } else if (type === 'highlight') {
      color = state.highlightColor;
    } else if (type === 'underline') {
      color = '#3b82f6';
    } else if (type === 'box' || type === 'circle' || type === 'draw') {
      color = state.highlightColor;
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
      path,
      lineWidth: type === 'draw' ? (lineWidth ?? state.drawLineWidth) : undefined,
      content,
      author: 'User',
      createdAt: Date.now()
    };

    try {
      await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAnnotation,
          fileId: state.fileName,
          x: newAnnotation.rects[0].x,
          y: newAnnotation.rects[0].y,
          width: newAnnotation.rects[0].w,
          height: newAnnotation.rects[0].h,
          text: newAnnotation.content,
          path: newAnnotation.path,
          lineWidth: newAnnotation.lineWidth
        })
      });

      const currentFileAnnotations = annotations[state.fileName] || [];
      const updatedFileAnnotations = [...currentFileAnnotations, newAnnotation];
      
      // Save action for undo
      setUndoStack(prev => [{ type: 'add' as const, annotation: newAnnotation, fileId: state.fileName! }, ...prev].slice(0, 50));
      setRedoStack([]);

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
    } catch (error) {
      console.error('Error saving annotation:', error);
      alert('Failed to save annotation to database.');
    }
  };

  const handleRemoveAnnotation = async (id: string) => {
    if (!state.fileName) return;

    try {
      await fetch(`/api/annotations/${id}`, { method: 'DELETE' });

      const currentFileAnnotations = annotations[state.fileName] || [];
      const removedAnnotation = currentFileAnnotations.find(ann => ann.id === id);
      const updatedFileAnnotations = currentFileAnnotations.filter(ann => ann.id !== id);
      
      if (removedAnnotation) {
        // Save action for undo
        setUndoStack(prev => [{ type: 'delete' as const, annotation: removedAnnotation, fileId: state.fileName! }, ...prev].slice(0, 50));
        setRedoStack([]);
      }
      
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
    } catch (error) {
      console.error('Error removing annotation:', error);
    }
  };

  const handleExport = (format: 'pdf' | 'docx') => {
    alert(`Exporting as ${format.toUpperCase()}... In a real app, this would process the PDF and annotations server-side.`);
  };

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0 || !state.fileName) return;
    
    const [action, ...restUndo] = undoStack;
    setUndoStack(restUndo);
    
    try {
      if (action.type === 'add') {
        // Undo adding: delete from server and state
        await fetch(`/api/annotations/${action.annotation.id}`, { method: 'DELETE' });
        
        setAnnotations(prev => {
          const fileAnns = prev[action.fileId] || [];
          return { ...prev, [action.fileId]: fileAnns.filter(a => a.id !== action.annotation.id) };
        });
      } else {
        // Undo deleting: re-add to server and state
        await fetch('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...action.annotation,
            fileId: action.fileId,
            x: action.annotation.rects[0].x,
            y: action.annotation.rects[0].y,
            width: action.annotation.rects[0].w,
            height: action.annotation.rects[0].h,
            text: action.annotation.content,
            path: action.annotation.path
          })
        });

        setAnnotations(prev => {
          const fileAnns = prev[action.fileId] || [];
          return { ...prev, [action.fileId]: [...fileAnns, action.annotation] };
        });
      }
      
      setRedoStack(prev => [action, ...prev]);
      
      // Update sidebar if current file
      if (action.fileId === state.fileName) {
        const updated = annotations[state.fileName] || [];
        onAnnotationChange?.(action.type === 'add' 
          ? updated.filter(a => a.id !== action.annotation.id)
          : [...updated, action.annotation]
        );
      }
    } catch (error) {
      console.error('Undo error:', error);
    }
  }, [undoStack, state.fileName, annotations, onAnnotationChange]);

  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0 || !state.fileName) return;
    
    const [action, ...restRedo] = redoStack;
    setRedoStack(restRedo);
    
    try {
      if (action.type === 'add') {
        // Redo adding: re-add to server and state
        await fetch('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...action.annotation,
            fileId: action.fileId,
            x: action.annotation.rects[0].x,
            y: action.annotation.rects[0].y,
            width: action.annotation.rects[0].w,
            height: action.annotation.rects[0].h,
            text: action.annotation.content,
            path: action.annotation.path
          })
        });

        setAnnotations(prev => {
          const fileAnns = prev[action.fileId] || [];
          return { ...prev, [action.fileId]: [...fileAnns, action.annotation] };
        });
      } else {
        // Redo deleting: delete from server and state
        await fetch(`/api/annotations/${action.annotation.id}`, { method: 'DELETE' });
        
        setAnnotations(prev => {
          const fileAnns = prev[action.fileId] || [];
          return { ...prev, [action.fileId]: fileAnns.filter(a => a.id !== action.annotation.id) };
        });
      }
      
      setUndoStack(prev => [action, ...prev]);
      
      if (action.fileId === state.fileName) {
        const updated = annotations[state.fileName] || [];
        onAnnotationChange?.(action.type === 'add' 
          ? [...updated, action.annotation]
          : updated.filter(a => a.id !== action.annotation.id)
        );
      }
    } catch (error) {
      console.error('Redo error:', error);
    }
  }, [redoStack, state.fileName, annotations, onAnnotationChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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

  const finishAddNote = async (text: string) => {
    if (!noteDialog || !state.fileName) return;
    
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

    try {
      await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAnnotation,
          fileId: state.fileName,
          x: newAnnotation.rects[0].x,
          y: newAnnotation.rects[0].y,
          width: newAnnotation.rects[0].w,
          height: newAnnotation.rects[0].h,
          text: newAnnotation.content
        })
      });

      const currentFileAnnotations = annotations[state.fileName] || [];
      const updatedFileAnnotations = [...currentFileAnnotations, newAnnotation];
      
      setUndoStack(prev => [{ type: 'add' as const, annotation: newAnnotation, fileId: state.fileName! }, ...prev].slice(0, 50));
      setRedoStack([]);

      const updatedAllAnnotations = {
        ...annotations,
        [state.fileName]: updatedFileAnnotations
      };

      setAnnotations(updatedAllAnnotations);
      onAnnotationChange?.(updatedFileAnnotations);
      setNoteDialog(null);
    } catch (error) {
      console.error('Error saving note:', error);
    }
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

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!state.fileData || !state.fileName) return;
    
    setLoading(true);
    try {
      if (format === 'pdf') {
        const { PDFDocument, rgb } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(state.fileData.slice(0));
        const pages = pdfDoc.getPages();
        
        const fileAnnotations = annotations[state.fileName] || [];
        
        // Loop through annotations and add to PDF
        for (const ann of fileAnnotations) {
          if (ann.page <= pages.length) {
            const page = pages[ann.page - 1];
            const { height } = page.getSize();
            
            for (const rect of ann.rects) {
              // Convert coordinate system: Top-Left to Bottom-Left
              // PageRenderer uses x, y relative to zoom=1 pixels
              const x = rect.x;
              const y = height - rect.y - rect.h;
              
              const hexToRgb = (hex: string) => {
                const r = parseInt(hex.slice(1, 3), 16) / 255;
                const g = parseInt(hex.slice(3, 5), 16) / 255;
                const b = parseInt(hex.slice(5, 7), 16) / 255;
                return rgb(r, g, b);
              };

              const color = hexToRgb(ann.color);

              if (ann.type === 'highlight') {
                page.drawRectangle({
                  x,
                  y,
                  width: rect.w,
                  height: rect.h,
                  color: color,
                  opacity: 0.4,
                });
              } else if (ann.type === 'underline') {
                page.drawLine({
                  start: { x, y: height - rect.y - rect.h },
                  end: { x: x + rect.w, y: height - rect.y - rect.h },
                  thickness: 2,
                  color: color,
                });
              } else if (ann.type === 'note') {
                // Simplified note representation: a small box or icon
                page.drawRectangle({
                  x: x - 10,
                  y: height - rect.y - 10,
                  width: 20,
                  height: 20,
                  color: rgb(1, 0.8, 0.2),
                  borderColor: rgb(0, 0, 0),
                  borderWidth: 1,
                });
                page.drawText('!', {
                  x: x - 3,
                  y: height - rect.y - 5,
                  size: 14,
                  color: rgb(0, 0, 0),
                });
              }
            }
          }
        }
        
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${state.fileName.replace('.pdf', '')}_annotated.pdf`;
        link.click();
        URL.revokeObjectURL(url);

      } else if (format === 'docx') {
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
        
        const fileAnnotations = annotations[state.fileName] || [];
        
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                text: `Annotation Summary: ${state.fileName}`,
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Exported on: ${new Date().toLocaleString()}`,
                    italics: true,
                  }),
                ],
                spacing: { after: 400 },
              }),
              ...fileAnnotations.flatMap((ann, index) => [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Annotation #${index + 1}: ${ann.type.toUpperCase()}`,
                      bold: true,
                    }),
                    new TextRun({
                      text: ` (Page ${ann.page})`,
                      italics: true,
                    }),
                  ],
                  spacing: { before: 200 },
                }),
                ann.content ? new Paragraph({
                  children: [
                    new TextRun({
                      text: `Content: ${ann.content}`,
                    }),
                  ],
                }) : null,
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Author: ${ann.author} | Created: ${new Date(ann.createdAt).toLocaleTimeString()}`,
                      size: 16,
                      color: "666666",
                    }),
                  ],
                  spacing: { after: 200 },
                }),
              ].filter(Boolean) as any[]),
              fileAnnotations.length === 0 ? new Paragraph({
                text: "No annotations found in this document.",
              }) : null,
            ].filter(Boolean) as any[],
          }],
        });

        const buffer = await Packer.toBuffer(doc);
        const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${state.fileName.replace('.pdf', '')}_annotations.docx`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export error:", err);
      alert(`Failed to export as ${format.toUpperCase()}. See console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleShowInfo = async () => {
    if (!pdfDoc) return;
    setLoading(true);
    try {
      const { info, metadata } = await pdfDoc.getMetadata();
      setDocumentProps({
        isOpen: true,
        metadata: {
          ...info,
          Pages: pdfDoc.numPages,
          Version: pdfDoc.version || '1.7',
          Size: state.fileData ? `${(state.fileData.byteLength / (1024 * 1024)).toFixed(2)} MB` : 'N/A'
        }
      });
    } catch (err) {
      console.error("Metadata error:", err);
    } finally {
      setLoading(false);
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
    <div
      ref={rootRef}
      style={{ height: height ?? '100vh', width: width ?? '100%' }}
      className={cn(
        "flex flex-col h-full min-h-0 overflow-hidden font-sans pt-2 transition-colors duration-300",
        state.isDarkMode ? "bg-[#0F172A] text-slate-200" : "bg-slate-50 text-slate-900",
        className
      )}
    >
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
            <div className="flex justify-between items-center text-[12px] text-slate-500 font-bold uppercase tracking-widest">
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

      {documentProps?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "border w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden p-8 transition-colors duration-300",
              state.isDarkMode ? "bg-[#0F172A] border-slate-700" : "bg-white border-slate-200"
            )}
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-xl">
                  <Info size={20} className="text-blue-500" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Document Properties</h3>
              </div>
              <button 
                onClick={() => setDocumentProps(null)}
                className={cn(
                  "p-2 rounded-full transition-all hover:bg-slate-100",
                  state.isDarkMode ? "text-slate-500 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-900"
                )}
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {[
                { label: 'Title', value: documentProps.metadata.Title, icon: FileText },
                { label: 'Author', value: documentProps.metadata.Author, icon: Users },
                { label: 'Subject', value: documentProps.metadata.Subject, icon: Info },
                { label: 'Keywords', value: documentProps.metadata.Keywords, icon: Hash },
                { label: 'Creator', value: documentProps.metadata.Creator, icon: Shield },
                { label: 'Producer', value: documentProps.metadata.Producer, icon: Shield },
                { label: 'Created', value: documentProps.metadata.CreationDate, icon: Calendar },
                { label: 'Modified', value: documentProps.metadata.ModDate, icon: Calendar },
                { label: 'Pages', value: documentProps.metadata.Pages, icon: Hash },
                { label: 'Version', value: `PDF ${documentProps.metadata.Version}`, icon: Info },
                { label: 'File Size', value: documentProps.metadata.Size, icon: FileText },
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-2 text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    <item.icon size={12} className="text-blue-500/50" />
                    {item.label}
                  </div>
                  <div className={cn(
                    "text-sm font-medium truncate",
                    state.isDarkMode ? "text-slate-200" : "text-slate-800"
                  )}>
                    {item.value || 'Not available'}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-6 border-t border-slate-700/30 flex justify-end">
              <button 
                onClick={() => setDocumentProps(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl transition-all shadow-xl active:scale-95"
              >
                Done
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
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-all group"
              >
                <div className="bg-red-400/10 p-2 rounded-lg group-hover:bg-red-400/20 transition-colors">
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
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all group",
                    state.isDarkMode ? "text-slate-300 hover:bg-white/5 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="bg-amber-400/10 p-2 rounded-lg group-hover:bg-amber-400/20 transition-colors">
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
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all group",
                    state.isDarkMode ? "text-slate-300 hover:bg-white/5 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div 
                    className="p-2 rounded-lg group-hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: `${state.highlightColor}20` }}
                  >
                    <Highlighter size={14} style={{ color: state.highlightColor }} />
                  </div>
                  <span className="font-medium">Highlight Here</span>
                </button>

                <button 
                  onClick={() => {
                     handleAddAnnotation(contextMenu.page, contextMenu.canvasX, contextMenu.canvasY, 'underline');
                     setContextMenu(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all group",
                    state.isDarkMode ? "text-slate-300 hover:bg-white/5 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="bg-blue-400/10 p-2 rounded-lg group-hover:bg-blue-400/20 transition-colors">
                    <Type size={14} className="text-blue-400" />
                  </div>
                  <span className="font-medium">Underline Text</span>
                </button>
              </div>
            )}

            <div className={cn("h-px my-1 mx-2", state.isDarkMode ? "bg-slate-800/50" : "bg-slate-100")} />

            <button 
              onClick={() => setContextMenu(null)}
              className="w-full flex items-center gap-3 px-4 py-2 text-[12px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              <div className="p-2">
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
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
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

      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {showSidebar && (
          <>
            <AnimatePresence>
              {state.isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setState(prev => ({ ...prev, isSidebarOpen: false }))}
                  className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-30 md:hidden"
                />
              )}
            </AnimatePresence>
            <Sidebar 
              isOpen={state.isSidebarOpen}
              pdfDoc={pdfDoc}
              state={state}
              annotations={currentAnnotations}
              history={history}
              onPageSelect={handlePageNavigation}
              onCloudSync={(service) => alert(`Connecting to ${service}...`)}
            />
          </>
        )}

        <main 
          ref={containerRef}
          onMouseDown={handlePanDown}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanUp}
          onMouseLeave={handlePanUp}
          className={cn(
            "flex-1 overflow-y-auto px-4 md:px-12 py-10 transition-all duration-300 custom-scrollbar min-h-0",
            state.isDarkMode ? "bg-slate-950/50" : "bg-slate-200/50",
            state.isSidebarOpen ? "md:ml-56" : "ml-0",
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
                <p className="text-slate-400 text-sm leading-relaxed mb-8 px-4 uppercase tracking-widest font-medium opacity-60">
                   Symmetrical Document Management & Real-time Annotations
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20 active:scale-95 text-sm uppercase tracking-widest"
                >
                  Load PDF Database
                </button>
              </motion.div>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-[0.3em]">Decoding Manifest</p>
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
                      highlightColor={state.highlightColor}
                      drawLineWidth={state.drawLineWidth}
                      onAddAnnotation={(p, x, y, w, h, t, pt, lw) => handleAddAnnotation(p, x, y, t || (state.activeTool === 'view' ? 'note' : state.activeTool as any), w, h, pt, lw)}
                      onPageVisible={(p) => {
                        if (state.currentPage !== p) {
                          handleStateChange({ currentPage: p });
                        }
                      }}
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
                    highlightColor={state.highlightColor}
                    drawLineWidth={state.drawLineWidth}
                    onAddAnnotation={(p, x, y, w, h, t, pt, lw) => handleAddAnnotation(p, x, y, t || (state.activeTool === 'view' ? 'note' : state.activeTool as any), w, h, pt, lw)}
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
                          isActive={state.currentPage === p1 || (state.viewMode === 'double' && state.currentPage === p1 - 1)}
                          isDarkMode={state.isDarkMode}
                          annotations={currentAnnotations}
                          activeTool={state.activeTool}
                          highlightColor={state.highlightColor}
                          drawLineWidth={state.drawLineWidth}
                          onAddAnnotation={(p, x, y, w, h, t, pt, lw) => handleAddAnnotation(p, x, y, t || (state.activeTool === 'view' ? 'note' : state.activeTool as any), w, h, pt, lw)}
                          onPageVisible={(p) => {
                            if (state.viewMode === 'double') {
                              const rowStart = Math.floor((p - 1) / 2) * 2 + 1;
                              if (state.currentPage !== rowStart) {
                                handleStateChange({ currentPage: rowStart });
                              }
                            } else {
                              if (state.currentPage !== p) {
                                handleStateChange({ currentPage: p });
                              }
                            }
                          }}
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
                          isActive={state.currentPage === p2 || (state.viewMode === 'double' && state.currentPage === p2 - 1)}
                          isDarkMode={state.isDarkMode}
                          annotations={currentAnnotations}
                          activeTool={state.activeTool}
                          highlightColor={state.highlightColor}
                          drawLineWidth={state.drawLineWidth}
                          onAddAnnotation={(p, x, y, w, h, t, pt, lw) => handleAddAnnotation(p, x, y, t || (state.activeTool === 'view' ? 'note' : state.activeTool as any), w, h, pt, lw)}
                          onPageVisible={(p) => {
                            if (state.viewMode === 'double') {
                              const rowStart = Math.floor((p - 1) / 2) * 2 + 1;
                              if (state.currentPage !== rowStart) {
                                handleStateChange({ currentPage: rowStart });
                              }
                            } else {
                              if (state.currentPage !== p) {
                                handleStateChange({ currentPage: p });
                              }
                            }
                          }}
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
        "h-10 border-t px-6 flex items-center justify-between text-[12px] font-bold uppercase tracking-widest overflow-hidden transition-colors duration-300",
        state.isDarkMode ? "bg-[#1E293B] border-slate-700/50 text-slate-500" : "bg-white border-slate-200 text-slate-400"
      )}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className={cn("tracking-wider", state.isDarkMode ? "text-slate-300" : "text-slate-600")}>Powered by NexGenPDF</span> <span className={cn("ml-1 text-xs", state.isDarkMode ? "text-slate-500" : "text-slate-400")}>v{version}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className={cn("font-mono ", state.isDarkMode ? "text-slate-400" : "text-slate-500")}>Current Session: {new Date().toLocaleDateString()}</div>
        </div>
      </footer>
    </div>
  );
}
