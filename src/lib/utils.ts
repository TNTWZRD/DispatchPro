import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function toTitleCase(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
}

export function formatUserName(name?: string | null, email?: string | null) {
  if (name) {
    return toTitleCase(name.trim());
  }
  if (email) {
    const emailName = email.split('@')[0];
    return toTitleCase(emailName);
  }
  return "Unnamed User";
}

export const getThreadId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('-');
}

export const getThreadIds = (uid1: string, uid2: string): string[] => {
  return [uid1, uid2].sort();
}

export function formatPhoneNumber(phoneNumberString?: string) {
  if (!phoneNumberString) return '';
  const cleaned = ('' + phoneNumberString).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phoneNumberString;
}

export function isSuperAdmin(userRole?: number) {
  if (!userRole) return false;
  const { Role } = require('@/lib/types');
  return (userRole & Role.SUPER_ADMIN) === Role.SUPER_ADMIN;
}
