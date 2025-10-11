import { useAuthStore } from '@/stores/authStore';
import {
  ConfirmUploadResponse,
  PrepareUploadRequest,
  PrepareUploadResponse,
  UploadResult,
} from '@/types';

const API_BASE_URL =
  'https://bof2j20cg2.execute-api.us-east-1.amazonaws.com/agentConversationApiV1';

// Helper to get auth token
const getAuthToken = (): string | null => {
  const { idToken } = useAuthStore.getState();
  return idToken || null;
};

// Helper to create authorized headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token available');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

/**
 * Step 1: Request pre-signed URL for upload
 */
export const prepareUpload = async (
  request: PrepareUploadRequest
): Promise<PrepareUploadResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/uploads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Upload preparation failed: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error preparing upload:', error);
    throw error;
  }
};

/**
 * Step 2: Upload file to S3 using pre-signed URL
 */
export const uploadToS3 = async (
  uploadUrl: string,
  uploadFields: Record<string, string>,
  file: File
): Promise<void> => {
  try {
    const formData = new FormData();

    // Add all the fields from the pre-signed post
    Object.entries(uploadFields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Add the file last (this is important for S3)
    formData.append('file', file);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`S3 upload failed: ${response.statusText}. ${errorText}`);
    }
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

/**
 * Step 3: Confirm upload completion
 */
export const confirmUpload = async (
  fileId: string
): Promise<ConfirmUploadResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/uploads?fileId=${fileId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Upload confirmation failed: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Error confirming upload:', error);
    throw error;
  }
};

/**
 * Calculate SHA-256 hash of a file
 */
export const calculateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
};

/**
 * Complete upload flow: prepare -> upload to S3 -> confirm
 * This is the main function you should call from your component
 */
export const uploadFile = async (
  file: File,
  uploadType: 'standard' | 'custom' = 'custom',
  onProgress?: (step: string, progress: number) => void
): Promise<UploadResult> => {
  try {
    // Step 0: Calculate file hash
    onProgress?.('Calculating file hash...', 10);
    const fileHash = await calculateFileHash(file);

    // Step 1: Prepare upload
    onProgress?.('Preparing upload...', 20);
    const prepareResponse = await prepareUpload({
      fileHash,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/pdf',
      uploadType,
    });

    // Check if file is duplicate
    if (prepareResponse.status === 'duplicate') {
      onProgress?.('Upload complete (duplicate file)', 100);
      return {
        success: true,
        fileId: prepareResponse.file_id,
        fileName: file.name,
        isDuplicate: true,
        message: prepareResponse.message,
      };
    }

    // Step 2: Upload to S3
    if (!prepareResponse.upload_url || !prepareResponse.upload_fields) {
      throw new Error('Missing upload URL or fields from prepare response');
    }

    onProgress?.('Uploading file to storage...', 50);
    await uploadToS3(
      prepareResponse.upload_url,
      prepareResponse.upload_fields,
      file
    );

    // Step 3: Confirm upload
    onProgress?.('Confirming upload...', 80);
    const confirmResponse = await confirmUpload(prepareResponse.file_id);

    onProgress?.('Upload complete', 100);
    return {
      success: true,
      fileId: confirmResponse.file_id,
      fileName: confirmResponse.file_name,
      isDuplicate: false,
      message: confirmResponse.message,
    };
  } catch (error) {
    console.error('Upload failed:', error);
    return {
      success: false,
      fileId: '',
      fileName: file.name,
      isDuplicate: false,
      message: 'Upload failed',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};
