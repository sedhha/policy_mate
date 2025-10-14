// filePath: policy_mate_ui/src/utils/apis/documents.ts
import { GetDocumentsResponse, ChatRequest } from '@/types';
import { env } from '@/utils/variables';
import { getAuthHeaders } from '@/utils/apis/auth';

/**
 * Fetch user's documents by sending a chat prompt to the agent
 * The agent will return document information in structured format
 */
export const fetchDocuments = async (
  prompt: string = 'Show me my docs in raw format'
): Promise<GetDocumentsResponse> => {
  try {
    const url = `${env.NEXT_PUBLIC_API_BASE_URL}/chat`;

    const requestBody: ChatRequest = {
      prompt,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to fetch documents: ${response.statusText}`
      );
    }

    const data: GetDocumentsResponse = await response.json();

    // Validate that we got document data
    if (!data.data || !data.data.documents) {
      return {
        response_type: 'error',
        content: {
          markdown: 'No documents found in response',
          metadata: { timestamp: new Date().toISOString() },
        },
        data: { documents: [], count: 0, timestamp: new Date().toISOString() },
      };
    }

    return data;
  } catch (error) {
    console.error('❌ Error fetching documents:', error);
    throw error;
  }
};

/**
 * Send a chat message to the agent
 * Can be used for any agent interaction beyond just fetching documents
 */
export const sendChatMessage = async (
  prompt: string,
  sessionId?: string
): Promise<GetDocumentsResponse> => {
  try {
    const url = `${env.NEXT_PUBLIC_API_BASE_URL}/chat`;

    const requestBody: ChatRequest = {
      prompt,
      ...(sessionId && { session_id: sessionId }),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Chat request failed: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Error sending chat message:', error);
    throw error;
  }
};
