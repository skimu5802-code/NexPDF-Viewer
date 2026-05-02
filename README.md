# NexGen PDF Viewer Pro

A professional, high-performance PDF viewer component for React projects. Built with performance and flexibility in mind.

## Features

- 🚀 **Fast Rendering**: Powered by PDF.js with hardware acceleration.
- 🎨 **Annotations**: Professional tools for highlighting and notes.
- 🌓 **Reader Modes**: Built-in dark mode and high-contrast support.
- 📱 **Responsive**: Works perfectly on mobile, tablet, and desktop.
- 🔍 **Search**: Advanced text search within full documents.
- 📂 **Flexible**: Supports local file uploads or remote URLs.

## Installation

```bash
npm install nexgen-pdf-viewer
```

## Basic Usage

```tsx
import { PDFViewer } from 'nexgen-pdf-viewer';

function App() {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <PDFViewer 
        fileUrl="/my-document.pdf"
        onAnnotationChange={(data) => console.log(data)}
      />
    </div>
  );
}
```

## Backend Integration
The viewer is designed to work with any backend. It expects simple JSON payloads for annotations. By default, this starter includes a SQLite implementation for demonstration.

## License

MIT

