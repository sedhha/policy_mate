// filePath: policy_mate_ui/src/stores/authStore.ts
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import { IUserState, User, DecodedToken } from '@/types';

// Helper function to check if token is expired
export const isTokenExpired = (token: string | undefined): boolean => {
  if (!token) return true;

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    if (!decoded.exp) return false; // If no expiry, treat as valid

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (err) {
    console.error('Error decoding token:', err);
    return true; // Treat invalid tokens as expired
  }
};

export const useAuthStore = create<IUserState>()(
  devtools(
    persist(
      (set, get) => ({
        idToken: undefined,
        user: undefined,

        setIdToken: (idToken: string) => {
          let decodedUser: User | undefined;

          try {
            const decoded = jwtDecode<DecodedToken>(idToken);
            decodedUser = {
              id: decoded.sub ?? '',
              email: decoded.email ?? '',
              username: decoded['cognito:username'] ?? '',
              raw: decoded,
            };
            // Unset if token has expired
            const currentTime = Math.floor(Date.now() / 1000);
            if (decoded.exp && decoded.exp < currentTime) {
              console.warn('ID token has expired');
              set({ idToken: undefined, user: undefined });
              return;
            }
          } catch (err) {
            console.error('Invalid or malformed ID token:', err);
          }

          set({ idToken, user: decodedUser }, false, {
            type: 'auth/setIdToken',
            payload: decodedUser,
          });
        },

        setUser: (user: User) => set({ user }, false, { type: 'auth/setUser' }),

        clearAuth: () =>
          set({ idToken: undefined, user: undefined }, false, {
            type: 'auth/clearAuth',
          }),
      }),
      {
        name: 'auth-store',
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          idToken: state.idToken,
          user: state.user,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);
