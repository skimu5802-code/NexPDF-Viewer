/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import PDFViewer from './components/PDFViewer/PDFViewer';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950">
      <PDFViewer 
        initialZoom={1.1}
        allowUpload={true}
        showToolbar={true}
        showSidebar={true}
        searchEnabled={true}
        onPageChange={(page) => console.log(`Navigated to page: ${page}`)}
      />
    </div>
  );
}
