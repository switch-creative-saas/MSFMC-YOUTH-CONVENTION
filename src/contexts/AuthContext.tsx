import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, UserRole } from '@/types';
import { supabase } from '@/lib/supabase/client';

interface AuthContextType { user: User | null; role: UserRole | null; login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>; logout: () => Promise<void>; isLoading: boolean; }
const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getProfile(userId: string, email: string): Promise<User | null> {
  const { data, error } = await (supabase as any).from('profiles').select('email, full_name, role').eq('user_id', userId).maybeSingle();
  if (error || !data || data.role === 'member') return null;
  return { email: data.email || email, name: data.full_name || email, role: data.role as UserRole };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [role, setRole] = useState<UserRole | null>(null); const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    const sync = async () => { const { data } = await supabase.auth.getSession(); const sessionUser = data.session?.user; const profile = sessionUser ? await getProfile(sessionUser.id, sessionUser.email ?? '') : null; if (mounted) { setUser(profile); setRole(profile?.role ?? null); setIsLoading(false); } };
    void sync();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void (async () => { const account = session?.user; const profile = account ? await getProfile(account.id, account.email ?? '') : null; if (mounted) { setUser(profile); setRole(profile?.role ?? null); setIsLoading(false); } })(); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);
  const login = useCallback(async (email: string, password: string) => { const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (error || !data.user) return { success: false, error: error?.message ?? 'Unable to sign in.' }; const profile = await getProfile(data.user.id, data.user.email ?? email); if (!profile) { await supabase.auth.signOut(); return { success: false, error: 'This account does not have staff access.' }; } setUser(profile); setRole(profile.role); return { success: true, role: profile.role }; }, []);
  const logout = useCallback(async () => { await supabase.auth.signOut(); setUser(null); setRole(null); }, []);
  return <AuthContext.Provider value={{ user, role, login, logout, isLoading }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used within AuthProvider'); return ctx; }
