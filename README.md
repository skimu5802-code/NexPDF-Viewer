# NexGen PDF Viewer Pro

A professional, high-performance PDF viewer component for React projects. Built with performance and flexibility in mind.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [PDFViewer Props](#pdfviewer-props)
  - [Methods](#methods)
  - [Events](#events)
- [Examples](#examples)
- [Configuration](#configuration)
- [Styling](#styling)
- [Backend Integration](#backend-integration)
- [Browser Support](#browser-support)
- [Performance Tips](#performance-tips)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- 🚀 **Fast Rendering**: Powered by PDF.js with hardware acceleration
- 🎨 **Annotations**: Professional tools for highlighting, underlining, and notes
- 🌓 **Reader Modes**: Built-in dark mode and high-contrast support
- 📱 **Responsive**: Fully responsive design works on mobile, tablet, and desktop
- 🔍 **Advanced Search**: Full-text search with highlighting across entire documents
- 📂 **Flexible File Handling**: Supports local file uploads and remote URLs
- ⌨️ **Keyboard Navigation**: Complete keyboard shortcuts support
- 💾 **Annotation Persistence**: Export and import annotations in JSON format
- 🎯 **Page Navigation**: Jump to specific pages with multiple navigation options
- 🔐 **PDF Security**: Support for password-protected PDFs

## Installation

### npm

```bash
npm install nexgen-pdf-viewer
```

### yarn

```bash
yarn add nexgen-pdf-viewer
```

### pnpm

```bash
pnpm add nexgen-pdf-viewer
```

## Quick Start

### Basic Usage

```tsx
import { PDFViewer } from 'nexgen-pdf-viewer';

function App() {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <PDFViewer 
        fileUrl="/my-document.pdf"
      />
    </div>
  );
}

export default App;
```

### With Annotations Handler

```tsx
import { PDFViewer } from 'nexgen-pdf-viewer';
import { useState } from 'react';

function App() {
  const [annotations, setAnnotations] = useState([]);

  const handleAnnotationChange = (data) => {
    console.log('Annotation changed:', data);
    setAnnotations(data);
    // Send to your backend
  };

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <PDFViewer 
        fileUrl="/my-document.pdf"
        onAnnotationChange={handleAnnotationChange}
        enableAnnotations={true}
        annotationTools={['highlight', 'underline', 'note']}
      />
    </div>
  );
}

export default App;
```

## API Reference

### PDFViewer Props

#### Core Properties

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fileUrl` | `string` | - | **Required**. URL to the PDF file or local path |
| `fileName` | `string` | `"document.pdf"` | Display name of the PDF file |
| `fileData` | `Uint8Array \| ArrayBuffer` | - | Raw PDF data as an array buffer (alternative to fileUrl) |
| `height` | `string \| number` | `"100vh"` | Height of the viewer container |
| `width` | `string \| number` | `"100%"` | Width of the viewer container |

#### Display Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialPage` | `number` | `1` | Starting page number (1-indexed) |
| `scale` | `number` | `1.0` | Initial zoom level (0.5 to 3.0) |
| `mode` | `'single' \| 'continuous' \| 'book'` | `'continuous'` | Page rendering mode |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Color theme |
| `fitPage` | `'page' \| 'width' \| 'height'` | `'width'` | Initial fit mode |
| `showToolbar` | `boolean` | `true` | Display the toolbar |
| `showSidebar` | `boolean` | `true` | Display the sidebar with thumbnails |
| `showControls` | `boolean` | `true` | Display navigation controls |

#### Annotation Properties

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableAnnotations` | `boolean` | `false` | Enable annotation tools |
| `annotationTools` | `AnnotationTool[]` | `['highlight', 'underline', 'note']` | Available annotation tools |
| `defaultColor` | `string` | `'#FFFF00'` | Default annotation color (hex format) |
| `defaultOpacity` | `number` | `0.3` | Default annotation opacity (0-1) |
| `annotations` | `Annotation[]` | `[]` | Pre-loaded annotations |
| `allowExportAnnotations` | `boolean` | `true` | Allow users to export annotations |

#### Search & Navigation

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableSearch` | `boolean` | `true` | Enable text search functionality |
| `searchHighlightColor` | `string` | `'#FDD835'` | Color for search result highlights |
| `enableBookmarks` | `boolean` | `true` | Enable document bookmarks |
| `onPageChange` | `(page: number) => void` | - | Callback when page changes |

#### Security & Performance

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `password` | `string` | - | Password for encrypted PDFs |
| `enablePrinting` | `boolean` | `true` | Allow users to print the document |
| `enableDownload` | `boolean` | `true` | Allow users to download the PDF |
| `cMapUrl` | `string` | - | URL to PDF.js CMap resources |
| `workerSrc` | `string` | - | URL to PDF.js worker script |

#### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onAnnotationChange` | `(annotations: Annotation[]) => void` | Triggered when annotations are modified |
| `onDocumentLoad` | `(numPages: number) => void` | Triggered when PDF loads successfully |
| `onError` | `(error: Error) => void` | Triggered when an error occurs |
| `onSearch` | `(results: SearchResult[]) => void` | Triggered when search completes |
| `onZoomChange` | `(scale: number) => void` | Triggered when zoom level changes |

### Methods

Use `useRef` to access viewer methods:

```tsx
import { useRef } from 'react';
import { PDFViewer } from 'nexgen-pdf-viewer';

function App() {
  const viewerRef = useRef(null);

  const handleNextPage = () => {
    viewerRef.current?.nextPage();
  };

  const handleZoom = () => {
    viewerRef.current?.setScale(1.5);
  };

  return (
    <>
      <button onClick={handleNextPage}>Next Page</button>
      <button onClick={handleZoom}>Zoom to 150%</button>
      <PDFViewer 
        ref={viewerRef}
        fileUrl="/document.pdf"
      />
    </>
  );
}
```

#### Available Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `nextPage()` | - | `void` | Navigate to next page |
| `previousPage()` | - | `void` | Navigate to previous page |
| `goToPage(page: number)` | `page: number` | `void` | Jump to specific page |
| `setScale(scale: number)` | `scale: number` | `void` | Set zoom level (0.5-3.0) |
| `zoomIn()` | - | `void` | Increase zoom by 10% |
| `zoomOut()` | - | `void` | Decrease zoom by 10% |
| `fitToWidth()` | - | `void` | Fit page to viewport width |
| `fitToHeight()` | - | `void` | Fit page to viewport height |
| `fitToPage()` | - | `void` | Fit entire page in viewport |
| `getAnnotations()` | - | `Annotation[]` | Get all current annotations |
| `addAnnotation(annotation: Annotation)` | `annotation: Annotation` | `void` | Add single annotation |
| `removeAnnotation(id: string)` | `id: string` | `void` | Remove annotation by ID |
| `clearAnnotations()` | - | `void` | Remove all annotations |
| `exportAnnotations(format: 'json' \| 'xfdf')` | `format: 'json' \| 'xfdf'` | `string` | Export annotations |
| `importAnnotations(data: string)` | `data: string` | `void` | Import annotations |
| `search(query: string)` | `query: string` | `SearchResult[]` | Search document |
| `print()` | - | `void` | Open print dialog |
| `download()` | - | `void` | Download the PDF |
| `getPageCount()` | - | `number` | Get total number of pages |
| `getCurrentPage()` | - | `number` | Get current page number |

### Events

```typescript
interface Annotation {
  id: string;
  type: 'highlight' | 'underline' | 'note';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

interface SearchResult {
  page: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

## Examples

### Dark Mode with Custom Colors

```tsx
import { PDFViewer } from 'nexgen-pdf-viewer';

function App() {
  return (
    <PDFViewer 
      fileUrl="/document.pdf"
      theme="dark"
      defaultColor="#4A90E2"
      searchHighlightColor="#FF6B6B"
      enableAnnotations={true}
    />
  );
}
```

### Controlled Component

```tsx
import { PDFViewer } from 'nexgen-pdf-viewer';
import { useState, useRef } from 'react';

function App() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const viewerRef = useRef(null);

  return (
    <div>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => viewerRef.current?.previousPage()}>← Previous</button>
        <span>{currentPage} / {totalPages}</span>
        <button onClick={() => viewerRef.current?.nextPage()}>Next →</button>
      </div>
      <PDFViewer 
        ref={viewerRef}
        fileUrl="/document.pdf"
        onDocumentLoad={setTotalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
```

### With File Upload

```tsx
import { PDFViewer } from 'nexgen-pdf-viewer';
import { useState } from 'react';

function App() {
  const [fileData, setFileData] = useState<Uint8Array | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileData(new Uint8Array(e.target?.result as ArrayBuffer));
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept=".pdf" 
        onChange={handleFileUpload}
      />
      {fileData && (
        <PDFViewer 
          fileData={fileData}
          height="500px"
        />
      )}
    </div>
  );
}
```

### With Annotation Persistence

```tsx
import { PDFViewer } from 'nexgen-pdf-viewer';
import { useRef, useState, useEffect } from 'react';

function App() {
  const viewerRef = useRef(null);
  const [savedAnnotations, setSavedAnnotations] = useState([]);

  useEffect(() => {
    // Load annotations from backend
    fetch('/api/annotations')
      .then(res => res.json())
      .then(data => setSavedAnnotations(data));
  }, []);

  const handleSaveAnnotations = async () => {
    const annotations = viewerRef.current?.getAnnotations();
    await fetch('/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(annotations)
    });
  };

  return (
    <div>
      <button onClick={handleSaveAnnotations}>Save Annotations</button>
      <PDFViewer 
        ref={viewerRef}
        fileUrl="/document.pdf"
        enableAnnotations={true}
        annotations={savedAnnotations}
      />
    </div>
  );
}
```

## Configuration

### Global Configuration

```tsx
import { PDFViewerConfig } from 'nexgen-pdf-viewer';

PDFViewerConfig.set({
  workerSrc: '/pdf.worker.min.js',
  cMapUrl: '/cmaps/',
  enableLogging: true,
  defaultTheme: 'dark'
});
```

### PDF.js Worker Setup

To avoid CORS issues, ensure PDF.js worker is properly configured:

```tsx
import { PDFViewerConfig } from 'nexgen-pdf-viewer';

PDFViewerConfig.set({
  workerSrc: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
});
```

## Styling

### Custom Styling with CSS

```css
/* Override default styles */
.nex-pdf-viewer {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.nex-pdf-toolbar {
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.nex-pdf-page {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nex-annotation-highlight {
  background-color: yellow;
  opacity: 0.3;
}
```

### Tailwind CSS Example

```tsx
<div className="w-full h-screen">
  <PDFViewer 
    fileUrl="/document.pdf"
    className="border rounded-lg shadow-lg"
  />
</div>
```

## Backend Integration

The viewer is designed to work with any backend. It expects simple JSON payloads for annotations.

### Example Backend API

```typescript
// POST /api/annotations - Save annotations
{
  documentId: string;
  annotations: Annotation[];
}

// GET /api/annotations/:documentId - Fetch annotations
Response: Annotation[]

// DELETE /api/annotations/:id - Delete annotation
```

### SQLite Implementation (Included)

The starter includes a SQLite implementation for demonstration:

```bash
npm run setup-db
npm run dev
```

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully Supported |
| Firefox | 88+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| Edge | 90+ | ✅ Fully Supported |
| IE 11 | - | ❌ Not Supported |

## Performance Tips

1. **Lazy Loading**: Use `fileUrl` instead of embedding large PDFs directly
2. **Page Rendering**: Set `mode="single"` for large documents to improve performance
3. **Annotation Debouncing**: Debounce annotation save requests to reduce API calls
4. **Caching**: Implement browser caching for frequently accessed PDFs
5. **Worker Configuration**: Ensure PDF.js worker is on a CDN for optimal performance

```tsx
// Example: Debounced annotation saving
import { useMemo } from 'react';
import { debounce } from 'lodash';

const handleAnnotationChange = useMemo(
  () => debounce((annotations) => {
    saveToBackend(annotations);
  }, 1000),
  []
);
```

## Troubleshooting

### PDF Not Loading

**Problem**: PDF file doesn't load or blank page appears

**Solutions**:
- Check if `fileUrl` is correct
- Verify CORS headers if loading from remote URL
- Check browser console for error messages
- Ensure PDF.js worker is properly configured

### Annotations Not Persisting

**Problem**: Annotations disappear after page reload

**Solutions**:
- Implement `onAnnotationChange` callback
- Save annotations to backend
- Pass saved annotations via `annotations` prop on mount

### Performance Issues

**Problem**: Slow rendering with large PDFs

**Solutions**:
- Use `mode="single"` instead of `"continuous"`
- Increase `workerSrc` timeout
- Enable hardware acceleration in browser
- Reduce initial `scale` value

### CORS Errors

**Problem**: Cross-origin request blocked error

**Solutions**:
```tsx
PDFViewerConfig.set({
  workerSrc: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
});
```

## License

MIT

---

**Questions or Issues?** [Open an issue on GitHub](https://github.com/skimu5802-code/NexPDFViewer/issues)
