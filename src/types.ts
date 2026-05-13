export type AnnotationType = 'highlight' | 'underline' | 'note' | 'strikeout' | 'box' | 'circle' | 'draw';

export interface Annotation {
  id: string;
  page: number;
  type: AnnotationType;
  color: string;
  rects: { x: number; y: number; w: number; h: number }[];
  path?: { x: number; y: number }[]; // For freehand drawing
  lineWidth?: number; // For draw tool
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
  annotationsEnabled?: boolean;
  zoomEnabled?: boolean;
  rotateEnabled?: boolean;
  printEnabled?: boolean;
  downloadEnabled?: boolean;
  theme?: PDFViewerTheme;
  externalAnnotations?: Annotation[];
  annotationsApiUrl?: string;
  annotationLoader?: (fileId: string) => Promise<Annotation[]>;
  onAnnotationChange?: (annotations: Annotation[]) => void;
  onPageChange?: (page: number) => void;
  onLoadSuccess?: (numPages: number) => void;
  onDocumentLoad?: (numPages: number) => void;
  height?: string | number;
  width?: string | number;
  fitPage?: 'width' | 'page';
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
  drawLineWidth: number;
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
  drawLineWidth: 2,
  fileData: null,
};
