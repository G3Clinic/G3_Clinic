import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi, tokenStore } from '../services/api';
import type { AuthUser, RegisterData } from '../services/api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;          // carregando sessão inicial
  login: (email: string, senha: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao montar: se há token salvo, tenta recuperar o perfil.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, senha: string) => {
    await authApi.login(email, senha);
    setUser(await authApi.me());
  };

  const register = async (data: RegisterData) => {
    await authApi.register(data);
    setUser(await authApi.me());
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const refresh = async () => {
    setUser(await authApi.me());
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
