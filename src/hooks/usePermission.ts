import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { type Permission } from '@/lib/permissions';
import { supabase } from '@/lib/supabase/client';

/** Client-side convention-role gate. Supabase RLS will enforce this server-side later. */
export function usePermission(permission: Permission) {
  const { user } = useAuth(); const [allowed, setAllowed] = useState(false);

  useEffect(() => { let active = true; void (async () => { const { data: session } = await supabase.auth.getUser(); if (!session.user) return; const { data } = await (supabase as any).from('convention_roles').select('role, events!inner(is_active)').eq('user_id', session.user.id).eq('events.is_active', true); if (active) setAllowed((data ?? []).some((role: { role: string }) => role.role === ({ register: 'registration_desk', verify: 'verification_operator', claim_food: 'food_distributor', claim_souvenir: 'souvenir_distributor', record_activity: 'activity_coordinator', view_analytics: 'viewer', export: 'viewer' } as Record<Permission, string>)[permission])); })(); return () => { active = false; }; }, [permission]);
  return user?.role === 'super_admin' || user?.role === 'admin' || allowed;
}
