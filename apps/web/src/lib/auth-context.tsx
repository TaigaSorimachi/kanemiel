'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { initLiff, isLoggedIn as liffIsLoggedIn, getAccessToken } from './liff';
import { api } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  name: string;
  role: 'owner' | 'accounting' | 'foreman';
  companyId: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const DEMO_USER: User = {
  id: 'demo',
  name: 'デモユーザー',
  role: 'owner',
  companyId: 'demo',
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAuthenticated: false,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function authenticate() {
      try {
        // Attempt LIFF initialization
        await initLiff();

        if (liffIsLoggedIn()) {
          // --- LIFF authenticated flow ---
          const accessToken = await getAccessToken();
          if (accessToken) {
            const result = (await api.auth.line(accessToken)) as {
              token: string;
              user: User;
            };
            localStorage.setItem('token', result.token);
            if (!cancelled) {
              setUser(result.user);
              setLoading(false);
              return;
            }
          }
        }

        // --- Non-LIFF flow (dev / existing token) ---
        const existingToken = localStorage.getItem('token');
        if (existingToken) {
          try {
            const me = (await api.auth.me()) as User;
            if (!cancelled) {
              setUser(me);
              setLoading(false);
              return;
            }
          } catch {
            // Token invalid – fall through to demo mode
            localStorage.removeItem('token');
          }
        }

        // --- Demo mode (no LIFF ID configured or no valid token) ---
        if (!cancelled) {
          setUser(DEMO_USER);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (!cancelled) {
          // Fallback to demo user on any error
          setUser(DEMO_USER);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    authenticate();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
