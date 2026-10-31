import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Veteran", last: "Not provided" };
  if (parts.length === 1) return { first: parts[0], last: "Not provided" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export function firstName(fullName: string): string {
  return splitName(fullName).first;
}
