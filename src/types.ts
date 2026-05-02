export type AnnotationType = 'highlight' | 'underline' | 'note' | 'strikeout' | 'box' | 'circle' | 'draw';

export interface Annotation {
  id: string;
  page: number;
  type: AnnotationType;
  color: string;
  rects: { x: number; y: number; w: number; h: number }[];
  path?: { x: number; y: number }[]; // For freehand drawing
  text?: string;
  content?: string;
  author: string;
  createdAt: number;
}

export interface PDFViewerTheme {
  primary?: string;
  accent?: string;
  sidebarBg?: string;
  toolbarBg?: string;
}

export interface PDFViewerProps {
  fileUrl?: string;
  initialPage?: number;
  initialZoom?: number;
  allowUpload?: boolean;
  showToolbar?: boolean;
  showSidebar?: boolean;
  searchEnabled?: boolean;
  theme?: PDFViewerTheme;
  externalAnnotations?: Annotation[];
  onAnnotationChange?: (annotations: Annotation[]) => void;
  onPageChange?: (page: number) => void;
  onLoadSuccess?: (numPages: number) => void;
  className?: string;
}

export interface PDFState {
  currentPage: number;
  numPages: number;
  zoom: number;
  rotation: number;
  fileName: string | null;
  activeTool: 'view' | 'note' | 'highlight' | 'underline' | 'hand' | 'box' | 'circle' | 'draw';
  isSidebarOpen: boolean;
  isDarkMode: boolean;
  viewMode: 'single' | 'double' | 'continuous';
  zoomMode: 'custom' | 'fit-page' | 'fit-width';
  highlightColor: string;
  fileData: ArrayBuffer | null;
}

export const INITIAL_STATE: PDFState = {
  currentPage: 1,
  numPages: 0,
  zoom: 1.0,
  rotation: 0,
  fileName: null,
  activeTool: 'view',
  isSidebarOpen: true,
  isDarkMode: true,
  viewMode: 'continuous',
  zoomMode: 'custom',
  highlightColor: '#fbbf24', // Default amber-400
  fileData: null,
};
