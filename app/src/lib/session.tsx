import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { request, type Session } from './api';
import { getItem, setItem } from './storage';

const STORAGE_KEY = 'dinner.session';

type SessionContextValue = {
  session: Session | null;
  loading: boolean;
  signIn: (mode: 'login' | 'register', username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItem(STORAGE_KEY)
      .then((stored) => stored && setSession(JSON.parse(stored)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (mode: 'login' | 'register', username: string, password: string) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const next = await request<Session>(`/auth/${mode}`, {
      method: 'POST',
      json: { username, password, timezone },
    });
    await setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    if (session) await request('/auth/logout', { method: 'POST', token: session.token }).catch(() => {});
    await setItem(STORAGE_KEY, null);
    setSession(null);
  }, [session]);

  return <SessionContext value={{ session, loading, signIn, signOut }}>{children}</SessionContext>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
