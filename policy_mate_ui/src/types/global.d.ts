declare module 'react-pdf' {
  import * as React from 'react';

  export interface DocumentProps {
    file?: string | File | ArrayBuffer;
    onLoadSuccess?: (pdf: { numPages: number }) => void;
    onLoadError?: (error: Error) => void;
    loading?: React.ReactNode;
    children?: React.ReactNode;
  }

  export interface PageProps {
    pageNumber: number;
    scale?: number;
    renderTextLayer?: boolean;
    renderAnnotationLayer?: boolean;
    loading?: React.ReactNode;
  }

  export const Document: React.FC<DocumentProps>;
  export const Page: React.FC<PageProps>;

  // optional pdfjs export for worker configuration
  export const pdfjs: {
    GlobalWorkerOptions: { workerSrc: string };
  };
}
