import { Document, AgentResponse } from '@/types';

export interface IndividualState {
  loading: boolean;
  error?: string;
}
export interface IndividualAgentState {
  listDocs: IndividualState;
  chat: IndividualState;
}
export interface IAgentState {
  // state
  selectedDocument?: Document;
  sessionId?: string;
  documents: Document[];
  agentStates: IndividualAgentState;

  // actions
  setSelectedDocument: (document?: Document) => void;
  setSessionId: (sessionId: string) => void;
  setDocuments: (documents: Document[]) => void;
  setAgentState: (
    key: keyof IndividualAgentState,
    state: IndividualState
  ) => void;
  loadDocuments: () => Promise<void>;
  loadDocumentsV2: () => Promise<void>;
  sendChatMessage: <T = any>(
    message: string,
    metadata?: Record<string, string>
  ) => Promise<AgentResponse<T> | null>;
}
