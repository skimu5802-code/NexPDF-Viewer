import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, MessageSquare, Search, 
  History, Settings, List, ChevronRight, ChevronDown, Paperclip, Download as DownloadIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PDFState, Annotation } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  pdfDoc: any;
  state: PDFState;
  annotations: Annotation[];
  history: { id: string; timestamp: number; name: string }[];
  onPageSelect: (page: number) => void;
  onCloudSync: (service: 'drive' | 'dropbox') => void;
}

interface OutlineItem {
  title: string;
  bold: boolean;
  italic: boolean;
  color: number[] | null;
  dest: any;
  url: string | null;
  items: OutlineItem[];
}

interface AttachmentItem {
  filename: string;
  content: Uint8Array;
}

const OutlineRenderer: React.FC<{ 
  items: OutlineItem[]; 
  pdfDoc: any; 
  onSelect: (dest: any) => void;
  state: PDFState;
  level?: number;
}> = ({ items, pdfDoc, onSelect, state, level = 0 }) => {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const toggle = (title: string) => {
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <ul className={cn("space-y-1", level > 0 && "ml-4 mt-1 border-l pl-2", state.isDarkMode ? "border-slate-700/50" : "border-slate-200")}>
      {items.map((item, idx) => (
        <li key={`${item.title}-${idx}`}>
          <div className="flex items-center gap-1 group">
            {item.items.length > 0 && (
              <button 
                onClick={() => toggle(item.title)}
                className={cn(
                  "p-1 rounded transition-colors",
                  state.isDarkMode ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400"
                )}
              >
                {expanded[item.title] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
            <button 
              onClick={() => onSelect(item.dest)}
              className={cn(
                "flex-1 text-left py-1 text-[11px] transition-colors truncate",
                state.isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900",
                item.bold && "font-bold",
                item.italic && "italic"
              )}
            >
              {item.title}
            </button>
          </div>
          {item.items.length > 0 && expanded[item.title] && (
            <OutlineRenderer items={item.items} pdfDoc={pdfDoc} onSelect={onSelect} state={state} level={level + 1} />
          )}
        </li>
      ))}
    </ul>
  );
};

interface ThumbnailProps {
  pdfDoc: any;
  pageNum: number;
  isActive: boolean;
  state: PDFState;
}

const PDFThumbnail: React.FC<ThumbnailProps> = ({ pdfDoc, pageNum, isActive, state }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    let isMounted = true;
    const renderThumbnail = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.2 });
        
        if (canvasRef.current && isMounted) {
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;
          }
        }
      } catch (err) {
        console.error('Thumbnail render error:', err);
      }
    };

    if (pdfDoc) renderThumbnail();
    return () => { isMounted = false; };
  }, [pdfDoc, pageNum]);

  return (
    <div className={cn(
      "aspect-[3/4] rounded border transition-all shadow-md group-hover:scale-[1.02] flex items-center justify-center overflow-hidden",
      state.isDarkMode ? "bg-slate-800" : "bg-white",
      isActive 
        ? (state.isDarkMode ? "border-blue-500 shadow-lg shadow-blue-500/20 bg-white" : "border-blue-500 shadow-lg shadow-blue-200 bg-white") 
        : (state.isDarkMode ? "border-slate-700/50 opacity-60" : "border-slate-200 opacity-80")
    )}>
      <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  pdfDoc, 
  state,
  annotations,
  history,
  onPageSelect,
  onCloudSync
}) => {
  const [activeTab, setActiveTab] = React.useState<'thumbnails' | 'outline' | 'attachments' | 'annotations' | 'history' | 'cloud'>('thumbnails');
  const [outline, setOutline] = React.useState<OutlineItem[]>([]);
  const [attachments, setAttachments] = React.useState<AttachmentItem[]>([]);

  React.useEffect(() => {
    const fetchOutline = async () => {
      if (pdfDoc) {
        try {
          const docOutline = await pdfDoc.getOutline();
          setOutline(docOutline || []);
          
          const docAttachments = await pdfDoc.getAttachments();
          const attachmentList: AttachmentItem[] = [];
          if (docAttachments) {
            Object.keys(docAttachments).forEach(key => {
              attachmentList.push({
                filename: docAttachments[key].filename,
                content: docAttachments[key].content
              });
            });
          }
          setAttachments(attachmentList);
        } catch (err) {
          console.error("Error fetching sidebar data:", err);
        }
      }
    };
    fetchOutline();
  }, [pdfDoc]);

  const handleOutlineSelect = async (dest: any) => {
    if (!dest) return;
    try {
      let pageNum: number | null = null;
      if (typeof dest === 'string') {
        const pageIndex = await pdfDoc.getPageIndex(await pdfDoc.getDestination(dest));
        pageNum = pageIndex + 1;
      } else if (Array.isArray(dest)) {
        const pageIndex = await pdfDoc.getPageIndex(dest[0]);
        pageNum = pageIndex + 1;
      }
      if (pageNum) {
        onPageSelect(pageNum);
      }
    } catch (err) {
      console.error("Error navigating from outline:", err);
    }
  };

  const handleAttachmentDownload = (att: AttachmentItem) => {
    const blob = new Blob([att.content]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = att.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -256 }}
          animate={{ x: 0 }}
          exit={{ x: -256 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={cn(
            "w-56 h-full border-r flex flex-col z-40 fixed left-0 shadow-2xl transition-colors duration-300",
            state.isDarkMode ? "bg-slate-900 border-slate-700/50" : "bg-white border-slate-200"
          )}
        >
          <div className={cn(
            "flex border-b overflow-x-auto custom-scrollbar no-scrollbar transition-colors duration-300",
            state.isDarkMode ? "bg-[#1E293B] border-slate-700/50" : "bg-slate-50 border-slate-200"
          )}>
            {[
              { id: 'thumbnails', icon: Layers, label: 'Pages' },
              { id: 'outline', icon: List, label: 'Outline' },
              { id: 'attachments', icon: Paperclip, label: 'Files' },
              { id: 'annotations', icon: MessageSquare, label: 'Notes' },
              { id: 'history', icon: History, label: 'History' },
              { id: 'cloud', icon: Settings, label: 'Sync' }
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={cn(
                  "min-w-[60px] flex-1 py-3 flex flex-col items-center gap-1 transition-all relative",
                  activeTab === id 
                    ? "text-blue-500" 
                    : (state.isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-900")
                )}
              >
                <Icon size={14} />
                <span className="text-[8px] font-bold uppercase tracking-tighter">{label}</span>
                {activeTab === id && (
                  <motion.div 
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'thumbnails' && (
              <div className="space-y-6">
                {Array.from({ length: state.numPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => onPageSelect(pageNum)}
                    className="w-full group"
                  >
                    <PDFThumbnail 
                      pdfDoc={pdfDoc} 
                      pageNum={pageNum} 
                      isActive={state.currentPage === pageNum} 
                      state={state}
                    />
                    <span className={cn(
                      "block text-center mt-2 text-[10px] font-bold tracking-tight",
                      state.currentPage === pageNum ? "text-blue-500" : (state.isDarkMode ? "text-slate-500" : "text-slate-400")
                    )}>
                      Page {pageNum}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'outline' && (
              <div className="space-y-2">
                {outline.length === 0 ? (
                  <div className="text-center py-12">
                    <List size={24} className="mx-auto text-slate-700 mb-2 opacity-50" />
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">No Outline</p>
                  </div>
                ) : (
                  <OutlineRenderer items={outline} pdfDoc={pdfDoc} onSelect={handleOutlineSelect} state={state} />
                )}
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="space-y-2">
                {attachments.length === 0 ? (
                  <div className="text-center py-12">
                    <Paperclip size={24} className="mx-auto text-slate-700 mb-2 opacity-50" />
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">No Attachments</p>
                  </div>
                ) : (
                  attachments.map((att, idx) => (
                    <div key={idx} className={cn(
                      "flex items-center justify-between p-2 rounded-lg border group transition-colors",
                      state.isDarkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-200"
                    )}>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip size={12} className="text-slate-500 shrink-0" />
                        <span className={cn("text-[11px] truncate", state.isDarkMode ? "text-slate-300" : "text-slate-600")}>{att.filename}</span>
                      </div>
                      <button 
                        onClick={() => handleAttachmentDownload(att)}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          state.isDarkMode ? "hover:bg-slate-700 text-slate-400 hover:text-blue-400" : "hover:bg-white text-slate-400 hover:text-blue-600 shadow-sm"
                        )}
                        title="Download Attachment"
                      >
                        <DownloadIcon size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'annotations' && (
              <div className="space-y-3">
                {annotations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare size={24} className={cn("mx-auto mb-2 opacity-50", state.isDarkMode ? "text-slate-700" : "text-slate-200")} />
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Empty</p>
                  </div>
                ) : (
                  annotations.map((ann) => (
                    <div key={ann.id} className={cn(
                      "p-3 rounded-lg border shadow-sm transition-colors",
                      state.isDarkMode ? "bg-slate-800/80 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                    )}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-bold text-blue-500 uppercase">Page {ann.page}</span>
                        <span className="text-[8px] text-slate-400">{new Date(ann.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed font-medium">{ann.content}</p>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {activeTab === 'history' && (
              <div className="space-y-4">
                {history.map((entry) => (
                  <div key={entry.id} className={cn(
                    "flex gap-3 items-start border-l-2 pl-4 py-0.5 transition-colors",
                    state.isDarkMode ? "border-slate-700" : "border-slate-200"
                  )}>
                    <div className="flex-1">
                      <p className={cn("text-[11px] font-medium", state.isDarkMode ? "text-slate-300" : "text-slate-700")}>{entry.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono tracking-tighter">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {activeTab === 'cloud' && (
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-xl border transition-colors",
                  state.isDarkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-200"
                )}>
                  <h4 className="text-[10px] font-bold text-blue-500 mb-3 uppercase tracking-widest">Persistence</h4>
                  <div className="space-y-2">
                    <button 
                      onClick={() => onCloudSync('drive')}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-lg border transition-all group",
                        state.isDarkMode ? "bg-slate-800 hover:bg-slate-700 border-slate-700" : "bg-white hover:bg-blue-50 border-slate-200"
                      )}
                    >
                      <span className={cn("text-[11px] font-semibold", state.isDarkMode ? "text-slate-300" : "text-slate-700")}>Google Drive</span>
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full group-hover:scale-125 transition-transform" />
                    </button>
                    <button 
                      onClick={() => onCloudSync('dropbox')}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-lg border transition-all",
                        state.isDarkMode ? "bg-slate-800 hover:bg-slate-700 border-slate-700" : "bg-white hover:bg-blue-50 border-slate-200"
                      )}
                    >
                      <span className={cn("text-[11px] font-semibold", state.isDarkMode ? "text-slate-300" : "text-slate-700")}>Dropbox</span>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
