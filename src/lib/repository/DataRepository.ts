import type { AdminActivityLog, AttendanceRecord, Band, BiometricLog, ChurchGroup, ChurchLocation, ConventionEvent, ConventionRole, ConventionSettings, DepartmentItem, Executive, FirstTimer, GeneratedLink, Member, Programme } from '@/types';

export const DEFAULT_EVENT_ID = 'mosyf-2026';
export type RepositoryEntity = 'members' | 'executives' | 'attendance' | 'biometricLogs' | 'adminActivities' | 'firstTimers' | 'generatedLinks' | 'events' | 'bands' | 'departments' | 'churchGroups' | 'churchLocations' | 'programmes' | 'conventionRoles';
export type RepositoryRecordMap = {
  members: Member;
  executives: Executive;
  attendance: AttendanceRecord;
  biometricLogs: BiometricLog;
  adminActivities: AdminActivityLog;
  firstTimers: FirstTimer;
  generatedLinks: GeneratedLink;
  events: ConventionEvent;
  bands: Band;
  departments: DepartmentItem;
  churchGroups: ChurchGroup;
  churchLocations: ChurchLocation;
  programmes: Programme;
  conventionRoles: ConventionRole;
};

export interface DataRepository {
  readonly currentEventId: string;
  list<K extends RepositoryEntity>(entity: K, eventId?: string): RepositoryRecordMap[K][];
  replace<K extends RepositoryEntity>(entity: K, records: RepositoryRecordMap[K][]): void;
  write<K extends RepositoryEntity>(entity: K, record: Omit<RepositoryRecordMap[K], 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'eventId'> & Partial<Pick<RepositoryRecordMap[K], 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'eventId'>>, createdBy?: string): RepositoryRecordMap[K];
  getSettings(): ConventionSettings | null;
  setSettings(settings: ConventionSettings): ConventionSettings;
  subscribe(listener: () => void): () => void;
  reset(): void;
}

export interface AsyncDataRepository {
  readonly currentEventId: string;
  list<K extends RepositoryEntity>(entity: K, eventId?: string): Promise<RepositoryRecordMap[K][]>;
  replace<K extends RepositoryEntity>(entity: K, records: RepositoryRecordMap[K][]): Promise<void>;
  write<K extends RepositoryEntity>(entity: K, record: Omit<RepositoryRecordMap[K], 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'eventId'> & Partial<Pick<RepositoryRecordMap[K], 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'eventId'>>, createdBy?: string): Promise<RepositoryRecordMap[K]>;
  getSettings(): Promise<ConventionSettings | null>;
  setSettings(settings: ConventionSettings): Promise<ConventionSettings>;
  subscribe(listener: () => void): () => void;
}
