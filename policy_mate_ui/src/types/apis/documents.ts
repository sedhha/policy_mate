// filePath: policy_mate_ui/src/types/apis/documents.ts

export interface Document {
  document_id: string;
  file_name: string;
  file_type: string;
  document_size: number;
  formatted_size: string;
  compliance_status: number;
  status_label: string;
  status_color: string;
  status_emoji: string;
  timestamp: number;
  formatted_date: string;
  pages: number;
  s3_key: string;
  s3_bucket: string;
}

export interface DocumentsData {
  documents: Document[];
  count: number;
  timestamp: string;
}

export interface IAction {
  action: string;
  description: string;
}
export interface AgentResponse<T> {
  error_message?: string;
  tool_payload?: T;
  session_id: string;
  summarised_markdown?: string;
  suggested_next_actions?: IAction[];
}

export interface ChatRequest {
  prompt: string;
  session_id?: string;
}
