// filePath: policy_mate_ui/src/types/apis/documents.ts

export interface Document {
  document_id: string;
  file_name: string;
  file_type: string;
  document_size: number;
  formatted_size: string;
  compliance_status: 'compliant' | 'non-compliant' | 'in_progress' | 'unknown';
  status_label: string;
  status_color: string;
  status_emoji: string;
  timestamp: number;
  formatted_date: string;
}

export interface DocumentsData {
  documents: Document[];
  count: number;
  timestamp: string;
}

export interface GetDocumentsResponse {
  response_type: string;
  content: {
    markdown: string;
    metadata: {
      timestamp: string;
    };
  };
  data: DocumentsData;
  session_id?: string;
}

export interface ChatRequest {
  prompt: string;
  session_id?: string;
}
