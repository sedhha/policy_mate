import { create } from 'zustand';
import type { IAgentState, DocumentsData } from '@/types';
import { fetchDocuments, sendMessage } from '@/utils/apis/documents';
import { useAuthStore } from './authStore';

export const useAgentStore = create<IAgentState>()((set, get) => ({
  selectedDocument: undefined,
  sessionId: undefined,
  documents: [],
  agentStates: {
    listDocs: { loading: false, error: undefined },
    chat: { loading: false, error: undefined },
  },

  setSelectedDocument: (document) => set({ selectedDocument: document }),
  setSessionId: (sessionId) => set({ sessionId }),
  setDocuments: (documents) => set({ documents }),
  setAgentState: (key, state) =>
    set((prev) => ({
      agentStates: {
        ...prev.agentStates,
        [key]: state,
      },
    })),

  loadDocuments: async () => {
    try {
      set((prev) => ({
        agentStates: {
          ...prev.agentStates,
          listDocs: { loading: true, error: undefined },
        },
      }));
      const sessionId = get().sessionId;
      const response = await fetchDocuments(sessionId);

      if (response.error_message) {
        set((prev) => ({
          documents: [],
          agentStates: {
            ...prev.agentStates,
            listDocs: { loading: false, error: response.error_message },
          },
        }));
        return;
      }

      set((prev) => ({
        documents: response.tool_payload?.documents || [],
        sessionId: response.session_id,
        agentStates: {
          ...prev.agentStates,
          listDocs: { loading: false, error: undefined },
        },
      }));
    } catch (err) {
      console.error('Failed to load documents:', err);
      set((prev) => ({
        documents: [],
        agentStates: {
          ...prev.agentStates,
          listDocs: {
            loading: false,
            error:
              err instanceof Error ? err.message : 'Failed to load documents',
          },
        },
      }));
    }
  },

  sendChatMessage: async <T = any>(
    message: string,
    metadata?: Record<string, string>
  ) => {
    try {
      set((prev) => ({
        agentStates: {
          ...prev.agentStates,
          chat: { loading: true, error: undefined },
        },
      }));

      const sessionId = get().sessionId;
      const response = await sendMessage<T>(message, sessionId, metadata);

      // Update session ID if it changed
      if (response.session_id) {
        set({ sessionId: response.session_id });
      }

      if (response.error_message && !response.summarised_markdown) {
        set((prev) => ({
          agentStates: {
            ...prev.agentStates,
            chat: { loading: false, error: response.error_message },
          },
        }));
        return null;
      }

      set((prev) => ({
        agentStates: {
          ...prev.agentStates,
          chat: { loading: false, error: undefined },
        },
      }));

      return response;
    } catch (err) {
      console.error('Failed to send chat message:', err);
      set((prev) => ({
        agentStates: {
          ...prev.agentStates,
          chat: {
            loading: false,
            error:
              err instanceof Error ? err.message : 'Failed to send message',
          },
        },
      }));
      return null;
    }
  },

  loadDocumentsV2: async () => {
    try {
      set((prev) => ({
        agentStates: {
          ...prev.agentStates,
          listDocs: { loading: true, error: undefined },
        },
      }));

      // Get auth token from auth store
      const idToken = useAuthStore.getState().idToken;
      if (!idToken) {
        set((prev) => ({
          documents: [],
          agentStates: {
            ...prev.agentStates,
            listDocs: { loading: false, error: 'Not authenticated' },
          },
        }));
        return;
      }

      // Call the new /api/docs endpoint
      const response = await fetch('/api/my-documents', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error ||
          errorData.details ||
          `Failed to load documents: ${response.statusText}`;
        set((prev) => ({
          documents: [],
          agentStates: {
            ...prev.agentStates,
            listDocs: { loading: false, error: errorMessage },
          },
        }));
        return;
      }

      const data: DocumentsData = await response.json();

      set((prev) => ({
        documents: data.documents || [],
        agentStates: {
          ...prev.agentStates,
          listDocs: { loading: false, error: undefined },
        },
      }));
    } catch (err) {
      console.error('Failed to load documents:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load documents';
      set((prev) => ({
        documents: [],
        agentStates: {
          ...prev.agentStates,
          listDocs: {
            loading: false,
            error: errorMessage,
          },
        },
      }));
    }
  },
}));
