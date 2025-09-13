import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUserName(name: string) {
  if (!name) return "";
  const parts = name.split(' ');
  if (parts.length > 1 && parts[parts.length -1]) {
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  }
  return name;
}

export const getThreadId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('-');
}

export const getThreadIds = (uid1: string, uid2: string): string[] => {
  return [uid1, uid2].sort();
}
