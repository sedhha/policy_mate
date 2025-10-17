// components/PDFAnnotator/pdfWorker.ts
import { pdfjs } from 'react-pdf';

export const setupPdfWorker = () => {
  try {
    // modern
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - pdfjs types don’t declare .mjs
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  } catch {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  }
};
