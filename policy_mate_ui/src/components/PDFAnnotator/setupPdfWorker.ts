// components/PDFAnnotator/setupPdfWorker.ts
'use client';

import { pdfjs } from 'react-pdf';
import 'pdfjs-dist/build/pdf.worker.min.mjs'; // ensures bundling by Turbopack

export const setupPdfWorker = () => {
  if (typeof window === 'undefined') return;

  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
};
