export interface PrepareUploadRequest {
  fileHash: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadType: 'standard' | 'custom';
}

export interface PrepareUploadResponse {
  status: 'new' | 'duplicate';
  file_id: string;
  s3_key: string;
  upload_type: string;
  file_hash: string;
  upload_url?: string;
  upload_fields?: Record<string, string>;
  message: string;
}

export interface ConfirmUploadResponse {
  file_id: string;
  file_hash: string;
  file_name: string;
  s3_key: string;
  upload_type: string;
  status?: string;
  message: string;
}

export interface UploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  isDuplicate: boolean;
  message: string;
  error?: string;
}
