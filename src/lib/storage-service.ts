import { STORAGE_KEYS } from './constants';
import { MOCK_USERS, MOCK_APPOINTMENTS, MOCK_AVAILABILITY } from './mock-data';

export const storageService = {
  // Generic CRUD
  getAll: <T>(key: string): T[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  getById: <T extends { id: string }>(key: string, id: string): T | undefined => {
    const items = storageService.getAll<T>(key);
    return items.find(item => item.id === id);
  },

  create: <T extends { id: string }>(key: string, item: Omit<T, 'id'>): T => {
    const items = storageService.getAll<T>(key);
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) } as T;
    localStorage.setItem(key, JSON.stringify([...items, newItem]));
    return newItem;
  },

  update: <T extends { id: string }>(key: string, id: string, updates: Partial<T>): T | undefined => {
    const items = storageService.getAll<T>(key);
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return undefined;
    const updatedItem = { ...items[index], ...updates };
    items[index] = updatedItem;
    localStorage.setItem(key, JSON.stringify(items));
    return updatedItem;
  },

  delete: (key: string, id: string): boolean => {
    const items = storageService.getAll<{ id: string }>(key);
    const newItems = items.filter(item => item.id !== id);
    localStorage.setItem(key, JSON.stringify(newItems));
    return true;
  },

  // Specialized queries
  getByField: <T>(key: string, field: keyof T, value: any): T[] => {
    const items = storageService.getAll<T>(key);
    return items.filter(item => item[field] === value);
  },

  // Initialization
  init: () => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(MOCK_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.APPOINTMENTS)) {
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(MOCK_APPOINTMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AVAILABILITY)) {
      localStorage.setItem(STORAGE_KEYS.AVAILABILITY, JSON.stringify(MOCK_AVAILABILITY));
    }
  }
};
