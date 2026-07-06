/**
 * Single source of truth for doctor name display formatting.
 *
 * Rules (stored value → displayed value):
 *   Aditya        → Dr. Aditya
 *   Dr Aditya     → Dr Aditya      (prefix already present — returned as-is)
 *   Dr. Aditya    → Dr. Aditya     (prefix already present — returned as-is)
 *   Doctor Aditya → Doctor Aditya  (prefix already present — returned as-is)
 *
 * Database values are NEVER modified — this is display-only.
 */
export function ensureDrPrefix(name) {
  if (!name || typeof name !== "string") return name || "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  // Name already carries a recognised prefix — return stored value unchanged
  if (/^(dr\.?(\s|$)|doctor\s)/i.test(trimmed)) return trimmed;
  return `Dr. ${trimmed}`;
}
