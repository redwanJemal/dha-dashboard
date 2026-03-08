import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function classifyFacilityType(name: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.includes("home health") || lower.includes("home care")) return "Home Healthcare";
  if (lower.includes("hospital")) return "Hospital";
  if (lower.includes("clinic") || lower.includes("medical cent") || lower.includes("polyclinic") || lower.includes("poly clinic")) return "Clinic";
  if (lower.includes("pharmacy") || lower.includes("pharma")) return "Pharmacy";
  return "Other";
}

export function splitCategory(full: string): { group: string; speciality: string } {
  const idx = (full || "").indexOf("-");
  if (idx === -1) return { group: full || "Unknown", speciality: full || "Unknown" };
  return { group: full.slice(0, idx).trim(), speciality: full.slice(idx + 1).trim() };
}

export function parseEndDateDuration(raw: string): { endDate: string; duration: string } {
  if (!raw) return { endDate: "", duration: "" };
  const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) return { endDate: match[1].trim(), duration: match[2].trim() };
  return { endDate: raw, duration: "" };
}
