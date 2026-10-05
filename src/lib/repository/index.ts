export * from './DataRepository';
export * from './LocalStorageRepository';
export * from './SupabaseRepository';
export { SupabaseRepository } from './SupabaseRepository';
export { localStorageRepository as localRepository } from './LocalStorageRepository';
export const dataBackend = import.meta.env.VITE_DATA_BACKEND ?? 'supabase';
