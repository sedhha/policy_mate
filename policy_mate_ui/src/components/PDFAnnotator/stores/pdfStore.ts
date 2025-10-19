// stores/pdfStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Comment,
  HighlightStyle,
  SimpleAnnotation,
  NewAnnotationInput,
} from '@/components/PDFAnnotator/types';
import { useAuthStore } from '@/stores/authStore';

interface AnnotationsApiResponse {
  annotations: SimpleAnnotation[];
  metadata: {
    framework: string;
    compliance_score: number;
    verdict: string;
    summary: string;
    cached: boolean;
  };
}

interface PDFState {
  pdfLoadErrror?: string;
  isLoading: boolean;
  numPages: number;
  currentPage: number;
  sessionId: string; // Analysis session id (owner)
  scale: number;
  highlightStyle: HighlightStyle;
  annotations: SimpleAnnotation[];

  commentConversation: Comment[];
  chatLoading?: boolean;
  chatError?: string;
  chatSessionByAnnotation: Record<string, string | undefined>;

  openCommentForId?: string;
  openBookmarkForId?: string;
  openCreationForId?: string;
  expandedChipForId?: string;
  uiActionByAnnotation: Record<string, 'comment' | 'bookmark' | undefined>;
  maxPageCovered: number;

  // actions
  setPdfLoadError: (error?: string) => void;
  setNumPages: (num: number) => void;
  setSessionId: (sessionId: string) => void;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;
  fetchPdf: (fileId: string, fileNameFallback?: string) => Promise<File>;
  setHighlightStyle: (style: HighlightStyle) => void;
  setAnnotations: (annotations: SimpleAnnotation[]) => void;
  setOpenCommentForId: (id?: string) => void;
  setOpenBookmarkForId: (id?: string) => void;
  setOpenCreationForId: (id?: string) => void;
  setExpandedChipForId: (id?: string) => void;
  setUiActionFor: (id: string, v?: 'comment' | 'bookmark') => void;

  // NOTE: now async and returns server id
  addAnnotation: (annotation: NewAnnotationInput) => Promise<string>;

  updateAnnotation: (
    id: string,
    updated: Partial<SimpleAnnotation>
  ) => Promise<void>;

  // NOTE: now async (hits backend)
  removeAnnotation: (id: string) => Promise<void>;

  setCommentConversation: (comments: Comment[]) => void;
  updateAnnotationComments: (id: string, comments: Comment[]) => void;
  loadAnnotations: (sessionId: string) => Promise<void>;

  loadAnnotationChat: (
    ann: SimpleAnnotation,
    opts?: { sessionId?: string; limit?: number }
  ) => Promise<void>;
  sendAnnotationMessage: (
    ann: SimpleAnnotation,
    text: string,
    opts?: { sessionId?: string; includeReference?: boolean }
  ) => Promise<void>;
}

export const usePDFStore = create<PDFState>()(
  devtools((set, get) => ({
    pdfLoadErrror: undefined,
    isLoading: false,
    numPages: 0,
    currentPage: 1,
    maxPageCovered: 0,
    scale: 1.0,
    sessionId: '', // analysis session id
    highlightStyle: 'classic',
    annotations: [],
    commentConversation: [],
    chatSessionByAnnotation: {},

    setPdfLoadError: (error?: string) => set({ pdfLoadErrror: error }),
    setNumPages: (num: number) => set({ numPages: num }),
    setSessionId: (sessionId: string) => set({ sessionId }),
    setCurrentPage: (page: number) =>
      set({
        currentPage: page,
        maxPageCovered: Math.max(page, get().maxPageCovered),
      }),
    setScale: (scale: number) => set({ scale }),
    setHighlightStyle: (style: HighlightStyle) =>
      set({ highlightStyle: style }),
    setAnnotations: (annotations: SimpleAnnotation[]) => set({ annotations }),
    setOpenCommentForId: (id?: string) => set({ openCommentForId: id }),
    setOpenBookmarkForId: (id?: string) => set({ openBookmarkForId: id }),
    setOpenCreationForId: (id?: string) => set({ openCreationForId: id }),
    setExpandedChipForId: (id?: string) => set({ expandedChipForId: id }),
    setUiActionFor: (id: string, v?: 'comment' | 'bookmark') =>
      set((state) => ({
        uiActionByAnnotation: { ...state.uiActionByAnnotation, [id]: v },
      })),

    // ---------- CREATE (server authority) ----------
    addAnnotation: async (annotation) => {
      console.log('Adding annotation:', annotation);
    },

    setCommentConversation: (comments: Comment[]) =>
      set({ commentConversation: comments }),

    updateAnnotation: async (
      id: string,
      updated: Partial<SimpleAnnotation>
    ) => {
      set((state) => ({
        annotations: state.annotations.map((ann) =>
          ann.id === id ? { ...ann, ...updated } : ann
        ),
      }));
    },

    updateAnnotationComments: (id: string, comments: Comment[]) =>
      set((state) => ({
        annotations: state.annotations.map((ann) =>
          ann.id === id ? { ...ann, comments } : ann
        ),
        commentConversation:
          state.openCommentForId === id ? comments : state.commentConversation,
      })),

    // ---------- DELETE (server authority) ----------
    removeAnnotation: async (id: string) => {
      set((state) => ({
        annotations: state.annotations.filter((ann) => ann.id !== id),
      }));
    },

    fetchPdf: async (
      analysisId: string,
      fileNameFallback = 'document.pdf'
    ): Promise<File> => {
      // fetch sample_compliance_document.pdf hardcoded from public directory
      const blob = await fetch(`/sample_compliance_document.pdf`).then((res) =>
        res.blob()
      );
      const name = fileNameFallback.toLowerCase().endsWith('.pdf')
        ? fileNameFallback
        : `${fileNameFallback}.pdf`;
      const type = blob.type || 'application/pdf';
      return new File([blob], name, { type });
    },
    loadAnnotations: async (documentId: string) => {
      try {
        set({ isLoading: true, pdfLoadErrror: undefined });
        // Get ID token from authStore
        const idToken = useAuthStore.getState().idToken;
        if (!idToken) {
          throw new Error('User is not authenticated');
        }

        // Fetch annotations from backend (already transformed to frontend format)
        const response = await fetch(`/api/annotations/${documentId}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          console.error(`Failed to load annotations: ${response.statusText}`);
          return;
        }

        const data: AnnotationsApiResponse = await response.json();

        // Data is already in the correct format, no transformation needed!
        set({
          annotations: data.annotations,
          isLoading: false,
        });
      } catch (error) {
        console.error('❌ Failed to load annotations:', error);
        set({
          pdfLoadErrror:
            error instanceof Error
              ? error.message
              : 'Failed to load annotations',
          isLoading: false,
        });
      }
    },

    // ---------- CHAT OPS ----------
    loadAnnotationChat: async (ann, opts) => {
      console.log('Loading chat for annotation:', ann.id);
      console.log('With options:', opts);
    },

    sendAnnotationMessage: async (ann, text, opts) => {
      console.log('Sending message to annotation:', ann.id);
      console.log('Message text:', text);
      console.log('With options:', opts);
    },
  }))
);
