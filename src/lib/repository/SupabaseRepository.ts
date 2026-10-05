/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AdminActivityLog, AttendanceRecord, ConventionEvent, ConventionRole, ConventionSettings, Executive, GeneratedLink, Member, Programme } from '@/types';
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
      const { data, error } = await db.from('convention_roles').select('*').eq('event_id', activeEvent);
      if (error) throw error;
      return (data ?? []).map((row: Row): ConventionRole => ({ id: String(row.id), eventId: String(row.event_id), userEmail: '', role: row.role as ConventionRole['role'], assignedBy: String(row.assigned_by ?? ''), assignedAt: iso(row.assigned_at), createdAt: iso(row.assigned_at), updatedAt: iso(row.assigned_at), createdBy: String(row.assigned_by ?? 'database') })) as RepositoryRecordMap[K][];
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
