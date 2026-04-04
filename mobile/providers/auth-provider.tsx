import { createContext, useContext, useEffect, useState } from 'react';
import {
  clearTokens,
  getRefreshToken,
  saveAccessToken,
  saveTokens,
} from '../lib/auth-storage';
import { login, logoutSession, refreshSession, register, verifyEmail } from '../lib/api';

type AuthUser = {
  id: number;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<string>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const storedRefreshToken = await getRefreshToken();

        if (!storedRefreshToken) {
          setIsLoading(false);
          return;
        }

        const result = await refreshSession(storedRefreshToken);
        await saveAccessToken(result.accessToken);
        setAccessToken(result.accessToken);
        setUser(result.user);
      } catch {
        await clearTokens();
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, []);

  async function loginUser(email: string, password: string) {
    const result = await login(email, password);

    await saveTokens(result.accessToken, result.refreshToken);
    setAccessToken(result.accessToken);
    setUser(result.user);
  }

  async function registerUser(email: string, password: string, name?: string) {
    await register(email, password, name);

    return email.trim().toLowerCase();
  }

  async function verifyEmailCode(email: string, code: string) {
    const result = await verifyEmail(email, code);

    await saveTokens(result.accessToken, result.refreshToken);
    setAccessToken(result.accessToken);
    setUser(result.user);
  }

  async function logout() {
    try {
      const refreshToken = await getRefreshToken();

      if (refreshToken) {
        await logoutSession(refreshToken);
      }
    } finally {
      await clearTokens();
      setAccessToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: Boolean(accessToken && user),
        login: loginUser,
        register: registerUser,
        verifyEmail: verifyEmailCode,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
