import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// ASG Leads — ID Generation Utilities
// ============================================
// These utilities are defined outside components to satisfy
// React's purity requirements (no impure calls during render).

let idCounter = 0;

/**
 * Generate a unique ID with an optional prefix.
 * Uses a combination of timestamp and counter for uniqueness.
 */
export function generateId(prefix: string = "id"): string {
  idCounter = (idCounter + 1) % 1000000;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

/**
 * Generate a lead ID in the format ASG-YYYY-XXXX
 */
export function generateLeadId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ASG-${year}-${random}`;
}
