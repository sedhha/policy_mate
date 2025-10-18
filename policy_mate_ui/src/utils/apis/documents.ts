// filePath: policy_mate_ui/src/utils/apis/documents.ts
import { AgentResponse, ChatRequest, DocumentsData } from '@/types';
import { env } from '@/utils/variables';
import { getAuthHeaders } from '@/utils/apis/auth';

/**
 * Metadata tags that can be attached to messages
 * Format: [META:key=value,key2=value2] message content
 */
export interface MessageMetadata {
  file_id?: string;
  [key: string]: string | undefined;
}

/**
 * Instructions appended to every message
 * This is stripped from display but sent to the backend
 */
// const FORMAT_INSTRUCTION = ` return response in JSON format`;
/**
 * Build metadata tag string from metadata object
 * Format: [META:file_id=abc123,another_key=value]
 *
 * @param metadata - Key-value pairs to include in the tag
 * @returns Formatted metadata tag string or empty string if no metadata
 */
const buildMetadataTag = (metadata?: MessageMetadata): string => {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '';
  }

  const entries = Object.entries(metadata)
    .filter(([_, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join(',');

  return entries ? `[META:${entries}] ` : '';
};

/**
 * Strip all metadata tags from text for display purposes
 * Removes tags in format: [META:key=value,key2=value2]
 *
 * @param text - Text that may contain metadata tags
 * @returns Clean text without metadata tags
 */
export const stripMetadataTags = (text: string): string => {
  return text.replace(/\[META:[^\]]+\]\s*/g, '');
};

/**
 * Strip JSON format instruction from text for display purposes
 * Removes the instruction "return response in JSON format" from the end
 *
 * @param text - Text that may contain JSON format instruction
 * @returns Clean text without JSON format instruction
 */
export const stripJsonFormatInstruction = (text: string): string => {
  return text.replace(/\s*return response in JSON format\s*$/i, '');
};

/**
 * Strip all backend instructions and metadata from text for UI display
 * Combines both metadata tags and JSON format instruction removal
 *
 * @param text - Text that may contain metadata tags and instructions
 * @returns Clean text for display
 */
export const stripBackendInstructions = (text: string): string => {
  let cleanText = stripMetadataTags(text);
  cleanText = stripJsonFormatInstruction(cleanText);
  return cleanText.trim();
};

/**
 * Extract metadata from a tagged message
 *
 * @param text - Text that may contain metadata tags
 * @returns Parsed metadata object
 */
export const extractMetadata = (text: string): MessageMetadata => {
  const match = text.match(/\[META:([^\]]+)\]/);
  if (!match) return {};

  const metadataString = match[1];
  const metadata: MessageMetadata = {};

  metadataString.split(',').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key && value) {
      metadata[key.trim()] = value.trim();
    }
  });

  return metadata;
};

/**
 * Send a chat message to the agent
 * Uses the same API endpoint for all chat interactions
 * Automatically appends JSON format instruction to all messages
 *
 * @param prompt - The message to send to the agent
 * @param sessionId - Optional session ID to continue a conversation
 * @param metadata - Optional metadata to tag with the message (e.g., file_id)
 * @returns Agent response with optional tool payload
 */
export const sendMessage = async <T = any>(
  prompt: string,
  sessionId?: string,
  metadata?: MessageMetadata
): Promise<AgentResponse<T>> => {
  try {
    const url = `${env.NEXT_PUBLIC_API_BASE_URL}/chat_session`;

    // Tag the prompt with metadata if provided
    const metadataTag = buildMetadataTag(metadata);

    // Append JSON format instruction to every message
    // const promptWithInstruction = `${prompt}${FORMAT_INSTRUCTION}`;
    // const taggedPrompt = `${metadataTag}${promptWithInstruction}`;
    const taggedPrompt = `${metadataTag}${prompt}`;

    const requestBody: ChatRequest = {
      prompt: taggedPrompt,
      session_id: sessionId,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to send message: ${response.statusText}`
      );
    }
    console.log('✅ Message sent successfully');

    const agentResponse: AgentResponse<T> = await response.json();
    console.log('🤖 Agent response received:', agentResponse);
    return agentResponse;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
};

/**
 * Fetch user's documents by sending a chat prompt to the agent
 * The agent will return document information in structured format
 */
export const fetchDocuments = async (
  sessionId?: string,
  prompt: string = 'List all my documents.'
): Promise<AgentResponse<DocumentsData>> => {
  return sendMessage<DocumentsData>(prompt, sessionId);
};
