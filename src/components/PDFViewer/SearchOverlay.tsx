import React from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  results: number;
  currentResult: number;
  onNext: () => void;
  onPrev: () => void;
  isDarkMode: boolean;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  onSearch,
  results,
  currentResult,
  onNext,
  onPrev,
  isDarkMode
}) => {
  const [query, setQuery] = React.useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className={cn(
            "fixed top-20 right-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-xl border p-2 flex items-center gap-2 z-50 w-80 backdrop-blur-xl transition-colors duration-300",
            isDarkMode ? "bg-[#1E293B] border-slate-700/50" : "bg-white border-slate-200"
          )}
        >
          <div className={cn(
            "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border",
            isDarkMode ? "bg-slate-800 border-slate-700/50" : "bg-slate-50 border-slate-200"
          )}>
            <Search size={14} className="text-slate-400" />
            <input 
              autoFocus
              type="text" 
              placeholder="Find in manifest..."
              className={cn(
                "bg-transparent border-none outline-none text-[11px] font-medium w-full placeholder:text-slate-500",
                isDarkMode ? "text-slate-200" : "text-slate-900"
              )}
              value={query}
              onChange={handleChange}
            />
            {results > 0 && (
              <span className={cn(
                "text-[9px] font-bold font-mono tracking-tighter whitespace-nowrap px-1.5 py-0.5 rounded",
                isDarkMode ? "text-blue-400 bg-blue-600/10" : "text-blue-600 bg-blue-50"
              )}>
                {currentResult} / {results}
              </span>
            )}
          </div>
          
          <div className={cn("flex items-center border-l px-1", isDarkMode ? "border-slate-700" : "border-slate-200")}>
            <button 
              onClick={onPrev}
              disabled={results === 0}
              className={cn(
                "p-2 rounded disabled:opacity-20 transition-colors",
                isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"
              )}
            >
              <ChevronUp size={16} />
            </button>
            <button 
              onClick={onNext}
              disabled={results === 0}
              className={cn(
                "p-2 rounded disabled:opacity-20 transition-colors",
                isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"
              )}
            >
              <ChevronDown size={16} />
            </button>
            <button 
              onClick={onClose}
              className={cn(
                "p-2 rounded ml-1 transition-colors",
                isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"
              )}
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
