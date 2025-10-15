import { create } from 'zustand';
import type { IAgentState, Document } from '@/types';
import { fetchDocuments } from '@/utils/apis/documents';

export const useAgentStore = create<IAgentState>()((set) => ({
  selectedDocument: undefined,
  sessionId: undefined,
  documents: [],
  agentStates: {
    listDocs: { loading: false, error: undefined },
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

      const response = await fetchDocuments();

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
}));
