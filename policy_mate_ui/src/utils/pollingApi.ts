/**
 * Polling API Client
 * Provides utilities to interact with the polling endpoint
 */

export interface PollingResponse {
  status: 'processing' | 'completed' | 'error';
  request_id: string;
  message?: string;
  response?: any;
  created_at?: number;
}

/**
 * Creates a new polling request
 * @param data - Request data to send to the bedrock handler
 * @param token - JWT authentication token
 * @returns Polling response with request_id
 */
export async function createPollingRequest(
  data: Record<string, any>,
  token: string
): Promise<PollingResponse> {
  const response = await fetch('/api/polling', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create polling request');
  }

  return response.json();
}

/**
 * Checks the status of a polling request
 * @param requestId - The request ID to check
 * @param token - JWT authentication token
 * @returns Current status of the request
 */
export async function checkPollingStatus(
  requestId: string,
  token: string
): Promise<PollingResponse> {
  const response = await fetch(`/api/polling?request_id=${requestId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to check polling status');
  }

  return response.json();
}

/**
 * Polls a request until completion or error
 * @param requestId - The request ID to poll
 * @param token - JWT authentication token
 * @param interval - Polling interval in milliseconds (default: 2000)
 * @param maxAttempts - Maximum number of polling attempts (default: 150, i.e., 5 minutes with 2s interval)
 * @param onProgress - Optional callback for progress updates
 * @returns Final response when completed
 */
export async function pollUntilComplete(
  requestId: string,
  token: string,
  interval = 2000,
  maxAttempts = 150,
  onProgress?: (status: PollingResponse) => void
): Promise<PollingResponse> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await checkPollingStatus(requestId, token);

    if (onProgress) {
      onProgress(status);
    }

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'error') {
      throw new Error(status.message || 'Processing failed');
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, interval));
    attempts++;
  }

  throw new Error('Polling timeout: Maximum attempts reached');
}

/**
 * Creates a polling request and polls until completion
 * Convenience method that combines createPollingRequest and pollUntilComplete
 * @param data - Request data to send to the bedrock handler
 * @param token - JWT authentication token
 * @param options - Polling options
 * @returns Final response when completed
 */
export async function createAndPoll(
  data: Record<string, any>,
  token: string,
  options?: {
    interval?: number;
    maxAttempts?: number;
    onProgress?: (status: PollingResponse) => void;
  }
): Promise<PollingResponse> {
  const initialResponse = await createPollingRequest(data, token);

  if (options?.onProgress) {
    options.onProgress(initialResponse);
  }

  return pollUntilComplete(
    initialResponse.request_id,
    token,
    options?.interval,
    options?.maxAttempts,
    options?.onProgress
  );
}
