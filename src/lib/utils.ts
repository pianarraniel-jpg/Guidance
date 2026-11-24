import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(nameOrId?: string): string {
  const colorPairs = [
    'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    'bg-blue-50 text-blue-700 border-blue-200/50',
    'bg-teal-50 text-teal-700 border-teal-200/50',
    'bg-indigo-50 text-indigo-700 border-indigo-200/50',
    'bg-purple-50 text-purple-700 border-purple-200/50',
    'bg-amber-50 text-amber-700 border-amber-200/50',
    'bg-rose-50 text-rose-700 border-rose-200/50',
    'bg-cyan-50 text-cyan-700 border-cyan-200/50',
  ];
  if (!nameOrId) return colorPairs[0];
  let hash = 0;
  for (let i = 0; i < nameOrId.length; i++) {
    hash = nameOrId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPairs[Math.abs(hash) % colorPairs.length];
}
