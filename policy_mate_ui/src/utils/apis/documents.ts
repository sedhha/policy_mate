// filePath: policy_mate_ui/src/utils/apis/documents.ts
import { AgentResponse, ChatRequest, DocumentsData } from '@/types';
import { env } from '@/utils/variables';
import { getAuthHeaders } from '@/utils/apis/auth';

/**
 * Fetch user's documents by sending a chat prompt to the agent
 * The agent will return document information in structured format
 */
export const fetchDocuments = async (
  prompt: string = 'Show me my docs in raw format'
): Promise<AgentResponse<DocumentsData>> => {
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

    const agentResponse: AgentResponse<DocumentsData> = await response.json();

    // Validate that we got document data
    return agentResponse;
  } catch (error) {
    console.error('❌ Error fetching documents:', error);
    throw error;
  }
};
