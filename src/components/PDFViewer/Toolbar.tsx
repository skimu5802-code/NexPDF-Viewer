import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, ZoomOut, RotateCw, Sidebar, 
  Search, Sun, Moon, Download, Upload, FileUp,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Maximize, MousePointer2, Type, Highlighter, Underline as UnderlineIcon,
  Printer, Info, Hand, Layout, LayoutPanelTop, PanelsTopLeft, ChevronDown,
  MoreHorizontal, Undo, Redo, Palette, Square, Circle as CircleIcon, Pencil
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PDFState } from '../../types';

interface ToolbarProps {
  state: PDFState;
  onStateChange: (update: Partial<PDFState>) => void;
  onPageNavigation: (page: number) => void;
  onUpload: () => void;
  onSearchToggle: () => void;
  onToggleFullScreen: () => void;
  onPrint: () => void;
  onDownload: (format: 'pdf' | 'docx') => void;
  onShowInfo: () => void;
  allowUpload?: boolean;
  searchEnabled?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  state, 
  onStateChange, 
  onPageNavigation,
  onUpload, 
  onSearchToggle,
  onToggleFullScreen,
  onPrint,
  onDownload,
  onShowInfo,
  allowUpload = true,
  searchEnabled = true,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo
}) => {
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const zoomMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const zoomOptions = [
    { label: '50%', value: '0.5' },
    { label: '75%', value: '0.75' },
    { label: '100%', value: '1.0' },
    { label: '125%', value: '1.25' },
    { label: '150%', value: '1.5' },
    { label: '200%', value: '2.0' },
    { label: 'Fit Page', value: 'fit-page' },
    { label: 'Fit Width', value: 'fit-width' },
  ];

  const currentZoomLabel = zoomOptions.find(opt => 
    state.zoomMode !== 'custom' ? opt.value === state.zoomMode : opt.value === state.zoom.toString()
  )?.label || `${Math.round(state.zoom * 100)}%`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(event.target as Node)) {
        setIsZoomMenuOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(event.target as Node)) {
        setIsShapeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tools = [
    { id: 'view', icon: MousePointer2, label: 'Select' },
    { id: 'hand', icon: Hand, label: 'Hand' },
    { id: 'note', icon: Type, label: 'Note' },
    { id: 'highlight', icon: Highlighter, label: 'Highlight' },
  ];

  const shapeTools = [
    { id: 'box', icon: Square, label: 'Box' },
    { id: 'circle', icon: CircleIcon, label: 'Circle' },
    { id: 'draw', icon: Pencil, label: 'Draw' },
  ];

  const activeShape = shapeTools.find(tool => tool.id === state.activeTool);
  const ShapeIcon = activeShape ? activeShape.icon : Square;

  const handleZoomChange = (value: string) => {
    if (value === 'fit-page') {
      onStateChange({ zoomMode: 'fit-page' });
    } else if (value === 'fit-width') {
      onStateChange({ zoomMode: 'fit-width' });
    } else {
      onStateChange({ zoom: parseFloat(value), zoomMode: 'custom' });
    }
  };

  return (
    <div className={cn(
      "h-14 border-b flex items-center justify-between px-3 md:px-6 sticky top-0 z-50 transition-colors duration-300",
      state.isDarkMode ? "bg-[#1E293B] border-slate-700/50" : "bg-white border-slate-200 shadow-sm"
    )}>
      {/* Left: Branding & Core Toggles */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0 min-w-0">
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 shrink-0">N</div>
          <span className={cn(
            "font-semibold tracking-tight hidden xl:inline truncate",
            state.isDarkMode ? "text-white" : "text-slate-900"
          )}>
            NexusPDF <span className="text-[10px] text-slate-400 font-mono ml-1">v2.5.0</span>
          </span>
        </div>
        
        <div className={cn("h-6 w-[1px] mx-1 md:mx-2 hidden md:block", state.isDarkMode ? "bg-slate-700/50" : "bg-slate-200")} />
        
        <div className={cn(
          "flex items-center gap-1 p-1 rounded-lg border",
          state.isDarkMode ? "bg-slate-800 border-slate-700/50" : "bg-slate-100 border-slate-200"
        )}>
          <button 
            onClick={() => onStateChange({ isSidebarOpen: !state.isSidebarOpen })}
            className={cn(
              "p-1.5 rounded transition-all active:scale-95",
              state.isSidebarOpen 
                ? (state.isDarkMode ? "bg-blue-600/20 text-blue-400" : "bg-white text-blue-600 shadow-sm") 
                : (state.isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-500")
            )}
            title="Toggle Sidebar"
          >
            <Sidebar size={18} />
          </button>

          <button 
            onClick={() => onStateChange({ isDarkMode: !state.isDarkMode })}
            className={cn(
              "p-1.5 rounded transition-all active:scale-95",
              state.isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-200 text-slate-500"
            )}
            title={state.isDarkMode ? "Light Mode" : "Dark Mode"}
          >
            {state.isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Middle: Annotation Tools (Only visible on wide screens) */}
      <div className="hidden lg:flex items-center gap-2 mx-2 md:mx-4 shrink-0">
        <div className={cn(
          "flex items-center gap-1 p-1 rounded-lg border",
          state.isDarkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-100 border-slate-200"
        )}>
          {tools.map((tool) => (
            <React.Fragment key={tool.id}>
              <button
                onClick={() => onStateChange({ activeTool: tool.id as any })}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-2",
                  state.activeTool === tool.id 
                    ? (state.isDarkMode ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner" : "bg-white text-blue-600 border border-blue-200 shadow-sm") 
                    : (state.isDarkMode ? "text-slate-400 hover:bg-slate-700/50" : "text-slate-500 hover:bg-white/50")
                )}
                title={tool.label}
              >
                <tool.icon size={14} />
                <span className="hidden xl:inline">{tool.label}</span>
              </button>
              
              {tool.id === 'highlight' && (
                <div className="flex items-center px-1">
                  <div className={cn("h-4 w-[1px] mx-1", state.isDarkMode ? "bg-slate-700" : "bg-slate-300")} />
                  <button
                    onClick={() => colorInputRef.current?.click()}
                    className={cn(
                      "w-5 h-5 rounded-full border shadow-sm transition-transform active:scale-90 flex items-center justify-center overflow-hidden",
                      state.isDarkMode ? "border-slate-600" : "border-white"
                    )}
                    style={{ backgroundColor: state.highlightColor }}
                    title="Change Highlight Color"
                  >
                    <Palette size={10} className={cn(
                      "opacity-0 hover:opacity-100 transition-opacity",
                      state.isDarkMode ? "text-white" : "text-black"
                    )} />
                    <input 
                      ref={colorInputRef}
                      type="color" 
                      value={state.highlightColor}
                      onChange={(e) => onStateChange({ highlightColor: e.target.value })}
                      className="sr-only"
                    />
                  </button>
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Shapes Dropdown */}
          <div className="relative flex items-center" ref={shapeMenuRef}>
            <div className={cn("h-4 w-[1px] mx-1 hidden xl:block", state.isDarkMode ? "bg-slate-700" : "bg-slate-300")} />
            <button
              onClick={() => setIsShapeMenuOpen(!isShapeMenuOpen)}
              className={cn(
                "px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-2",
                activeShape
                  ? (state.isDarkMode ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner" : "bg-white text-blue-600 border border-blue-200 shadow-sm") 
                  : (state.isDarkMode ? "text-slate-400 hover:bg-slate-700/50" : "text-slate-500 hover:bg-white/50")
              )}
              title="Shapes"
            >
              <ShapeIcon size={14} />
              <span className="hidden xl:inline">{activeShape ? activeShape.label : 'Shapes'}</span>
              <ChevronDown size={12} className={cn("transition-transform duration-200", isShapeMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isShapeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className={cn(
                    "absolute top-full left-0 mt-2 w-32 border rounded-xl shadow-xl z-[100] p-1",
                    state.isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                  )}
                >
                  {shapeTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        onStateChange({ activeTool: tool.id as any });
                        setIsShapeMenuOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-3 transition-colors",
                        state.activeTool === tool.id 
                          ? (state.isDarkMode ? "bg-blue-600/20 text-blue-400" : "bg-blue-50 text-blue-600") 
                          : (state.isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")
                      )}
                    >
                      <tool.icon size={14} />
                      {tool.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-1 p-1 rounded-lg border",
          state.isDarkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-100 border-slate-200"
        )}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={cn(
              "p-1.5 rounded transition-all disabled:opacity-30",
              state.isDarkMode ? "text-slate-400 hover:bg-slate-700/50 hover:text-white" : "text-slate-500 hover:bg-white hover:text-slate-900"
            )}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={cn(
              "p-1.5 rounded transition-all disabled:opacity-30",
              state.isDarkMode ? "text-slate-400 hover:bg-slate-700/50 hover:text-white" : "text-slate-500 hover:bg-white hover:text-slate-900"
            )}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={16} />
          </button>
        </div>
      </div>

      {/* Right: Navigation, Zoom, and Actions */}
      <div className="flex items-center gap-1 md:gap-4 shrink-0">
        {/* Page Navigation Container */}
        <div className="flex flex-col gap-1 items-center">
          <div className={cn(
            "flex items-center gap-1 rounded-lg p-1 border transition-all h-9",
            state.isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500 shadow-sm"
          )}>
            <button 
              onClick={() => onPageNavigation(1)}
              disabled={state.currentPage <= 1}
              className={cn(
                "p-1.5 rounded-md disabled:opacity-20 transition-all hidden xl:block",
                state.isDarkMode ? "hover:bg-slate-700 hover:text-white" : "hover:bg-white hover:text-slate-900 shadow-sm"
              )}
              title="First Page"
            >
              <ChevronsLeft size={16} />
            </button>

            <button 
              onClick={() => onPageNavigation(Math.max(1, state.currentPage - 1))}
              disabled={state.currentPage <= 1}
              className={cn(
                "p-1.5 rounded-md disabled:opacity-20 transition-all",
                state.isDarkMode ? "hover:bg-slate-700 hover:text-white" : "hover:bg-white hover:text-slate-900 shadow-sm"
              )}
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex items-center px-1 md:px-2 gap-1.5">
               <input 
                type="text"
                value={state.currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= state.numPages) {
                    onPageNavigation(val);
                  }
                }}
                className={cn(
                  "border rounded-md text-xs font-bold text-center w-8 md:w-10 py-1 transition-all outline-none focus:ring-1 focus:ring-blue-500",
                  state.isDarkMode ? "bg-slate-900 border-slate-700 text-blue-400" : "bg-white border-slate-200 text-blue-600 shadow-inner"
                )}
               />
               <span className={cn(
                 "text-[11px] font-bold opacity-40 uppercase tracking-tighter hidden md:inline",
                 state.isDarkMode ? "text-slate-400" : "text-slate-600"
               )}>
                 of {state.numPages || '--'}
               </span>
               <span className="text-[10px] font-mono opacity-50 md:hidden">
                 /{state.numPages > 99 ? '..' : state.numPages || '--'}
               </span>
            </div>

            <button 
              onClick={() => onPageNavigation(Math.min(state.numPages, state.currentPage + 1))}
              disabled={state.currentPage >= state.numPages}
              className={cn(
                "p-1.5 rounded-md disabled:opacity-20 transition-all",
                state.isDarkMode ? "hover:bg-slate-700 hover:text-white" : "hover:bg-white hover:text-slate-900 shadow-sm"
              )}
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>

            <button 
              onClick={() => onPageNavigation(state.numPages)}
              disabled={state.currentPage >= state.numPages}
              className={cn(
                "p-1.5 rounded-md disabled:opacity-20 transition-all hidden xl:block",
                state.isDarkMode ? "hover:bg-slate-700 hover:text-white" : "hover:bg-white hover:text-slate-900 shadow-sm"
              )}
              title="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
          
          {/* Subtle Progress Bar */}
          <div className={cn(
            "w-full h-[2px] rounded-full overflow-hidden hidden md:block",
            state.isDarkMode ? "bg-slate-800" : "bg-slate-200"
          )}>
            <motion.div 
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${(state.currentPage / (state.numPages || 1)) * 100}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </div>

        {/* Zoom Controls (Large screens) */}
        <div className={cn(
          "hidden lg:flex items-center gap-2 p-1 rounded-lg border",
          state.isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200 transition-colors"
        )}>
          <button 
            onClick={() => onStateChange({ zoom: Math.max(0.2, state.zoom - 0.1), zoomMode: 'custom' })}
            className={cn(
              "p-1.5 rounded-md transition-all active:scale-90",
              state.isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm"
            )}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          
          <div className="flex items-center gap-3 px-1">
            <input 
              type="range" 
              min="0.2" 
              max="3" 
              step="0.1" 
              value={state.zoom} 
              onChange={(e) => onStateChange({ zoom: parseFloat(e.target.value), zoomMode: 'custom' })}
              className={cn(
                "w-20 md:w-24 h-1 rounded-lg appearance-none cursor-pointer accent-blue-500",
                state.isDarkMode ? "bg-slate-700" : "bg-slate-300"
              )}
              title={`Zoom: ${Math.round(state.zoom * 100)}%`}
            />
            
            <div className="relative" ref={zoomMenuRef}>
              <button 
                onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
                className={cn(
                  "px-2 py-1 flex items-center gap-2 text-[10px] font-bold rounded transition-colors min-w-[75px] justify-between",
                  state.isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-slate-700 hover:bg-white shadow-sm"
                )}
              >
                <span className="tabular-nums">{currentZoomLabel}</span>
                <ChevronDown size={14} className={cn("transition-transform duration-300", isZoomMenuOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isZoomMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className={cn(
                      "absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 border rounded-2xl shadow-2xl overflow-hidden z-[60]",
                      state.isDarkMode ? "bg-slate-900 border-slate-700 shadow-black/50" : "bg-white border-slate-200"
                    )}
                  >
                    <div className="p-2 grid grid-cols-1 gap-1">
                      <div className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Fixed Scaling</div>
                      {zoomOptions.slice(0, 6).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            handleZoomChange(opt.value);
                            setIsZoomMenuOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between group",
                            (state.zoomMode !== 'custom' ? opt.value === state.zoomMode : opt.value === state.zoom.toString())
                              ? (state.isDarkMode ? "bg-blue-600/20 text-blue-400" : "bg-blue-50 text-blue-600")
                              : (state.isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")
                          )}
                        >
                          <span className="tabular-nums">{opt.label}</span>
                          {(state.zoomMode !== 'custom' ? opt.value === state.zoomMode : opt.value === state.zoom.toString()) && (
                            <motion.div layoutId="zoom-active" className={cn("w-1.5 h-1.5 rounded-full", state.isDarkMode ? "bg-blue-400" : "bg-blue-600")} />
                          )}
                        </button>
                      ))}
                      
                      <div className="h-px bg-slate-700/50 my-1 mx-2 lg:block" />
                      <div className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Layout Fit</div>
                      
                      {zoomOptions.slice(6).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            handleZoomChange(opt.value);
                            setIsZoomMenuOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between group",
                            (state.zoomMode !== 'custom' ? opt.value === state.zoomMode : opt.value === state.zoom.toString())
                              ? (state.isDarkMode ? "bg-blue-600/20 text-blue-400" : "bg-blue-50 text-blue-600")
                              : (state.isDarkMode ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
                          )}
                        >
                          {opt.label}
                          {(state.zoomMode !== 'custom' ? opt.value === state.zoomMode : opt.value === state.zoom.toString()) && (
                            <motion.div layoutId="zoom-active" className={cn("w-1.5 h-1.5 rounded-full", state.isDarkMode ? "bg-blue-400" : "bg-blue-600")} />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button 
            onClick={() => onStateChange({ zoom: Math.min(5, state.zoom + 0.1), zoomMode: 'custom' })}
            className={cn(
              "p-1.5 rounded-md transition-all active:scale-90",
              state.isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm"
            )}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* View Mode & Actions (Only visible on wide screens) */}
        <div className="hidden 2xl:flex items-center gap-1">
          <div className={cn("h-6 w-[1px] mx-1", state.isDarkMode ? "bg-slate-700/50" : "bg-slate-200")} />
          <div className={cn(
            "flex items-center gap-1 p-1 rounded border",
            state.isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200 transition-colors"
          )}>
            <button onClick={() => onStateChange({ viewMode: 'single' })} className={cn("p-1.5 rounded transition-all", state.viewMode === 'single' ? (state.isDarkMode ? "bg-slate-700 text-blue-400" : "bg-white text-blue-600 shadow-sm") : "text-slate-400 hover:text-slate-300")} title="Single Page"><LayoutPanelTop size={16} /></button>
            <button onClick={() => onStateChange({ viewMode: 'double' })} className={cn("p-1.5 rounded transition-all", state.viewMode === 'double' ? (state.isDarkMode ? "bg-slate-700 text-blue-400" : "bg-white text-blue-600 shadow-sm") : "text-slate-400 hover:text-slate-300")} title="Two Pages"><PanelsTopLeft size={16} /></button>
            <button onClick={() => onStateChange({ viewMode: 'continuous' })} className={cn("p-1.5 rounded transition-all", state.viewMode === 'continuous' ? (state.isDarkMode ? "bg-slate-700 text-blue-400" : "bg-white text-blue-600 shadow-sm") : "text-slate-400 hover:text-slate-300")} title="Continuous"><Layout size={16} /></button>
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-0.5">
          <button onClick={() => onStateChange({ rotation: (state.rotation + 90) % 360 })} className={cn("p-2 rounded hover:bg-slate-100", state.isDarkMode ? "hover:bg-slate-700 text-slate-400" : "text-slate-500")} title="Rotate"><RotateCw size={18} /></button>
          <button onClick={onPrint} className={cn("p-2 rounded hover:bg-slate-100", state.isDarkMode ? "hover:bg-slate-700 text-slate-400" : "text-slate-500")} title="Print"><Printer size={18} /></button>
          <div className="relative" ref={downloadMenuRef}>
            <button 
              onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)} 
              className={cn("p-2 rounded hover:bg-slate-100 transition-all", state.isDarkMode ? "hover:bg-slate-700 text-slate-400" : "text-slate-500")} 
              title="Export Document"
            >
              <Download size={18} />
            </button>

            <AnimatePresence>
              {isDownloadMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className={cn(
                    "absolute top-full right-0 mt-2 w-48 border rounded-2xl shadow-2xl z-[110] p-1.5",
                    state.isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                  )}
                >
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Export As</div>
                  <div className="space-y-0.5">
                    <button
                      onClick={() => { onDownload('pdf'); setIsDownloadMenuOpen(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center gap-3 transition-colors",
                        state.isDarkMode ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                       <div className="bg-red-500/10 p-1.5 rounded-lg">
                        <Printer size={14} className="text-red-500" />
                       </div>
                       <div>
                         <div className="font-bold">PDF Document</div>
                         <div className="text-[10px] opacity-50">With embedded annotations</div>
                       </div>
                    </button>
                    <button
                      onClick={() => { onDownload('docx'); setIsDownloadMenuOpen(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center gap-3 transition-colors",
                        state.isDarkMode ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                       <div className="bg-blue-500/10 p-1.5 rounded-lg">
                        <FileUp size={14} className="text-blue-500" />
                       </div>
                       <div>
                         <div className="font-bold">Word (DOCX)</div>
                         <div className="text-[10px] opacity-50">Annotation summary</div>
                       </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {searchEnabled && <button onClick={onSearchToggle} className={cn("p-2 rounded hover:bg-slate-100", state.isDarkMode ? "hover:bg-slate-700 text-slate-400" : "text-slate-500")} title="Search"><Search size={18} /></button>}
        </div>

        {allowUpload && (
          <button 
            onClick={onUpload}
            className="hidden 2xl:flex bg-blue-600 hover:bg-blue-500 text-white px-3 md:px-4 py-1.5 rounded text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-95 items-center gap-2"
          >
            <Upload size={14} />
            <span className="hidden xl:inline">Upload PDF</span>
          </button>
        )}


        {/* More Actions Dropdown (Dynamic Content) */}
        <div className="relative shrink-0" ref={moreMenuRef}>
          <button 
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={cn(
              "w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full transition-all",
              state.isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200"
            )}
            title="Show more tools"
          >
            <MoreHorizontal size={20} />
          </button>

          <AnimatePresence>
            {isMoreMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10, x: 0 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10, x: 0 }}
                className={cn(
                  "absolute top-full right-0 mt-2 w-64 border rounded-2xl shadow-2xl z-[100] p-1.5 max-h-[80vh] overflow-y-auto custom-scrollbar",
                  state.isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                )}
              >
                  {/* Tools Section (Hidden on lg) */}
                <div className="lg:hidden">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Annotation Tools</div>
                  <div className="grid grid-cols-5 gap-1 p-1">
                    {[...tools, ...shapeTools].map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => { onStateChange({ activeTool: tool.id as any }); setIsMoreMenuOpen(false); }}
                        className={cn(
                          "aspect-square flex items-center justify-center rounded-lg transition-all",
                          state.activeTool === tool.id 
                            ? (state.isDarkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white") 
                            : (state.isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-50")
                        )}
                        title={tool.label}
                      >
                        <tool.icon size={16} />
                      </button>
                    ))}
                  </div>

                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Highlight Color</span>
                    <div className="flex items-center gap-2">
                      {['#facc15', '#fbbf24', '#f87171', '#4ade80', '#60a5fa'].map((c) => (
                        <button
                          key={c}
                          onClick={() => onStateChange({ highlightColor: c })}
                          className={cn(
                            "w-5 h-5 rounded-full border-2 transition-all",
                            state.highlightColor === c 
                              ? (state.isDarkMode ? "border-white scale-110" : "border-slate-900 scale-110") 
                              : "border-transparent"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <div className={cn("h-4 w-[1px] mx-1", state.isDarkMode ? "bg-slate-700" : "bg-slate-300")} />
                      <button
                        onClick={() => colorInputRef.current?.click()}
                        className={cn(
                          "w-5 h-5 rounded-full border relative flex items-center justify-center overflow-hidden",
                          state.isDarkMode ? "border-slate-600" : "border-slate-200"
                        )}
                        style={{ backgroundColor: state.highlightColor }}
                      >
                        <Palette size={10} className={state.isDarkMode ? "text-white" : "text-black"} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 p-1 mt-1">
                    <button
                      onClick={() => { onUndo?.(); setIsMoreMenuOpen(false); }}
                      disabled={!canUndo}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-30",
                        state.isDarkMode ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-500 hover:text-slate-900"
                      )}
                    >
                      <Undo size={14} /> Undo
                    </button>
                    <button
                      onClick={() => { onRedo?.(); setIsMoreMenuOpen(false); }}
                      disabled={!canRedo}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-30",
                        state.isDarkMode ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-500 hover:text-slate-900"
                      )}
                    >
                      <Redo size={14} /> Redo
                    </button>
                  </div>
                  <div className="h-px bg-slate-700/50 my-2 mx-2" />
                </div>

                {/* Main Actions */}
                <div className="space-y-0.5">
                  <button 
                    onClick={() => { onStateChange({ zoom: Math.min(5, state.zoom + 0.25), zoomMode: 'custom' }); setIsMoreMenuOpen(false); }}
                    className={cn("w-full lg:hidden text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3", state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")}
                  >
                    <ZoomIn size={16} className="text-blue-500" /> Zoom In
                  </button>
                  <button 
                    onClick={() => { onStateChange({ zoom: Math.max(0.2, state.zoom - 0.25), zoomMode: 'custom' }); setIsMoreMenuOpen(false); }}
                    className={cn("w-full lg:hidden text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3", state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")}
                  >
                    <ZoomOut size={16} className="text-blue-500" /> Zoom Out
                  </button>

                  <div className="lg:hidden h-px bg-slate-700/50 my-2 mx-2" />

                  {/* View Modes (Hidden on 2xl) */}
                  <div className="2xl:hidden">
                    <button 
                      onClick={() => { onStateChange({ viewMode: 'single' }); setIsMoreMenuOpen(false); }}
                      className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3", state.viewMode === 'single' ? "text-blue-500 bg-blue-500/10" : (state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50"))}
                    >
                      <LayoutPanelTop size={16} className="text-blue-500" /> Single Page
                    </button>
                    <button 
                      onClick={() => { onStateChange({ viewMode: 'double' }); setIsMoreMenuOpen(false); }}
                      className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3", state.viewMode === 'double' ? "text-blue-500 bg-blue-500/10" : (state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50"))}
                    >
                      <PanelsTopLeft size={16} className="text-blue-500" /> Two Pages
                    </button>
                    <button 
                      onClick={() => { onStateChange({ viewMode: 'continuous' }); setIsMoreMenuOpen(false); }}
                      className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3", state.viewMode === 'continuous' ? "text-blue-500 bg-blue-500/10" : (state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50"))}
                    >
                      <Layout size={16} className="text-blue-500" /> Continuous View
                    </button>
                    <div className="h-px bg-slate-700/50 my-2 mx-2" />
                  </div>
                  
                  <button 
                    onClick={() => { onStateChange({ rotation: (state.rotation + 90) % 360 }); setIsMoreMenuOpen(false); }}
                    className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3", state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")}
                  >
                    <RotateCw size={16} className="text-blue-500" /> Rotate Page
                  </button>
                  <button 
                    onClick={() => { onToggleFullScreen(); setIsMoreMenuOpen(false); }}
                    className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3", state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")}
                  >
                    <Maximize size={16} className="text-blue-500" /> Fullscreen Mode
                  </button>
                  
                  <button 
                    onClick={() => { onSearchToggle(); setIsMoreMenuOpen(false); }}
                    className={cn("w-full xl:hidden text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3", state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")}
                  >
                    <Search size={16} className="text-blue-500" /> Find in Document
                  </button>

                  <div className="h-px bg-slate-700/50 my-2 mx-2" />
                  
                  <button 
                    onClick={() => { onPrint(); setIsMoreMenuOpen(false); }}
                    className={cn("w-full xl:hidden text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3", state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")}
                  >
                    <Printer size={16} /> Print Document
                  </button>
                  <button 
                    onClick={() => { onDownload('pdf'); setIsMoreMenuOpen(false); }}
                    className={cn("w-full xl:hidden text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3", state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")}
                  >
                    <Download size={16} /> Download PDF
                  </button>
                  <button 
                    onClick={() => { onDownload('docx'); setIsMoreMenuOpen(false); }}
                    className={cn("w-full xl:hidden text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3", state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")}
                  >
                    <FileUp size={16} /> Export to Word
                  </button>
                  <button 
                    onClick={() => { onShowInfo(); setIsMoreMenuOpen(false); }}
                    className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3", state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")}
                  >
                    <Info size={16} /> Document Details
                  </button>

                  <div className="md:hidden h-px bg-slate-700/50 my-2 mx-2" />
                  <button 
                    onClick={() => { onStateChange({ isSidebarOpen: !state.isSidebarOpen }); setIsMoreMenuOpen(false); }}
                    className={cn(
                      "w-full md:hidden text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3",
                      state.isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Sidebar size={16} /> {state.isSidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
                  </button>
                  {!state.isDarkMode ? (
                    <button 
                      onClick={() => { onStateChange({ isDarkMode: true }); setIsMoreMenuOpen(false); }}
                      className="w-full md:hidden text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3 text-slate-600 hover:bg-slate-50"
                    >
                      <Moon size={16} /> Dark Appearance
                    </button>
                  ) : (
                    <button 
                      onClick={() => { onStateChange({ isDarkMode: false }); setIsMoreMenuOpen(false); }}
                      className="w-full md:hidden text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-3 text-slate-300 hover:bg-slate-800"
                    >
                      <Sun size={16} /> Light Appearance
                    </button>
                  )}
                  {allowUpload && (
                    <button 
                      onClick={() => { onUpload(); setIsMoreMenuOpen(false); }}
                      className="w-full 2xl:hidden text-left px-3 py-2 rounded-xl text-xs font-bold text-blue-500 hover:bg-blue-50 flex items-center gap-3"
                    >
                      <Upload size={16} /> Upload New File
                    </button>
                  )}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
