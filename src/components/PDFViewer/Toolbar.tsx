import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, ZoomOut, RotateCw, Sidebar, 
  Search, Sun, Moon, Download, Upload,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Maximize, MousePointer2, Type, Highlighter, Underline as UnderlineIcon,
  Printer, Info, Hand, Layout, LayoutPanelTop, PanelsTopLeft, ChevronDown
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
  onDownload: () => void;
  onShowInfo: () => void;
  allowUpload?: boolean;
  searchEnabled?: boolean;
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
  searchEnabled = true
}) => {
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const zoomMenuRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tools = [
    { id: 'view', icon: MousePointer2, label: 'Select' },
    { id: 'hand', icon: Hand, label: 'Hand' },
    { id: 'note', icon: Type, label: 'Note' },
    { id: 'highlight', icon: Highlighter, label: 'Highlight' },
    { id: 'underline', icon: UnderlineIcon, label: 'Underline' },
  ];

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
      "h-14 border-b flex items-center justify-between px-6 sticky top-0 z-50 transition-colors duration-300 overflow-x-auto no-scrollbar",
      state.isDarkMode ? "bg-[#1E293B] border-slate-700/50" : "bg-white border-slate-200 shadow-sm"
    )}>
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">N</div>
          <span className={cn(
            "font-semibold tracking-tight hidden sm:inline",
            state.isDarkMode ? "text-white" : "text-slate-900"
          )}>
            NexusPDF <span className="text-[10px] text-slate-400 font-mono ml-1">v2.5.0</span>
          </span>
        </div>
        
        <div className={cn("h-6 w-[1px] mx-2", state.isDarkMode ? "bg-slate-700/50" : "bg-slate-200")} />
        
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
                : (state.isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500")
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

      <div className={cn(
        "flex items-center gap-1 p-1 rounded-lg border shrink-0 mx-4",
        state.isDarkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-100 border-slate-200"
      )}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onStateChange({ activeTool: tool.id as any })}
            className={cn(
              "px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-2",
              state.activeTool === tool.id 
                ? (state.isDarkMode ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner" : "bg-white text-blue-600 border border-blue-200 shadow-sm") 
                : (state.isDarkMode ? "text-slate-400 hover:bg-slate-700/50" : "text-slate-500 hover:bg-white/50")
            )}
            title={tool.label}
          >
            <tool.icon size={14} />
            <span className="hidden lg:inline">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className={cn(
          "hidden md:flex items-center gap-0.5 rounded p-1 border transition-colors",
          state.isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
        )}>
          <button 
            onClick={() => onPageNavigation(1)}
            disabled={state.currentPage <= 1}
            className={cn(
              "p-1 rounded disabled:opacity-20 transition-all",
              state.isDarkMode ? "hover:bg-slate-700 hover:text-white" : "hover:bg-white hover:text-slate-900"
            )}
            title="First Page"
          >
            <ChevronsLeft size={16} />
          </button>
          <button 
            onClick={() => onPageNavigation(Math.max(1, state.currentPage - 1))}
            disabled={state.currentPage <= 1}
            className={cn(
              "p-1 rounded disabled:opacity-20 transition-all",
              state.isDarkMode ? "hover:bg-slate-700 hover:text-white" : "hover:bg-white hover:text-slate-900"
            )}
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex items-center px-2 min-w-[80px] justify-center">
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
                "border rounded text-[10px] font-mono text-center w-8 py-0.5",
                state.isDarkMode ? "bg-slate-900 border-slate-700 text-blue-400" : "bg-white border-slate-200 text-blue-600"
              )}
             />
             <span className="text-[10px] font-mono px-1 opacity-50">/</span>
             <span className="text-[10px] font-mono opacity-50">{state.numPages || '--'}</span>
          </div>

          <button 
            onClick={() => onPageNavigation(Math.min(state.numPages, state.currentPage + 1))}
            disabled={state.currentPage >= state.numPages}
            className={cn(
              "p-1 rounded disabled:opacity-20 transition-all",
              state.isDarkMode ? "hover:bg-slate-700 hover:text-white" : "hover:bg-white hover:text-slate-900"
            )}
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
          <button 
            onClick={() => onPageNavigation(state.numPages)}
            disabled={state.currentPage >= state.numPages}
            className={cn(
              "p-1 rounded disabled:opacity-20 transition-all",
              state.isDarkMode ? "hover:bg-slate-700 hover:text-white" : "hover:bg-white hover:text-slate-900"
            )}
            title="Last Page"
          >
            <ChevronsRight size={16} />
          </button>
        </div>

        <div className={cn("h-6 w-[1px] mx-1 hidden sm:block", state.isDarkMode ? "bg-slate-700/50" : "bg-slate-200")} />

        <div className={cn(
          "flex items-center gap-1 p-1 rounded border",
          state.isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200 transition-colors"
        )}>
          <button 
            onClick={() => onStateChange({ zoom: Math.max(0.2, state.zoom - 0.1), zoomMode: 'custom' })}
            className={cn(
              "p-1.5 rounded transition-colors",
              state.isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm"
            )}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          
          <div className="relative" ref={zoomMenuRef}>
            <button 
              onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
              className={cn(
                "px-2 py-1 flex items-center gap-1 text-[10px] font-mono rounded transition-colors min-w-[70px] justify-between",
                state.isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-slate-700 hover:bg-white shadow-sm"
              )}
            >
              <span>{currentZoomLabel}</span>
              <ChevronDown size={12} className={cn("transition-transform duration-200", isZoomMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isZoomMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className={cn(
                    "absolute top-full left-1/2 -translate-x-1/2 mt-2 w-32 border rounded-xl shadow-2xl overflow-hidden z-[60]",
                    state.isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                  )}
                >
                  <div className="p-1.5 space-y-0.5">
                    {zoomOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          handleZoomChange(opt.value);
                          setIsZoomMenuOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-mono transition-colors flex items-center justify-between group",
                          (state.zoomMode !== 'custom' ? opt.value === state.zoomMode : opt.value === state.zoom.toString())
                            ? (state.isDarkMode ? "bg-blue-600/20 text-blue-400" : "bg-blue-50 text-blue-600")
                            : (state.isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")
                        )}
                      >
                        {opt.label}
                        {(state.zoomMode !== 'custom' ? opt.value === state.zoomMode : opt.value === state.zoom.toString()) && (
                          <div className={cn("w-1 h-1 rounded-full", state.isDarkMode ? "bg-blue-400" : "bg-blue-600")} />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => onStateChange({ zoom: Math.min(5, state.zoom + 0.1), zoomMode: 'custom' })}
            className={cn(
              "p-1.5 rounded transition-colors",
              state.isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm"
            )}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        <div className={cn("h-6 w-[1px] mx-1 hidden lg:block", state.isDarkMode ? "bg-slate-700/50" : "bg-slate-200")} />

        <div className={cn(
          "flex items-center gap-1 p-1 rounded border",
          state.isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200 transition-colors"
        )}>
          <button 
            onClick={() => onStateChange({ viewMode: 'single' })}
            className={cn(
              "p-1.5 rounded transition-all",
              state.viewMode === 'single' 
                ? (state.isDarkMode ? "bg-slate-700 text-blue-400" : "bg-white text-blue-600 shadow-sm") 
                : (state.isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
            )}
            title="Single Page"
          >
            <LayoutPanelTop size={16} />
          </button>
          <button 
            onClick={() => onStateChange({ viewMode: 'double' })}
            className={cn(
              "p-1.5 rounded transition-all",
              state.viewMode === 'double' 
                ? (state.isDarkMode ? "bg-slate-700 text-blue-400" : "bg-white text-blue-600 shadow-sm") 
                : (state.isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
            )}
            title="Two Pages"
          >
            <PanelsTopLeft size={16} />
          </button>
          <button 
            onClick={() => onStateChange({ viewMode: 'continuous' })}
            className={cn(
              "p-1.5 rounded transition-all",
              state.viewMode === 'continuous' 
                ? (state.isDarkMode ? "bg-slate-700 text-blue-400" : "bg-white text-blue-600 shadow-sm") 
                : (state.isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")
            )}
            title="Continuous"
          >
            <Layout size={16} />
          </button>
        </div>

        <div className={cn("h-6 w-[1px] mx-1 hidden lg:block", state.isDarkMode ? "bg-slate-700/50" : "bg-slate-200")} />

        <div className="flex items-center gap-1">
          <button 
            onClick={() => onStateChange({ rotation: (state.rotation + 90) % 360 })}
            className={cn(
              "p-2 rounded transition-all",
              state.isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
            title="Rotate"
          >
            <RotateCw size={18} />
          </button>
          <button 
            onClick={onPrint}
            className={cn(
              "p-2 rounded transition-all",
              state.isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
            title="Print"
          >
            <Printer size={18} />
          </button>
          <button 
            onClick={onDownload}
            className={cn(
              "p-2 rounded transition-all",
              state.isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
            title="Download"
          >
            <Download size={18} />
          </button>
          <button 
            onClick={onShowInfo}
            className={cn(
              "p-2 rounded transition-all",
              state.isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
            title="Document Properties"
          >
            <Info size={18} />
          </button>
          <button 
            onClick={onToggleFullScreen}
            className={cn(
              "p-2 rounded transition-all",
              state.isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
            title="Fullscreen"
          >
            <Maximize size={18} />
          </button>
          {searchEnabled && (
            <button 
              onClick={onSearchToggle}
              className={cn(
                "p-2 rounded transition-all",
                state.isDarkMode ? "text-slate-400 hover:bg-slate-700 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
              title="Search"
            >
              <Search size={18} />
            </button>
          )}
          
          {allowUpload && (
            <button 
              onClick={onUpload}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2 ml-2"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Upload</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
