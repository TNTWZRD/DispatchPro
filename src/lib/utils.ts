import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUserName(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length > 1 && parts[parts.length - 1]) {
      return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
    }
    return name;
  }
  if (email) {
    return email.split('@')[0];
  }
  return "Unnamed User";
}

export const getThreadId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('-');
}

export const getThreadIds = (uid1: string, uid2: string): string[] => {
  return [uid1, uid2].sort();
}
