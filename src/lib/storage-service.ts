import { supabase } from './supabase';

// camelCase ↔ snake_case converters
const toSnake = (s: string) => s.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
const fromSnake = (s: string) => s.replace(/_([a-z])/g, (_, l) => l.toUpperCase());

function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    out[toSnake(k)] = obj[k];
  }
  return out;
}

function toCamelCase<T>(obj: Record<string, any>): T {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    out[fromSnake(k)] = obj[k];
  }
  return out as T;
}

export const storageService = {
  getAll: async <T>(table: string): Promise<T[]> => {
    const { data, error } = await supabase.from(table).select('*');
    if (error) { console.error(`storageService.getAll(${table}):`, error.message); return []; }
    return (data ?? []).map(row => toCamelCase<T>(row));
  },

  getById: async <T extends { id: string }>(table: string, id: string): Promise<T | undefined> => {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (error) { console.error(`storageService.getById(${table}):`, error.message); return undefined; }
    return data ? toCamelCase<T>(data) : undefined;
  },

  create: async <T extends { id: string }>(table: string, item: Omit<T, 'id'>): Promise<T> => {
    const { data, error } = await supabase.from(table).insert(toSnakeCase(item as any)).select().single();
    if (error) { console.error(`storageService.create(${table}):`, error.message); throw error; }
    return toCamelCase<T>(data);
  },

  update: async <T = any>(table: string, id: string, updates: Partial<T>): Promise<T | undefined> => {
    const { data, error } = await supabase.from(table).update(toSnakeCase(updates as any)).eq('id', id).select().single();
    if (error) { console.error(`storageService.update(${table}):`, error.message); return undefined; }
    return data ? toCamelCase<T>(data) : undefined;
  },

  delete: async (table: string, id: string): Promise<boolean> => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) { console.error(`storageService.delete(${table}):`, error.message); return false; }
    return true;
  },

  getByField: async <T>(table: string, field: keyof T, value: any): Promise<T[]> => {
    const col = toSnake(field as string);
    const { data, error } = await supabase.from(table).select('*').eq(col, value);
    if (error) { console.error(`storageService.getByField(${table}):`, error.message); return []; }
    return (data ?? []).map(row => toCamelCase<T>(row));
  },

  // Optimized targeted queries to prevent memory/storage overload
  getCounselorPendingAppointments: async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'pending');
    if (error) { console.error('getCounselorPendingAppointments:', error.message); return []; }
    return (data ?? []).map(row => toCamelCase<any>(row));
  },

  getSubmittedAssessments: async () => {
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('status', 'submitted');
    if (error) { console.error('getSubmittedAssessments:', error.message); return []; }
    return (data ?? []).map(row => toCamelCase<any>(row));
  },

  getUserMessages: async (userId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('receiver_id', userId)
      .order('timestamp', { ascending: false })
      .limit(100);
    if (error) { console.error('getUserMessages:', error.message); return []; }
    return (data ?? []).map(row => toCamelCase<any>(row));
  },
};
