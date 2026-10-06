import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  AccessItemType,
  AdminActivityLog,
  BiometricDevice,
  BiometricLog,
  Member,
  Executive,
  AttendanceRecord,
  FirstTimer,
  ConventionSettings,
  FellowshipBand,
  ConventionGroup,
  GeneratedLink,
  Band,
  DepartmentItem,
  ChurchGroup,
  ChurchLocation,
  Programme,
  ConventionRole,
  ConventionRoleName,
  Department,
} from '@/types';
import { dataBackend, localStorageRepository, SupabaseRepository } from '@/lib/repository';
import { assignConventionGroup as assignLeastPopulatedGroup } from '@/lib/groups';
import { supabase } from '@/lib/supabase/client';

interface AppDataContextType {
  currentEventId: string;
  members: Member[];
  executives: Executive[];
  attendance: AttendanceRecord[];
  biometricLogs: BiometricLog[];
  biometricDevices: BiometricDevice[];
  adminActivities: AdminActivityLog[];
  firstTimers: FirstTimer[];
  conventionSettings: ConventionSettings;
  generatedLinks: GeneratedLink[];
  bands: Band[];
  departments: DepartmentItem[];
  churchGroups: ChurchGroup[];
  churchLocations: ChurchLocation[];
  programmes: Programme[];
  conventionRoles: ConventionRole[];
  findAttendeeByStatusToken: (token: string | undefined) => { type: 'member'; attendee: Member } | { type: 'executive'; attendee: Executive } | null;
  getStatusUrl: (attendee: Member | Executive) => string;
  addMember: (member: Omit<Member, 'id' | 'conventionGroup' | 'registeredAt' | 'qrCode'>) => Member;
  addExecutive: (executive: Omit<Executive, 'id' | 'registeredAt'>) => Executive;
  addAttendance: (record: Omit<AttendanceRecord, 'id'>) => AttendanceRecord;
  verifyMemberBiometric: (memberId: string, actorEmail: string, actorName: string) => { ok: boolean; duplicate: boolean; message: string };
  claimAccessItem: (memberId: string, item: AccessItemType, actorEmail: string, actorName: string) => { ok: boolean; message: string };
  promoteExecutiveToAdmin: (executiveId: string, actorEmail: string, actorName: string) => void;
  revokeExecutiveAdmin: (executiveId: string, actorEmail: string, actorName: string) => void;
  addFirstTimer: (firstTimer: Omit<FirstTimer, 'id'>) => FirstTimer;
  updateConventionSettings: (settings: Partial<ConventionSettings>) => void;
  assignExecutiveRole: (executiveId: string, leadershipRole: string, actorEmail: string, actorName: string) => void;
  validateGeneratedLink: (type: GeneratedLink['type'], token: string | null) => GeneratedLink | null;
  recordGeneratedLinkUse: (id: string) => void;
  deleteMember: (id: string) => Promise<void>;
  deleteExecutive: (id: string) => void;
  updateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  generateMemberId: () => string;
  assignConventionGroup: (band: FellowshipBand) => ConventionGroup;
  saveListItem: (entity: 'bands' | 'departments' | 'churchGroups' | 'churchLocations', item: Partial<Band> & Pick<Band, 'name'>, actorEmail: string, actorName: string) => Promise<void>;
  deleteListItem: (entity: 'bands' | 'departments' | 'churchGroups' | 'churchLocations', id: string, actorEmail: string, actorName: string) => Promise<{ ok: boolean; message?: string }>;
  saveProgramme: (programme: Partial<Programme> & Pick<Programme, 'title' | 'date' | 'startTime' | 'endTime' | 'location'>, actorEmail: string, actorName: string) => Promise<void>;
  deleteProgramme: (id: string, actorEmail: string, actorName: string) => Promise<void>;
  assignConventionRole: (userEmail: string, role: ConventionRoleName, actorEmail: string, actorName: string) => Promise<void>;
  revokeConventionRole: (id: string, actorEmail: string, actorName: string) => Promise<void>;
}

const DEFAULT_SETTINGS: ConventionSettings = {
  name: '', startDate: '', endDate: '', location: '', theme: '', scripture: '', isActive: false, maxAttendees: 0, sessions: [],
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);
const MEMBERS_STORAGE_KEY = 'mosyf-members';
const EXECUTIVES_STORAGE_KEY = 'mosyf-executives';
const FIRST_TIMERS_STORAGE_KEY = 'mosyf-first-timers';
const GENERATED_LINKS_STORAGE_KEY = 'mosyf-generated-links';
const ATTENDANCE_STORAGE_KEY = 'mosyf-attendance';
const BIOMETRIC_LOGS_STORAGE_KEY = 'mosyf-biometric-logs';
const ADMIN_ACTIVITIES_STORAGE_KEY = 'mosyf-admin-activities';
const CONVENTION_SETTINGS_STORAGE_KEY = 'mosyf-convention-settings';
const STORAGE_ENTITIES = {
  [MEMBERS_STORAGE_KEY]: 'members',
  [EXECUTIVES_STORAGE_KEY]: 'executives',
  [ATTENDANCE_STORAGE_KEY]: 'attendance',
  [BIOMETRIC_LOGS_STORAGE_KEY]: 'biometricLogs',
  [ADMIN_ACTIVITIES_STORAGE_KEY]: 'adminActivities',
  [FIRST_TIMERS_STORAGE_KEY]: 'firstTimers',
  [GENERATED_LINKS_STORAGE_KEY]: 'generatedLinks',
} as const;

const DEFAULT_BIOMETRIC_DEVICES: BiometricDevice[] = [];

function readStoredList<T>(key: string, fallback: T[]): T[] {
  const entity = STORAGE_ENTITIES[key as keyof typeof STORAGE_ENTITIES];
  if (!entity) return fallback;
  const records = localStorageRepository.list(entity) as T[];
  return records.length ? records : fallback;
}

function readStoredValue<T>(key: string, fallback: T): T {
  if (key !== CONVENTION_SETTINGS_STORAGE_KEY) return fallback;
  const stored = localStorageRepository.getSettings();
  return stored ? { ...fallback, ...stored } as T : fallback;
}

function createSecureToken(prefix: 'mem' | 'exec') {
  const bytes = new Uint8Array(18);
  window.crypto?.getRandomValues?.(bytes);
  const random = Array.from(bytes, byte => byte.toString(36).padStart(2, '0')).join('');
  return `${prefix}_${random}_${Date.now().toString(36)}`;
}

function ensureMemberTokens(members: Member[]) {
  return members.map(member => ({
    ...member,
    statusToken: member.statusToken ?? createSecureToken('mem'),
    qrCode: member.qrCode || member.id,
    biometricStatus: member.biometricStatus ?? 'pending_verification',
    accessClaims: member.accessClaims ?? {},
  }));
}

function ensureExecutiveTokens(executives: Executive[]) {
  return executives.map(exec => ({
    ...exec,
    statusToken: exec.statusToken ?? createSecureToken('exec'),
    registrationStatus: exec.registrationStatus ?? 'executive',
    accessClaims: exec.accessClaims ?? {},
  }));
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const useSupabase = dataBackend === 'supabase';
  const [supabaseRepository] = useState(() => useSupabase ? new SupabaseRepository() : null);
  const [currentEventId, setCurrentEventId] = useState(localStorageRepository.currentEventId);
  const [members, setMembers] = useState<Member[]>(() => useSupabase ? [] : ensureMemberTokens(readStoredList<Member>(MEMBERS_STORAGE_KEY, [])));
  const [executives, setExecutives] = useState<Executive[]>(() => useSupabase ? [] : ensureExecutiveTokens(readStoredList<Executive>(EXECUTIVES_STORAGE_KEY, [])));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => useSupabase ? [] : readStoredList<AttendanceRecord>(ATTENDANCE_STORAGE_KEY, []));
  const [biometricLogs, setBiometricLogs] = useState<BiometricLog[]>(() => useSupabase ? [] : readStoredList<BiometricLog>(BIOMETRIC_LOGS_STORAGE_KEY, []));
  const [biometricDevices, setBiometricDevices] = useState<BiometricDevice[]>(DEFAULT_BIOMETRIC_DEVICES);
  const [adminActivities, setAdminActivities] = useState<AdminActivityLog[]>(() => useSupabase ? [] : readStoredList<AdminActivityLog>(ADMIN_ACTIVITIES_STORAGE_KEY, []));
  const [firstTimers, setFirstTimers] = useState<FirstTimer[]>(() => useSupabase ? [] : readStoredList<FirstTimer>(FIRST_TIMERS_STORAGE_KEY, []));
  const [conventionSettings, setConventionSettings] = useState<ConventionSettings>(() => useSupabase ? { ...DEFAULT_SETTINGS, name: '', location: '', sessions: [] } : readStoredValue<ConventionSettings>(CONVENTION_SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS));
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>(() => useSupabase ? [] : readStoredList<GeneratedLink>(GENERATED_LINKS_STORAGE_KEY, []));
  const [bands, setBands] = useState<Band[]>(() => useSupabase ? [] : localStorageRepository.list('bands'));
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => useSupabase ? [] : localStorageRepository.list('departments'));
  const [churchGroups, setChurchGroups] = useState<ChurchGroup[]>(() => useSupabase ? [] : localStorageRepository.list('churchGroups'));
  const [churchLocations, setChurchLocations] = useState<ChurchLocation[]>(() => useSupabase ? [] : localStorageRepository.list('churchLocations'));
  const [programmes, setProgrammes] = useState<Programme[]>(() => useSupabase ? [] : localStorageRepository.list('programmes'));
  const [conventionRoles, setConventionRoles] = useState<ConventionRole[]>(() => useSupabase ? [] : localStorageRepository.list('conventionRoles'));

  useEffect(() => {
    if (!supabaseRepository) return;
    Object.keys(window.localStorage).filter(key => key.startsWith('mosyf') && key !== 'mosyf-theme').forEach(key => window.localStorage.removeItem(key));
    let active = true;
    const load = async () => {
      try {
        const [events, remoteMembers, remoteExecutives, remoteAttendance, remoteActivities, remoteLinks, remoteBands, remoteDepartments, remoteGroups, remoteLocations, remoteProgrammes, remoteRoles, settings] = await Promise.all([
          supabaseRepository.list('events'), supabaseRepository.list('members'), supabaseRepository.list('executives'), supabaseRepository.list('attendance'), supabaseRepository.list('adminActivities'), supabaseRepository.list('generatedLinks'), supabaseRepository.list('bands'), supabaseRepository.list('departments'), supabaseRepository.list('churchGroups'), supabaseRepository.list('churchLocations'), supabaseRepository.list('programmes'), supabaseRepository.list('conventionRoles'), supabaseRepository.getSettings(),
        ]);
        if (!active) return;
        const currentEvent = events.find(event => event.active);
        if (currentEvent) setCurrentEventId(currentEvent.id);
        setMembers(remoteMembers); setExecutives(remoteExecutives); setAttendance(remoteAttendance); setAdminActivities(remoteActivities); setGeneratedLinks(remoteLinks);
        setBands(remoteBands); setDepartments(remoteDepartments); setChurchGroups(remoteGroups); setChurchLocations(remoteLocations); setProgrammes(remoteProgrammes); setConventionRoles(remoteRoles);
        if (settings) setConventionSettings(settings);
      } catch (error) { console.error('Unable to load convention data from Supabase.', error); }
    };
    void load();
    const channel = supabase.channel('mosyf-list-items').on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, () => { void load(); }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [supabaseRepository]);

  useEffect(() => {
    if (useSupabase) return;
    const unsubscribe = localStorageRepository.subscribe(() => {
    setBands(localStorageRepository.list('bands'));
    setDepartments(localStorageRepository.list('departments'));
    setChurchGroups(localStorageRepository.list('churchGroups'));
    setChurchLocations(localStorageRepository.list('churchLocations'));
    setProgrammes(localStorageRepository.list('programmes'));
      setConventionRoles(localStorageRepository.list('conventionRoles'));
    });
    return () => { unsubscribe(); };
  }, [useSupabase]);

  useEffect(() => {
    if (useSupabase) return;
    try {
      localStorageRepository.replace('members', members);
    } catch (error) {
      console.warn('Unable to persist members locally.', error);
    }
  }, [members, useSupabase]);

  useEffect(() => {
    if (useSupabase) return;
    try {
      localStorageRepository.replace('executives', executives);
    } catch (error) {
      console.warn('Unable to persist executives locally.', error);
    }
  }, [executives, useSupabase]);

  useEffect(() => {
    if (useSupabase) return;
    try {
      localStorageRepository.replace('attendance', attendance);
    } catch (error) {
      console.warn('Unable to persist attendance locally.', error);
    }
  }, [attendance, useSupabase]);

  useEffect(() => {
    if (useSupabase) return;
    try {
      localStorageRepository.replace('biometricLogs', biometricLogs);
    } catch (error) {
      console.warn('Unable to persist biometric logs locally.', error);
    }
  }, [biometricLogs, useSupabase]);

  useEffect(() => {
    if (useSupabase) return;
    try {
      localStorageRepository.replace('adminActivities', adminActivities);
    } catch (error) {
      console.warn('Unable to persist admin activities locally.', error);
    }
  }, [adminActivities, useSupabase]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setBiometricDevices(prev => prev.map(device => ({
        ...device,
        status: device.id === 'bio-bridge-01' ? 'online' : device.status,
        lastHeartbeat: new Date().toISOString(),
      })));
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (useSupabase) return;
    try {
      localStorageRepository.replace('firstTimers', firstTimers);
    } catch (error) {
      console.warn('Unable to persist first timers locally.', error);
    }
  }, [firstTimers, useSupabase]);

  useEffect(() => {
    if (useSupabase) return;
    try {
      localStorageRepository.replace('generatedLinks', generatedLinks);
    } catch (error) {
      console.warn('Unable to persist generated links locally.', error);
    }
  }, [generatedLinks, useSupabase]);

  useEffect(() => {
    if (useSupabase) return;
    try {
      localStorageRepository.setSettings(conventionSettings);
    } catch (error) {
      console.warn('Unable to persist convention settings locally.', error);
    }
  }, [conventionSettings, useSupabase]);

  const generateMemberId = useCallback(() => {
    const highest = members.reduce((max, member) => {
      const match = member.id.match(/^MOSYF-2026-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const nextNum = highest + 1;
    return `MOSYF-2026-${String(nextNum).padStart(4, '0')}`;
  }, [members]);

  const assignConventionGroup = useCallback((band: FellowshipBand): ConventionGroup => {
    return assignLeastPopulatedGroup(band, members);
  }, [members]);

  const addMember = useCallback((memberData: Omit<Member, 'id' | 'conventionGroup' | 'registeredAt' | 'qrCode'>): Member => {
    const normalizedEmail = memberData.email.trim().toLowerCase();
    if (members.some(member => member.email.trim().toLowerCase() === normalizedEmail)) {
      throw new Error('A member has already registered with this email address.');
    }
    const id = generateMemberId();
    const group = assignConventionGroup(memberData.fellowshipBand);
    const newMember: Member = {
      ...memberData,
      email: normalizedEmail,
      id,
      conventionGroup: group,
      registeredAt: new Date().toISOString(),
      statusToken: createSecureToken('mem'),
      qrCode: id,
      biometricStatus: 'pending_verification',
      accessClaims: {},
    };
    setMembers(prev => [...prev, newMember]);
    return newMember;
  }, [members, generateMemberId, assignConventionGroup]);

  const addExecutive = useCallback((execData: Omit<Executive, 'id' | 'registeredAt'>): Executive => {
    const normalizedEmail = execData.email.trim().toLowerCase();
    if (executives.some(exec => exec.email.trim().toLowerCase() === normalizedEmail)) {
      throw new Error('An executive has already registered with this email address.');
    }
    const highest = executives.reduce((max, exec) => {
      const match = exec.id.match(/^MOSYF-ESC-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const nextNum = highest + 1;
    const id = `MOSYF-ESC-${String(nextNum).padStart(4, '0')}`;
    const newExec: Executive = {
      ...execData,
      email: normalizedEmail,
      id,
      statusToken: createSecureToken('exec'),
      registeredAt: new Date().toISOString(),
      registrationStatus: 'executive',
      accessClaims: {},
    };
    setExecutives(prev => [...prev, newExec]);
    return newExec;
  }, [executives]);

  const addAttendance = useCallback((record: Omit<AttendanceRecord, 'id'>): AttendanceRecord => {
    const id = `ATT-${String(attendance.length + 1).padStart(4, '0')}`;
    const newRecord = { ...record, id };
    setAttendance(prev => [newRecord, ...prev]);
    return newRecord;
  }, [attendance.length]);

  const addAdminActivity = useCallback((actorEmail: string, actorName: string, action: AdminActivityLog['action'], target: string) => {
    setAdminActivities(prev => [{
      id: `ACT-${Date.now()}`,
      actorEmail,
      actorName,
      action,
      target,
      createdAt: new Date().toISOString(),
    }, ...prev].slice(0, 80));
  }, []);

  const verifyMemberBiometric = useCallback((memberId: string, actorEmail: string, actorName: string) => {
    const member = members.find(m => m.id === memberId);
    const scannerId = biometricDevices.find(device => device.status === 'online')?.id ?? 'offline';
    if (!member) {
      return { ok: false, duplicate: false, message: 'Member not found' };
    }

    const today = new Date().toDateString();
    const duplicate = attendance.some(record => record.memberId === memberId && new Date(record.checkInTime).toDateString() === today);
    const now = new Date().toISOString();

    if (duplicate) {
      setMembers(prev => prev.map(item => item.id === memberId ? { ...item, biometricStatus: 'duplicate_attempt' } : item));
      setBiometricLogs(prev => [{
        id: `BIO-${Date.now()}`,
        memberId,
        memberName: member.fullName,
        scannerId,
        status: 'duplicate' as const,
        message: 'Duplicate attendance attempt detected',
        createdAt: now,
      }, ...prev].slice(0, 100));
      addAdminActivity(actorEmail, actorName, 'verification', `${member.fullName} duplicate biometric attempt`);
      return { ok: false, duplicate: true, message: 'Duplicate attendance attempt detected' };
    }

    const templateId = member.fingerprintTemplateId ?? `TPL-${memberId.replace(/[^A-Z0-9]/gi, '')}`;
    const newRecord: AttendanceRecord = {
      id: `ATT-${String(attendance.length + 1).padStart(4, '0')}`,
      memberId,
      memberName: member.fullName,
      checkInTime: now,
      verificationMethod: 'biometric',
      status: 'present',
      sessionName: 'Biometric Convention Entry',
    };

    setMembers(prev => prev.map(item => item.id === memberId ? {
      ...item,
      biometricStatus: 'verified_checked_in',
      fingerprintTemplateId: templateId,
      lastVerifiedAt: now,
    } : item));
    setAttendance(prev => [newRecord, ...prev]);
    setBiometricLogs(prev => [{
      id: `BIO-${Date.now()}`,
      memberId,
      memberName: member.fullName,
      scannerId,
      status: 'success' as const,
      message: 'Fingerprint captured, enrolled, and checked in',
      createdAt: now,
    }, ...prev].slice(0, 100));
    addAdminActivity(actorEmail, actorName, 'verification', `${member.fullName} biometric verified`);
    return { ok: true, duplicate: false, message: 'Biometric verified and attendance recorded' };
  }, [members, biometricDevices, attendance, addAdminActivity]);

  const claimAccessItem = useCallback((memberId: string, item: AccessItemType, actorEmail: string, actorName: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return { ok: false, message: 'Member not found' };
    if (member.biometricStatus !== 'verified_checked_in') {
      return { ok: false, message: 'Biometric verification required before access is granted' };
    }
    if (member.accessClaims?.[item]) {
      return { ok: false, message: `${item.charAt(0).toUpperCase() + item.slice(1)} Already Collected` };
    }
    const now = new Date().toISOString();
    setMembers(prev => prev.map(row => row.id === memberId ? {
      ...row,
      accessClaims: { ...(row.accessClaims ?? {}), [item]: now },
    } : row));
    addAdminActivity(actorEmail, actorName, 'access', `${member.fullName} ${item} access granted`);
    return { ok: true, message: `${item.charAt(0).toUpperCase() + item.slice(1)} access granted` };
  }, [members, addAdminActivity]);

  const promoteExecutiveToAdmin = useCallback((executiveId: string, actorEmail: string, actorName: string) => {
    const executive = executives.find(exec => exec.id === executiveId);
    if (!executive) return;
    const now = new Date().toISOString();
    setExecutives(prev => prev.map(exec => exec.id === executiveId ? {
      ...exec,
      registrationStatus: 'admin',
      adminGrantedAt: now,
      adminRevokedAt: undefined,
    } : exec));
    addAdminActivity(actorEmail, actorName, 'role', `${executive.fullName} granted admin access`);
  }, [executives, addAdminActivity]);

  const revokeExecutiveAdmin = useCallback((executiveId: string, actorEmail: string, actorName: string) => {
    const executive = executives.find(exec => exec.id === executiveId);
    if (!executive) return;
    const now = new Date().toISOString();
    setExecutives(prev => prev.map(exec => exec.id === executiveId ? {
      ...exec,
      registrationStatus: 'executive',
      adminRevokedAt: now,
    } : exec));
    addAdminActivity(actorEmail, actorName, 'role', `${executive.fullName} admin access revoked`);
  }, [executives, addAdminActivity]);

  const addFirstTimer = useCallback((ft: Omit<FirstTimer, 'id'>): FirstTimer => {
    const id = `FT-${String(firstTimers.length + 1).padStart(4, '0')}`;
    const newFt = { ...ft, id };
    setFirstTimers(prev => [...prev, newFt]);
    return newFt;
  }, [firstTimers.length]);

  const updateConventionSettings = useCallback((settings: Partial<ConventionSettings>) => {
    setConventionSettings(prev => ({ ...prev, ...settings }));
  }, []);

  const assignExecutiveRole = useCallback((executiveId: string, leadershipRole: string, actorEmail: string, actorName: string) => {
    const executive = executives.find(exec => exec.id === executiveId);
    if (!executive) return;

    setExecutives(prev => prev.map(exec => exec.id === executiveId ? {
      ...exec,
      leadershipRole,
    } : exec));
    addAdminActivity(actorEmail, actorName, 'role', `${executive.fullName} assigned role: ${leadershipRole}`);
  }, [executives, addAdminActivity]);

  const validateGeneratedLink = useCallback((type: GeneratedLink['type'], token: string | null): GeneratedLink | null => {
    if (!token) return null;
    return generatedLinks.find(link => link.type === type && link.token === token && link.status === 'active') ?? null;
  }, [generatedLinks]);

  const recordGeneratedLinkUse = useCallback((id: string) => {
    setGeneratedLinks(prev => prev.map(link => link.id === id ? { ...link, uses: link.uses + 1 } : link));
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    if (supabaseRepository) {
      await supabaseRepository.deleteMember(id);
      setMembers(await supabaseRepository.list('members'));
      return;
    }
    setMembers(prev => prev.filter(m => m.id !== id));
  }, [supabaseRepository]);

  const deleteExecutive = useCallback((id: string) => {
    setExecutives(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateMember = useCallback(async (id: string, updates: Partial<Member>) => {
    if (supabaseRepository) {
      await supabaseRepository.updateMember(id, updates);
      setMembers(await supabaseRepository.list('members'));
      return;
    }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, [supabaseRepository]);

  const addListActivity = useCallback((actorEmail: string, actorName: string, target: string) => {
    setAdminActivities(prev => [{ id: crypto.randomUUID(), eventId: currentEventId, actorEmail, actorName, action: 'role' as const, target, createdAt: new Date().toISOString() }, ...prev].slice(0, 80));
  }, [currentEventId]);

  const saveListItem = useCallback(async (entity: 'bands' | 'departments' | 'churchGroups' | 'churchLocations', item: Partial<Band> & Pick<Band, 'name'>, actorEmail: string, actorName: string) => {
    const collections = { bands, departments, churchGroups, churchLocations };
    const current = collections[entity];
    const name = item.name.trim();
    const title = entity === 'bands' ? 'Bands' : entity === 'departments' ? 'Departments' : entity === 'churchGroups' ? 'Groups' : 'Locations';
    if (current.some(row => row.name.trim().toLowerCase() === name.toLowerCase() && row.id !== item.id)) throw new Error(`"${name}" already exists in ${title}.`);
    const record = { ...item, id: item.id ?? crypto.randomUUID(), eventId: currentEventId, name, active: item.active ?? true, sortOrder: item.sortOrder ?? current.length } as Band;
    try {
      if (supabaseRepository) {
        await supabaseRepository.saveListItem(entity, record);
        const refreshed = await supabaseRepository.list(entity);
        if (entity === 'bands') setBands(refreshed as Band[]);
        if (entity === 'departments') setDepartments(refreshed as DepartmentItem[]);
        if (entity === 'churchGroups') setChurchGroups(refreshed as ChurchGroup[]);
        if (entity === 'churchLocations') setChurchLocations(refreshed as ChurchLocation[]);
      } else localStorageRepository.write(entity, record as never, actorEmail);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505') throw new Error(`"${name}" already exists in ${title}.`);
      throw error;
    }
    addListActivity(actorEmail, actorName, 'Updated ' + entity + ': ' + name);
  }, [addListActivity, bands, churchGroups, churchLocations, currentEventId, departments, supabaseRepository]);

  const deleteListItem = useCallback(async (entity: 'bands' | 'departments' | 'churchGroups' | 'churchLocations', id: string, actorEmail: string, actorName: string) => {
    const records = ({ bands, departments, churchGroups, churchLocations }[entity]);
    const item = records.find(row => row.id === id);
    if (!item) return { ok: false, message: 'List item not found.' };
    const referenced = entity === 'bands' ? members.some(row => row.fellowshipBand === item.name) || executives.some(row => row.fellowshipBand === item.name)
      : entity === 'departments' ? members.some(row => row.departments.includes(item.name as Department)) || executives.some(row => row.department === item.name)
      : entity === 'churchGroups' ? members.some(row => row.conventionGroup === item.name)
      : members.some(row => row.churchBranch === item.name);
    if (referenced && !supabaseRepository) {
      localStorageRepository.write(entity, { ...item, active: false } as never, actorEmail);
      addListActivity(actorEmail, actorName, 'Deactivated ' + entity + ': ' + item.name);
      return { ok: false, message: 'This item is in use and was deactivated instead.' };
    }
    if (supabaseRepository) {
      const result = await supabaseRepository.deleteListItem(entity, item);
      const refreshed = await supabaseRepository.list(entity);
      if (entity === 'bands') setBands(refreshed as Band[]);
      if (entity === 'departments') setDepartments(refreshed as DepartmentItem[]);
      if (entity === 'churchGroups') setChurchGroups(refreshed as ChurchGroup[]);
      if (entity === 'churchLocations') setChurchLocations(refreshed as ChurchLocation[]);
      if (result.deactivated) return { ok: false, message: 'This item is in use and was deactivated instead.' };
    } else localStorageRepository.replace(entity, records.filter(row => row.id !== id));
    addListActivity(actorEmail, actorName, 'Deleted ' + entity + ': ' + item.name);
    return { ok: true };
  }, [addListActivity, bands, churchGroups, churchLocations, departments, executives, members, supabaseRepository]);

  const saveProgramme = useCallback(async (programme: Partial<Programme> & Pick<Programme, 'title' | 'date' | 'startTime' | 'endTime' | 'location'>, actorEmail: string, actorName: string) => {
    const record = { ...programme, id: programme.id ?? crypto.randomUUID(), eventId: currentEventId, description: programme.description ?? '', active: programme.active ?? true, sortOrder: programme.sortOrder ?? programmes.length } as Programme;
    if (supabaseRepository) { await supabaseRepository.saveProgramme(record); setProgrammes(await supabaseRepository.list('programmes')); }
    else localStorageRepository.write('programmes', record as never, actorEmail);
    addListActivity(actorEmail, actorName, 'Updated programme: ' + programme.title);
  }, [addListActivity, currentEventId, programmes.length, supabaseRepository]);
  const deleteProgramme = useCallback(async (id: string, actorEmail: string, actorName: string) => {
    const programme = programmes.find(row => row.id === id);
    if (supabaseRepository) { await supabaseRepository.deleteProgramme(id); setProgrammes(await supabaseRepository.list('programmes')); }
    else localStorageRepository.replace('programmes', programmes.filter(row => row.id !== id));
    if (programme) addListActivity(actorEmail, actorName, 'Deleted programme: ' + programme.title);
  }, [addListActivity, programmes, supabaseRepository]);
  const assignConventionRole = useCallback(async (userEmail: string, role: ConventionRoleName, actorEmail: string, actorName: string) => {
    if (supabaseRepository) { await supabaseRepository.assignConventionRole(userEmail, role); setConventionRoles(await supabaseRepository.list('conventionRoles')); }
    else localStorageRepository.write('conventionRoles', { id: crypto.randomUUID(), userEmail: userEmail.toLowerCase(), role, assignedBy: actorEmail, assignedAt: new Date().toISOString() } as never, actorEmail);
    addListActivity(actorEmail, actorName, 'Assigned ' + role + ' to ' + userEmail);
  }, [addListActivity, supabaseRepository]);
  const revokeConventionRole = useCallback(async (id: string, actorEmail: string, actorName: string) => {
    const role = conventionRoles.find(row => row.id === id);
    if (supabaseRepository) { await supabaseRepository.revokeConventionRole(id); setConventionRoles(await supabaseRepository.list('conventionRoles')); }
    else localStorageRepository.replace('conventionRoles', conventionRoles.filter(row => row.id !== id));
    if (role) addListActivity(actorEmail, actorName, 'Revoked ' + role.role + ' from ' + role.userEmail);
  }, [addListActivity, conventionRoles, supabaseRepository]);

  const findAttendeeByStatusToken = useCallback((token: string | undefined) => {
    if (!token) return null;
    const member = members.find(item => item.statusToken === token);
    if (member) return { type: 'member' as const, attendee: member };
    const executive = executives.find(item => item.statusToken === token);
    if (executive) return { type: 'executive' as const, attendee: executive };
    return null;
  }, [executives, members]);

  const getStatusUrl = useCallback((attendee: Member | Executive) => {
    const token = attendee.statusToken ?? ('conventionGroup' in attendee ? createSecureToken('mem') : createSecureToken('exec'));
    const basePath = `${window.location.origin}${window.location.pathname}`;
    return `${basePath}#/convention/status/${token}`;
  }, []);

  return (
    <AppDataContext.Provider value={{
      currentEventId, members, executives, attendance, biometricLogs, biometricDevices, adminActivities, firstTimers, conventionSettings, generatedLinks, bands, departments, churchGroups, churchLocations, programmes, conventionRoles,
      findAttendeeByStatusToken, getStatusUrl,
      addMember, addExecutive, addAttendance, verifyMemberBiometric, claimAccessItem, promoteExecutiveToAdmin, revokeExecutiveAdmin, addFirstTimer,
      updateConventionSettings, assignExecutiveRole, validateGeneratedLink, recordGeneratedLinkUse,
      deleteMember, deleteExecutive, updateMember,
      generateMemberId, assignConventionGroup, saveListItem, deleteListItem, saveProgramme, deleteProgramme, assignConventionRole, revokeConventionRole,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
