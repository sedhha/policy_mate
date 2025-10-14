import { useAuthStore } from '@/stores/authStore';

// Helper to get auth token
const getAuthToken = (): string | null => {
  const { idToken } = useAuthStore.getState();
  return idToken || null;
};

// Helper to create authorized headers
export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token available');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};
