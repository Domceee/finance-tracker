import { createContext, useContext, useEffect, useState } from 'react';
import {
  clearTokens,
  getRefreshToken,
  saveAccessToken,
  saveTokens,
} from '../lib/auth-storage';
import { devLogin, refreshSession } from '../lib/api';

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
  login: (email: string, name?: string) => Promise<void>;
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

  async function login(email: string, name?: string) {
    const result = await devLogin(email, name);

    await saveTokens(result.accessToken, result.refreshToken);
    setAccessToken(result.accessToken);
    setUser(result.user);
  }

  async function logout() {
    await clearTokens();
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: Boolean(accessToken && user),
        login,
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