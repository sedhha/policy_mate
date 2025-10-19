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
import { sendMessage } from '@/utils/apis/documents';

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

// Conversation history storage per document_id (persisted)
interface ConversationHistory {
  [document_id: string]: Comment[];
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

  commentConversation: Comment[]; // Active conversation for currently open annotation
  chatLoading: boolean;
  chatError?: string;
  chatSessionByAnnotation: Record<string, string | undefined>;

  openCommentForId?: string;
  openBookmarkForId?: string;
  openCreationForId?: string;
  expandedChipForId?: string;
  uiActionByAnnotation: Record<string, 'comment' | 'bookmark' | undefined>;
  maxPageCovered: number;
  s3Key?: string;
  s3Bucket?: string;

  // actions
  setPdfLoadError: (error?: string) => void;
  setNumPages: (num: number) => void;
  setSessionId: (sessionId: string) => void;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;
  fetchPdf: (payload: Record<string, string>) => Promise<File>;
  setHighlightStyle: (style: HighlightStyle) => void;
  setAnnotations: (annotations: SimpleAnnotation[]) => void;
  setOpenCommentForId: (id?: string) => void;
  setOpenBookmarkForId: (id?: string) => void;
  setOpenCreationForId: (id?: string) => void;
  setExpandedChipForId: (id?: string) => void;
  setUiActionFor: (id: string, v?: 'comment' | 'bookmark') => void;
  setS3Key: (s3Key: string) => void;
  setS3Bucket: (s3Bucket: string) => void;

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
    chatLoading: false,
    chatSessionByAnnotation: {},
    uiActionByAnnotation: {},
    s3Key: undefined,
    s3Bucket: undefined,

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
    addAnnotation: async (annotation: NewAnnotationInput) => {
      const newAnnotationTemplate: SimpleAnnotation = {
        id: 'temp-id-' + Date.now(),
        session_id: get().sessionId,
        page: annotation.page,
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
        timestamp: Date.now(),
        resolved: false,
        highlightedText: annotation.highlightedText || '',
      };
      set((state) => ({
        annotations: [...state.annotations, newAnnotationTemplate],
      }));
      // For now, return the temp id
      return newAnnotationTemplate.id;
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

    fetchPdf: async (params: Record<string, string> = {}): Promise<File> => {
      const fileName = 'document.pdf';
      try {
        set({ isLoading: true, pdfLoadErrror: undefined });
        // Get ID token from authStore
        const idToken = useAuthStore.getState().idToken;
        if (!idToken) {
          throw new Error('User is not authenticated');
        }

        const s3KeyFromPayload = params?.s3_key;
        const s3BucketFromPayload = params?.s3_bucket;

        const { s3Bucket = s3BucketFromPayload, s3Key = s3KeyFromPayload } =
          get();

        if (!s3Bucket || !s3Key) {
          throw new Error('S3 bucket or key is not set in the store');
        }

        // Step 1: Get pre-signed URL from our API
        const urlResponse = await fetch(
          `/api/pdf?bucket=${encodeURIComponent(
            s3Bucket
          )}&key=${encodeURIComponent(s3Key)}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!urlResponse.ok) {
          console.warn(
            'Failed to get pre-signed URL, falling back to sample PDF'
          );
          // Fallback to sample PDF if S3 fetch fails
          const blob = await fetch(`/sample_compliance_document.pdf`).then(
            (res) => res.blob()
          );
          const name = fileName.toLowerCase().endsWith('.pdf')
            ? fileName
            : `${fileName}.pdf`;
          const type = blob.type || 'application/pdf';
          set({ isLoading: false });
          return new File([blob], name, { type });
        }

        const { url, filename } = await urlResponse.json();

        // Step 2: Fetch PDF directly from S3 using pre-signed URL
        const pdfResponse = await fetch(url);

        if (!pdfResponse.ok) {
          throw new Error(
            `Failed to fetch PDF from S3: ${pdfResponse.statusText}`
          );
        }

        const blob = await pdfResponse.blob();
        const name =
          filename ||
          (fileName.toLowerCase().endsWith('.pdf')
            ? fileName
            : `${fileName}.pdf`);
        const type = blob.type || 'application/pdf';

        set({ isLoading: false });
        return new File([blob], name, { type });
      } catch (error) {
        console.error('❌ Error fetching PDF:', error);
        const errorMsg =
          error instanceof Error ? error.message : 'Failed to fetch PDF';
        set({ pdfLoadErrror: errorMsg, isLoading: false });
        // Fallback to sample PDF on any error
        const blob = await fetch(`/sample_compliance_document.pdf`).then(
          (res) => res.blob()
        );
        const name = fileName.toLowerCase().endsWith('.pdf')
          ? fileName
          : `${fileName}.pdf`;
        const type = blob.type || 'application/pdf';
        return new File([blob], name, { type });
      }
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
          const errorMsg = `Failed to load annotations: ${response.statusText}`;
          console.error(errorMsg);
          set({
            pdfLoadErrror: errorMsg,
            isLoading: false,
          });
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

    setS3Key: (s3Key: string) => set({ s3Key }),
    setS3Bucket: (s3Bucket: string) => set({ s3Bucket }),

    // ---------- CHAT OPS ----------
    loadAnnotationChat: async (ann, opts) => {
      const document_id = ann.session_id;

      // Load conversation from persisted localStorage
      const persistedData = localStorage.getItem(
        'pdf-annotation-conversations'
      );
      let conversationHistory: ConversationHistory = {};

      if (persistedData) {
        try {
          conversationHistory = JSON.parse(persistedData);
        } catch (e) {
          console.error('Failed to parse conversation history:', e);
        }
      }

      // Load conversation if it exists for this document_id
      if (conversationHistory[document_id]) {
        set({
          commentConversation: conversationHistory[document_id],
          chatLoading: false,
          chatError: undefined,
        });
      } else {
        // No saved conversation for this document
        set({
          commentConversation: [],
          chatLoading: false,
          chatError: undefined,
        });
      }
    },

    sendAnnotationMessage: async (ann, text, opts) => {
      const document_id = ann.session_id;

      try {
        // Set loading state
        set({ chatLoading: true, chatError: undefined });

        // Defaulting to gdpr
        let framework = 'GDPR';
        if (text.toLowerCase().includes('hipaa')) {
          framework = 'HIPAA';
        } else if (text.toLowerCase().includes('soc2')) {
          framework = 'SOC2';
        }

        const question = `[required_analysis=phrase_wise_compliance_check] [framework=${framework}] [analyse_text=${text}] [reference=${
          ann.highlightedText || 'N/A'
        }]`;

        const response = await sendMessage<{ summarised_markdown: string }>(
          question,
          opts?.sessionId
        );

        // Create user message
        const userMessage: Comment = {
          id: `user-${Date.now()}`,
          text,
          timestamp: new Date().toISOString(),
        };

        // Create assistant message based on response
        const assistantText = response.error_message
          ? response.error_message
          : response.summarised_markdown || 'No response';

        const assistantMessage: Comment = {
          id: `assistant-${Date.now()}`,
          text: assistantText,
          timestamp: new Date().toISOString(),
        };

        // Get current persisted conversation history
        const persistedData = localStorage.getItem(
          'pdf-annotation-conversations'
        );
        let conversationHistory: ConversationHistory = {};

        if (persistedData) {
          try {
            conversationHistory = JSON.parse(persistedData);
          } catch (e) {
            console.error('Failed to parse conversation history:', e);
          }
        }

        const currentDocHistory = conversationHistory[document_id] || [];

        // Append new messages and keep only last 10 messages (5 pairs)
        const updatedConversation = [
          ...currentDocHistory,
          userMessage,
          assistantMessage,
        ].slice(-10);

        // Update the active conversation
        set({
          commentConversation: updatedConversation,
          chatLoading: false,
          chatError: undefined,
        });

        // Persist to localStorage
        conversationHistory[document_id] = updatedConversation;
        localStorage.setItem(
          'pdf-annotation-conversations',
          JSON.stringify(conversationHistory)
        );

        // Store the session_id if provided
        if (response.session_id && ann.id) {
          set((state) => ({
            chatSessionByAnnotation: {
              ...state.chatSessionByAnnotation,
              [ann.id]: response.session_id,
            },
          }));
        }
      } catch (error) {
        console.error('❌ Error sending annotation message:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to send message';

        set({
          chatLoading: false,
          chatError: errorMessage,
        });
      }
    },
  }))
);
