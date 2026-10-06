import type { AdminActivityLog, AttendanceRecord, ConventionEvent, ConventionRole, ConventionRoleName, ConventionSettings, Executive, GeneratedLink, ManagedListItem, Member, Programme } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { DEFAULT_EVENT_ID, type AsyncDataRepository, type RepositoryEntity, type RepositoryRecordMap } from './DataRepository';

type Row = Record<string, unknown>;
const listKind = { bands: 'band', departments: 'department', churchGroups: 'church_group', churchLocations: 'church_location' } as const;

function iso(value: unknown) { return typeof value === 'string' ? value : new Date().toISOString(); }
function eventFrom(row: Row): ConventionEvent {
  return { id: String(row.id), eventId: String(row.id), name: String(row.name), theme: String(row.theme ?? ''), scripture: row.scripture as string | undefined, startDate: String(row.start_date), endDate: String(row.end_date), venue: String(row.venue ?? ''), description: row.description as string | undefined, maxAttendees: Number(row.max_attendees ?? 0), active: Boolean(row.is_active), createdAt: iso(row.created_at), updatedAt: iso(row.created_at), createdBy: 'database' };
}
function listFrom(row: Row) { return { id: String(row.id), eventId: String(row.event_id), name: String(row.name), active: Boolean(row.is_active), sortOrder: Number(row.sort_order), createdAt: iso(row.created_at), updatedAt: iso(row.created_at), createdBy: 'database' }; }

/** Network-backed implementation. RLS remains the source of authorization. */
export class SupabaseRepository implements AsyncDataRepository {
  currentEventId = '';
  private listeners = new Set<() => void>();
  private ready: Promise<void>;

  constructor() {
    this.ready = this.resolveActiveEvent();
  }

  async list<K extends RepositoryEntity>(entity: K, eventId?: string): Promise<RepositoryRecordMap[K][]> {
    await this.ready;
    const activeEvent = eventId ?? this.currentEventId;
    const db = supabase as any;
    if (entity === 'events') {
      const { data, error } = await db.from('events').select('*').order('start_date');
      if (error) throw error;
      return (data ?? []).map((row: Row) => eventFrom(row)) as RepositoryRecordMap[K][];
    }
    if (entity in listKind) {
      const { data, error } = await db.from('list_items').select('*').eq('event_id', activeEvent).eq('kind', listKind[entity as keyof typeof listKind]).order('sort_order');
      if (error) throw error;
      return (data ?? []).map((row: Row) => listFrom(row)) as RepositoryRecordMap[K][];
    }
    if (entity === 'programmes') {
      const { data, error } = await db.from('programmes').select('*').eq('event_id', activeEvent).order('day').order('sort_order');
      if (error) throw error;
      return (data ?? []).map((row: Row): Programme => ({ id: String(row.id), eventId: String(row.event_id), title: String(row.title), description: String(row.description ?? ''), date: String(row.day), startTime: String(row.start_time ?? ''), endTime: String(row.end_time ?? ''), location: String(row.location ?? ''), active: Boolean(row.is_active), sortOrder: Number(row.sort_order), createdAt: '', updatedAt: '', createdBy: 'database' })) as RepositoryRecordMap[K][];
    }
    if (entity === 'generatedLinks') {
      const { data, error } = await db.from('registration_links').select('*').eq('event_id', activeEvent).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: Row): GeneratedLink => ({ id: String(row.id), eventId: String(row.event_id), type: row.kind as GeneratedLink['type'], token: String(row.token), url: '', uses: Number(row.uses), status: row.is_active === true ? 'active' : 'expired', createdAt: iso(row.created_at), updatedAt: iso(row.created_at), createdBy: String(row.created_by ?? 'database') })) as RepositoryRecordMap[K][];
    }
    if (entity === 'members') return this.members(activeEvent) as Promise<RepositoryRecordMap[K][]>;
    if (entity === 'executives') return this.executives(activeEvent) as Promise<RepositoryRecordMap[K][]>;
    if (entity === 'attendance') {
      const { data, error } = await db.from('attendance').select('*').eq('event_id', activeEvent).order('checked_in_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: Row): AttendanceRecord => ({ id: String(row.id), eventId: String(row.event_id), memberId: String(row.member_id), memberName: '', checkInTime: iso(row.checked_in_at), verificationMethod: row.method === 'qr' ? 'qr_code' : row.method === 'member_id' ? 'manual' : row.method as AttendanceRecord['verificationMethod'], status: 'present', sessionName: 'Convention', createdAt: iso(row.checked_in_at), updatedAt: iso(row.checked_in_at), createdBy: String(row.operator_id ?? 'database') })) as RepositoryRecordMap[K][];
    }
    if (entity === 'conventionRoles') {
      const [{ data, error }, { data: profiles, error: profilesError }] = await Promise.all([
        db.from('convention_roles').select('*').eq('event_id', activeEvent),
        db.from('profiles').select('user_id,email'),
      ]);
      if (error) throw error;
      if (profilesError) throw profilesError;
      const emails = new Map<string, string>((profiles ?? []).map((profile: Row) => [String(profile.user_id), String(profile.email ?? '')]));
      return (data ?? []).map((row: Row): ConventionRole => ({ id: String(row.id), eventId: String(row.event_id), userEmail: emails.get(String(row.user_id)) ?? '', role: row.role as ConventionRole['role'], assignedBy: String(row.assigned_by ?? ''), assignedAt: iso(row.assigned_at), createdAt: iso(row.assigned_at), updatedAt: iso(row.assigned_at), createdBy: String(row.assigned_by ?? 'database') })) as RepositoryRecordMap[K][];
    }
    if (entity === 'adminActivities') {
      const { data, error } = await db.from('audit_log').select('*').eq('event_id', activeEvent).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: Row): AdminActivityLog => ({ id: String(row.id), eventId: String(row.event_id ?? activeEvent), actorEmail: '', actorName: 'Staff', action: 'role', target: `${row.action ?? 'Updated'} ${row.target_type ?? ''}`.trim(), createdAt: iso(row.created_at), updatedAt: iso(row.created_at), createdBy: String(row.actor_id ?? 'database') })) as RepositoryRecordMap[K][];
    }
    return [] as RepositoryRecordMap[K][];
  }

  async replace<K extends RepositoryEntity>(entity: K, records: RepositoryRecordMap[K][]) {
    for (const record of records) await this.write(entity, record as never);
  }

  async write<K extends RepositoryEntity>(entity: K, record: any): Promise<RepositoryRecordMap[K]> {
    await this.ready;
    const db = supabase as any;
    const eventId = record.eventId ?? this.currentEventId;
    let table = '';
    let payload: Row = {};
    if (entity in listKind) { table = 'list_items'; payload = { id: record.id, event_id: eventId, kind: listKind[entity as keyof typeof listKind], name: record.name, is_active: record.active, sort_order: record.sortOrder }; }
    else if (entity === 'programmes') { table = 'programmes'; payload = { id: record.id, event_id: eventId, title: record.title, description: record.description || null, day: record.date, start_time: record.startTime || null, end_time: record.endTime || null, location: record.location || null, is_active: record.active, sort_order: record.sortOrder }; }
    else if (entity === 'events') { table = 'events'; payload = { id: record.id, slug: record.id === this.currentEventId ? 'mosyf-2026' : record.id, name: record.name, theme: record.theme, scripture: record.scripture || null, start_date: record.startDate, end_date: record.endDate, venue: record.venue || null, description: record.description || null, max_attendees: record.maxAttendees || null, is_active: record.active }; }
    else throw new Error(`${entity} writes are performed by Supabase RPCs or Edge Functions.`);
    const { data, error } = await db.from(table).upsert(payload).select().single();
    if (error) throw error;
    this.emit();
    return data as RepositoryRecordMap[K];
  }

  async getSettings(): Promise<ConventionSettings | null> {
    await this.ready;
    const db = supabase as any;
    const { data, error } = await db.from('events').select('*').eq('id', this.currentEventId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const event = eventFrom(data);
    return { id: event.id, eventId: event.id, name: event.name, theme: event.theme, scripture: event.scripture, startDate: event.startDate, endDate: event.endDate, location: event.venue, isActive: event.active, maxAttendees: event.maxAttendees, sessions: [], createdAt: event.createdAt, updatedAt: event.updatedAt, createdBy: 'database' };
  }

  async setSettings(settings: ConventionSettings) {
    await this.write('events', { ...settings, id: settings.eventId ?? this.currentEventId, venue: settings.location, active: settings.isActive } as any);
    return settings;
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  async saveListItem(entity: keyof typeof listKind, item: ManagedListItem) {
    await this.ready;
    const { data, error } = await (supabase as any).from('list_items').upsert({
      id: item.id,
      event_id: this.currentEventId,
      kind: listKind[entity],
      name: item.name.trim(),
      is_active: item.active,
      sort_order: item.sortOrder,
    }).select().single();
    if (error) throw error;
    this.emit();
    return listFrom(data);
  }

  async deleteListItem(entity: keyof typeof listKind, item: ManagedListItem) {
    await this.ready;
    const db = supabase as any;
    const { error } = await db.from('list_items').delete().eq('id', item.id).eq('event_id', this.currentEventId).eq('kind', listKind[entity]);
    if (!error) { this.emit(); return { deactivated: false }; }
    const isReferenceError = error.code === '23503';
    if (!isReferenceError) throw error;
    const { error: deactivateError } = await db.from('list_items').update({ is_active: false }).eq('id', item.id).eq('event_id', this.currentEventId);
    if (deactivateError) throw deactivateError;
    this.emit();
    return { deactivated: true };
  }

  async saveProgramme(programme: Programme) {
    await this.ready;
    const { error } = await (supabase as any).from('programmes').upsert({
      id: programme.id,
      event_id: this.currentEventId,
      title: programme.title,
      description: programme.description || null,
      day: programme.date,
      start_time: programme.startTime || null,
      end_time: programme.endTime || null,
      location: programme.location || null,
      is_active: programme.active,
      sort_order: programme.sortOrder,
    });
    if (error) throw error;
    this.emit();
  }

  async deleteProgramme(id: string) {
    await this.ready;
    const { error } = await (supabase as any).from('programmes').delete().eq('id', id).eq('event_id', this.currentEventId);
    if (error) throw error;
    this.emit();
  }

  async assignConventionRole(userEmail: string, role: ConventionRoleName) {
    await this.ready;
    const db = supabase as any;
    const { data: profile, error: profileError } = await db.from('profiles').select('user_id,email').ilike('email', userEmail.trim()).maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.user_id) throw new Error('No account with that email. Create the user in Supabase first.');
    const { error } = await db.from('convention_roles').insert({ event_id: this.currentEventId, user_id: profile.user_id, role });
    if (error) throw error;
    this.emit();
  }

  async revokeConventionRole(id: string) {
    await this.ready;
    const { error } = await (supabase as any).from('convention_roles').delete().eq('id', id).eq('event_id', this.currentEventId);
    if (error) throw error;
    this.emit();
  }

  async updateMember(id: string, updates: Partial<Member>) {
    await this.ready;
    const payload: Row = {};
    if (updates.fullName !== undefined) payload.full_name = updates.fullName;
    if (updates.phoneNumber !== undefined) payload.phone = updates.phoneNumber;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.address !== undefined) payload.address = updates.address;
    if (updates.occupation !== undefined) payload.occupation = updates.occupation;
    const { error } = await (supabase as any).from('members').update(payload).eq('id', id).eq('event_id', this.currentEventId);
    if (error) throw error;
    this.emit();
  }

  async deleteMember(id: string) {
    await this.ready;
    const db = supabase as any;
    const [{ count: attendanceCount, error: attendanceError }, { count: claimsCount, error: claimsError }] = await Promise.all([
      db.from('attendance').select('*', { count: 'exact', head: true }).eq('member_id', id).eq('event_id', this.currentEventId),
      db.from('resource_claims').select('*', { count: 'exact', head: true }).eq('member_id', id).eq('event_id', this.currentEventId),
    ]);
    if (attendanceError ?? claimsError) throw attendanceError ?? claimsError;
    if ((attendanceCount ?? 0) > 0 || (claimsCount ?? 0) > 0) throw new Error('This member has attendance or claim records and cannot be deleted. Archiving requires a schema migration.');
    const { error } = await db.from('members').delete().eq('id', id).eq('event_id', this.currentEventId);
    if (error) throw error;
    this.emit();
  }

  private async resolveActiveEvent() {
    const db = supabase as any;
    const { data, error } = await db.from('events').select('id').eq('is_active', true).maybeSingle();
    if (error) throw error;
    this.currentEventId = data?.id ?? DEFAULT_EVENT_ID;
  }
  private async members(eventId: string): Promise<Member[]> {
    const db = supabase as any;
    const [{ data: rows, error }, { data: lists }, { data: memberships, error: departmentsError }] = await Promise.all([
      db.from('members').select('*').eq('event_id', eventId),
      db.from('list_items').select('*').eq('event_id', eventId),
      db.from('member_departments').select('member_id, department_id'),
    ]);
    if (error) throw error;
    if (departmentsError) throw departmentsError;
    const labels = new Map((lists ?? []).map((row: Row) => [row.id, row.name]));
    const departmentsByMember = new Map<string, string[]>();
    for (const membership of memberships ?? []) {
      const memberId = String((membership as Row).member_id);
      const department = labels.get((membership as Row).department_id);
      if (department) departmentsByMember.set(memberId, [...(departmentsByMember.get(memberId) ?? []), String(department)]);
    }
    return (rows ?? []).map((row: Row): Member => ({ id: String(row.id), eventId: String(row.event_id), statusToken: String(row.status_token), fullName: String(row.full_name), phoneNumber: String(row.phone ?? ''), email: String(row.email), gender: row.gender === 'female' ? 'Female' : 'Male', dateOfBirth: String(row.date_of_birth ?? ''), address: String(row.address ?? ''), occupation: String(row.occupation ?? ''), emergencyContact: String(row.emergency_contact ?? ''), churchBranch: String(labels.get(row.church_location_id) ?? ''), fellowshipBand: (labels.get(row.band_id) ?? 'None') as Member['fellowshipBand'], departments: (departmentsByMember.get(String(row.id)) ?? []) as Member['departments'], isFirstTimer: Boolean(row.is_first_timer), wantsPermanentMembership: Boolean(row.wants_permanent), conventionGroup: `Group ${row.convention_group}` as Member['conventionGroup'], registeredAt: iso(row.created_at), qrCode: String(row.member_code), biometricStatus: row.biometric_status === 'verified' ? 'verified_checked_in' : 'pending_verification', createdAt: iso(row.created_at), updatedAt: iso(row.created_at), createdBy: 'database' }));
  }
  private async executives(eventId: string): Promise<Executive[]> {
    const db = supabase as any;
    const [members, profiles] = await Promise.all([this.members(eventId), db.from('executive_profiles').select('*')]);
    if (profiles.error) throw profiles.error;
    const byMember = new Map(members.map(member => [member.id, member]));
    return (profiles.data ?? []).flatMap((profile: Row): Executive[] => {
      const member = byMember.get(String(profile.member_id));
      return member ? [{ id: String(profile.exec_code), eventId: member.eventId, statusToken: member.statusToken, fullName: member.fullName, leadershipRole: String(profile.leadership_role), department: member.departments[0] ?? 'None', fellowshipBand: member.fellowshipBand, phoneNumber: member.phoneNumber, email: member.email, address: member.address, registeredAt: member.registeredAt, registrationStatus: profile.approval === 'approved' ? 'admin' : 'executive', createdAt: iso(profile.created_at), updatedAt: iso(profile.created_at), createdBy: 'database' }] : [];
    });
  }
  private emit() { this.listeners.forEach(listener => listener()); }
}
