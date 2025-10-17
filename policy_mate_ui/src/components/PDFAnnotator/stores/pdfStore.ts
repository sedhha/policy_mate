// stores/pdfStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useAuthStore } from '@/stores/authStore';
import { useAnalysisSessionsStore } from '@/stores/sessionsStore';
import { apiClient, ApiClientError } from '@/utils/apiClient';
import type {
  AnnotationAction,
  AddAnnotationResponse,
  BookmarkType,
  ChatResponse,
  Comment,
  HighlightStyle,
  SimpleAnnotation,
  TranscriptResponse,
  AnnotationOutDTO,
  NewAnnotationInput,
} from '@/components/PDFAnnotator/types';

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
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');

      const analysisSessionId = get().sessionId;
      if (!analysisSessionId) throw new Error('No analysis session selected');
      set({ isLoading: true });

      // Backend requires action NOT NULL: default to 'comment' (can be changed via chip later)
      const payload = {
        session_id: analysisSessionId,
        page: annotation.page,
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
        bookmark_type: annotation.bookmarkType ?? null,
        bookmark_note: annotation.bookmarkNote ?? null,
        highlighted_text: annotation.highlightedText ?? null,
      };

      const res = await apiClient
        .post<{
          status: 'success' | 'error';
          annotation?: {
            id: string;
            session_id: string;
            page: number;
            x: number;
            y: number;
            width: number;
            height: number;
            timestamp: string;
            action: string;
            bookmark_type?: string | null;
            bookmark_note?: string | null;
            resolved: boolean;
            comment_session_id?: string | null;
            highlighted_text?: string | null;
            created_at: string;
            updated_at: string;
          };
          description?: string;
        }>('/annotations', payload, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .finally(() => set({ isLoading: false }));

      if (!res || res.status !== 'success' || !res.annotation) {
        throw new Error(res?.['description'] || 'Failed to create annotation');
      }

      const a = res.annotation;

      const mapped: SimpleAnnotation = {
        id: a.id,
        session_id: a.session_id,
        page: a.page,
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        action: a.action as AnnotationAction,
        bookmarkType: (a.bookmark_type ?? undefined) as
          | BookmarkType
          | undefined,
        bookmarkNote: a.bookmark_note ?? undefined,
        resolved: !!a.resolved,
        highlightedText: a.highlighted_text ?? undefined,
        comment_session_id: a.comment_session_id ?? undefined,
        timestamp: new Date(a.timestamp).getTime(),
      };

      set((state) => ({
        annotations: [...state.annotations, mapped],
        isLoading: false,
      }));
      return a.id;
    },

    setCommentConversation: (comments: Comment[]) =>
      set({ commentConversation: comments }),

    updateAnnotation: async (
      id: string,
      updated: Partial<SimpleAnnotation>
    ) => {
      // 1. Optimistic UI update
      set((state) => ({
        annotations: state.annotations.map((ann) =>
          ann.id === id ? { ...ann, ...updated } : ann
        ),
      }));

      // 2. If it's only "action", we stop here (chip toggles shouldn't hit backend)
      const keys = Object.keys(updated);
      if (keys.length === 1 && keys[0] === 'action') {
        return;
      }

      const token = useAuthStore.getState().token;
      if (!token) {
        console.error('Not authenticated');
        return;
      }

      const ann = get().annotations.find((a) => a.id === id);
      const sessionId = ann?.session_id || get().sessionId;
      if (!sessionId) {
        console.error('No session id available for annotation patch');
        return;
      }

      try {
        const patchAnnotation = apiClient.patch(
          `/annotations/${encodeURIComponent(id)}`,
          {
            bookmark_type: updated.bookmarkType ?? ann?.bookmarkType ?? null,
            bookmark_note: updated.bookmarkNote ?? ann?.bookmarkNote ?? null,
            resolved: updated.resolved ?? ann?.resolved ?? false,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const { maxPageCovered = 1, numPages = 1 } = get();
        const progress = Math.round((maxPageCovered / numPages) * 100);

        // compute session metrics deltas
        const patchSession = useAnalysisSessionsStore
          .getState()
          .patchSessionMetrics(sessionId, {
            // if adding a new finding
            total_findings:
              updated.bookmarkType || updated.bookmarkNote ? 1 : 0,
            // resolved toggle logic
            resolved_findings:
              updated.resolved === true
                ? 1
                : updated.resolved === false
                ? -1
                : 0,
            progress,
          });

        await Promise.all([patchAnnotation, patchSession]);
      } catch (err) {
        console.error('updateAnnotation failed:', err);
        // TODO: optionally roll back optimistic update here
      }
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
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');

      await apiClient.delete(`/annotations/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      set((state) => ({
        annotations: state.annotations.filter((ann) => ann.id !== id),
        // clean up panel if deleting the one open
        openCommentForId:
          state.openCommentForId === id ? undefined : state.openCommentForId,
        openBookmarkForId:
          state.openBookmarkForId === id ? undefined : state.openBookmarkForId,
        openCreationForId:
          state.openCreationForId === id ? undefined : state.openCreationForId,
        expandedChipForId:
          state.expandedChipForId === id ? undefined : state.expandedChipForId,
      }));
    },

    fetchPdf: async (
      analysisId: string,
      fileNameFallback = 'document.pdf'
    ): Promise<File> => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      const blob = await apiClient.getBlob(
        `analysis/get_analysis/${analysisId}/file`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const name = fileNameFallback.toLowerCase().endsWith('.pdf')
        ? fileNameFallback
        : `${fileNameFallback}.pdf`;
      const type = blob.type || 'application/pdf';
      return new File([blob], name, { type });
    },
    loadAnnotations: async (sessionId: string) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');
      if (!sessionId) return;

      const qs = new URLSearchParams();
      qs.set('session_id', sessionId);
      // OPTIONAL: if you add pagination later: qs.set('limit','500')

      try {
        const res = await apiClient.get<{
          status: 'success' | 'error';
          annotations?: Array<{
            id: string;
            session_id: string;
            page: number;
            x: number;
            y: number;
            width: number;
            height: number;
            timestamp: string;
            action?: string | null;
            bookmark_type?: string | null;
            bookmark_note?: string | null;
            resolved: boolean;
            comment_session_id?: string | null;
            highlighted_text?: string | null;
            created_at: string;
            updated_at: string;
          }>;
          description?: string;
          total?: number;
          limit?: number;
          offset?: number;
        }>(`/annotations?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res || res.status !== 'success') {
          throw new Error(res?.description || 'Failed to load annotations');
        }

        const mapped: SimpleAnnotation[] = (res.annotations ?? []).map((a) => ({
          id: a.id,
          session_id: a.session_id,
          page: a.page,
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
          // UI-only "action" is optional; keep whatever backend sends or leave undefined
          action: (a.action ?? undefined) as AnnotationAction | undefined,
          bookmarkType: (a.bookmark_type ?? undefined) as
            | BookmarkType
            | undefined,
          bookmarkNote: a.bookmark_note ?? undefined,
          resolved: !!a.resolved,
          highlightedText: a.highlighted_text ?? undefined,
          comment_session_id: a.comment_session_id ?? undefined,
          timestamp: new Date(a.timestamp).getTime(),
        }));

        set({ annotations: mapped });
      } catch (err) {
        const msg =
          err instanceof ApiClientError
            ? err.detail
            : err instanceof Error
            ? err.message
            : 'Failed to load annotations';
        console.error('loadAnnotations:', msg);
        // Don’t throw; just leave the list empty and carry on
        set({ annotations: [] });
      }
    },

    // ---------- CHAT OPS ----------
    loadAnnotationChat: async (ann, opts) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');

      const limit = opts?.limit ?? 50;
      const explicitSid = opts?.sessionId;

      set({ chatLoading: true, chatError: undefined });

      const getTranscript = async (
        annotationId: string,
        adkSessionId?: string
      ) => {
        const qs = new URLSearchParams();
        qs.set('limit', String(limit));
        if (adkSessionId) qs.set('session_id', adkSessionId);
        return apiClient.get<TranscriptResponse>(
          `/annotations/${encodeURIComponent(
            annotationId
          )}/chat?${qs.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      };

      try {
        const currentSid =
          explicitSid ||
          get().chatSessionByAnnotation[ann.id] ||
          ann.comment_session_id;

        let data = await getTranscript(ann.id, currentSid);

        // If backend signals missing (you may return 404 via ApiClientError), create and retry
        // We’ll treat non-success as “create then retry”
        if (!data || data.status !== 'success') {
          const payload = {
            session_id: get().sessionId, // analysis session id
            page: ann.page ?? 1,
            x: ann.x ?? 0,
            y: ann.y ?? 0,
            width: ann.width ?? 0,
            height: ann.height ?? 0,
            action: ann.action ?? 'comment',
            bookmark_type: ann.bookmarkType ?? null,
            bookmark_note: ann.bookmarkNote ?? null,
            highlighted_text: ann.highlightedText ?? null,
          };
          // create anew to make sure annotation exists
          const created = await apiClient.post<AddAnnotationResponse>(
            '/annotations',
            payload,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (created?.annotation?.id) {
            // adopt server id if local ann didn’t have one (should have)
            if (created.annotation.id !== ann.id) {
              set((state) => ({
                annotations: state.annotations.map((a) =>
                  a.id === ann.id
                    ? { ...a, id: (created.annotation as AnnotationOutDTO).id }
                    : a
                ),
              }));
            }
            data = await getTranscript(created.annotation.id, currentSid);
          }
        }

        if (!data || data.status !== 'success') {
          throw new Error('Failed to load chat');
        }

        const sid = data.session_id || currentSid || '';
        set((state) => ({
          chatSessionByAnnotation: {
            ...state.chatSessionByAnnotation,
            [ann.id]: sid,
          },
        }));

        const msgs = (data.messages ?? []).map((m) => ({
          id: m.id || crypto.randomUUID(),
          text: m.text,
          timestamp: m.timestamp,
          role: m.role,
        })) as Comment[];

        get().updateAnnotationComments(ann.id, msgs);
        set({ chatLoading: false });
      } catch (err) {
        let msg = 'Failed to load chat';
        if (err instanceof ApiClientError) msg = err.detail || msg;
        else if (err instanceof Error) msg = err.message;
        set({ chatLoading: false, chatError: msg });
      }
    },

    sendAnnotationMessage: async (ann, text, opts) => {
      const token = useAuthStore.getState().token;
      if (!token) throw new Error('Not authenticated');

      const includeRef = opts?.includeReference ?? true;
      const currentComments = (get().commentConversation || []) as Comment[];
      const isFirstTurn = !currentComments?.length;

      // Minimal config knobs (hardcoded here; tweak as you like)
      const FRAMEWORKS = 'GDPR, ISO 27001, SOC 2';
      const JURISDICTION = 'EU'; // e.g., 'EU', 'UK', 'US-Federal', 'CA-AB', 'IN-DPDP'
      const REQUIRE_CITATIONS = true; // force google_search grounding
      const ANSWER_STYLE: 'tl;dr' | 'checklist' = 'tl;dr';

      // Small helper to keep highlight safe + short
      const safe = (s?: string) => (s ?? '').replace(/\s+/g, ' ').slice(0, 800);

      // First-turn header: tells the agent exactly how to answer
      const header = isFirstTurn
        ? [
            '[[COMPLIANCE_CONTEXT_V1]]',
            `frameworks: ${FRAMEWORKS}`,
            `jurisdiction: ${JURISDICTION}`,
            `require_citations: ${REQUIRE_CITATIONS}`,
            `answer_style: ${ANSWER_STYLE}`,
            `page: ${ann.page}`,
            includeRef && ann.highlightedText
              ? `annotation: """${safe(ann.highlightedText)}"""`
              : undefined,
            '[[/COMPLIANCE_CONTEXT_V1]]',
            '',
          ]
            .filter(Boolean)
            .join('\n')
        : '';

      // Final text assembly
      const needRefBlock =
        includeRef &&
        !!ann.highlightedText &&
        // don't duplicate if the *first* message already starts with Regarding:
        !/^Regarding:\s*Page\s+/i.test(currentComments?.[0]?.text ?? '');

      const refBlock = needRefBlock
        ? [
            '[[COMPLIANCE_REF_V1]]',
            `Regarding: Page ${ann.page}: "${safe(ann.highlightedText)}"`,
            '[[/COMPLIANCE_REF_V1]]',
            '',
          ].join('\n')
        : '';

      // (C) Final assembly: header (once) + ref (when needed) + user text
      let finalTextToSend = `${header}${refBlock}${text}`;

      // size guard
      if (finalTextToSend.length > 8000) {
        finalTextToSend =
          finalTextToSend.slice(0, 7800) + '\n\n[Truncated to 8k chars by UI]';
      }

      const optimistic: Comment = {
        id: crypto.randomUUID(),
        text: finalTextToSend,
        timestamp: new Date().toISOString(),
      };
      get().updateAnnotationComments(ann.id, [...currentComments, optimistic]);
      set({ chatError: undefined, chatLoading: true });

      try {
        const sid =
          opts?.sessionId ||
          get().chatSessionByAnnotation[ann.id] ||
          ann.comment_session_id;

        const payload: { text: string; session_id?: string } = {
          text: finalTextToSend,
        };
        if (sid) payload.session_id = sid;

        const data = await apiClient.post<ChatResponse>(
          `/annotations/${encodeURIComponent(ann.id)}/chat`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!data || data.status !== 'success') {
          throw new Error('Failed to send message');
        }

        const newSid = data.session_id || sid || '';
        set((state) => ({
          chatSessionByAnnotation: {
            ...state.chatSessionByAnnotation,
            [ann.id]: newSid,
          },
        }));

        const msgs = (data.messages ?? []).map((m) => ({
          id: m.id || crypto.randomUUID(),
          text: m.text,
          timestamp: m.timestamp,
          role: m.role,
        })) as Comment[];

        get().updateAnnotationComments(ann.id, msgs);
        set({ chatLoading: false });
      } catch (err) {
        const afterFail = (get().commentConversation || []) as Comment[];
        const rolledBack = afterFail.filter((c) => c.id !== optimistic.id);
        get().updateAnnotationComments(ann.id, rolledBack);

        let msg = 'Message failed';
        if (err instanceof ApiClientError) msg = err.detail || msg;
        else if (err instanceof Error) msg = err.message;
        set({ chatLoading: false, chatError: msg });
      }
    },
  }))
);
