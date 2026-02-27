import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth
      .me()
      .then(({ user: u }) => {
        setUser(u);
        setProfile(u);
      })
      .catch(() => {
        setUser(null);
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { user: u } = await api.auth.register(email, password, displayName);
    setUser(u);
    setProfile(u);
  };

  const signIn = async (email: string, password: string) => {
    const { user: u } = await api.auth.login(email, password);
    setUser(u);
    setProfile(u);
  };

  const signOut = async () => {
    await api.auth.logout();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        isAdmin: profile?.is_admin ?? false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
