/**
 * Phone Number Normalization Utility
 * 
 * Normalizes all Malaysian phone numbers to the standard format:
 * 60XXXXXXXXX (e.g., 60123456789)
 * 
 * Handles:
 * - 0123456789 → 60123456789
 * - 012-345-6789 → 60123456789
 * - +60123456789 → 60123456789
 * - 0060123456789 → 60123456789
 * - 60123456789 → 60123456789 (already normalized)
 * - 123456789 → 60123456789
 * - 01112345678 → 601112345678
 */

export function normalizePhone(input) {
  if (!input) return '';
  
  // Step 1: Strip all non-digit characters (spaces, dashes, brackets, etc.)
  let cleaned = String(input).replace(/[^0-9]/g, '');
  
  if (!cleaned) return '';
  
  // Step 2: Handle international prefixes
  // +60... (via 0060) or already stripped
  if (cleaned.startsWith('0060')) {
    // 0060123456789 → 60123456789
    cleaned = cleaned.substring(2); // Keep 60...
  } else if (cleaned.startsWith('00')) {
    // 00123456789 (unusual) → assume country code follows
    // For Malaysia: 006012... we handled above, so 001... is likely not Malaysia
    cleaned = cleaned.substring(2);
  }
  
  // Step 3: Ensure it starts with 60 (Malaysia country code)
  if (cleaned.startsWith('60')) {
    // Already has country code — verify length
    // Malaysian numbers: 60 + 9-10 digits = 11-12 chars
    if (cleaned.length < 10) {
      // Too short even with country code — treat as local number
      cleaned = '60' + cleaned.substring(2);
    }
    // Good as-is if >= 10 chars
  } else if (cleaned.startsWith('0')) {
    // Local format: 0XX... → remove leading 0, add 60
    cleaned = '60' + cleaned.substring(1);
  } else if (cleaned.startsWith('1')) {
    // Starts with 1X (e.g., 123456789) — assume missing leading 0
    // Original was 0123456789
    cleaned = '601' + cleaned.substring(1);
  } else {
    // No identifiable format — prepend 60
    cleaned = '60' + cleaned;
  }
  
  return cleaned;
}

/**
 * Compare two phone numbers after normalization
 * Returns true if they represent the same number
 */
export function samePhone(a, b) {
  return normalizePhone(a) === normalizePhone(b);
}

/**
 * Format a normalized phone for display
 * 60123456789 → +60 12-345 6789
 */
export function formatPhone(phone) {
  const n = normalizePhone(phone);
  if (!n || n.length < 10) return phone;
  
  // 60123456789 → +60 12-345 6789
  const country = n.substring(0, 2);
  const rest = n.substring(2);
  // Split rest: first digit (2) + next 3 + next 4
  const area = rest.length >= 4 ? rest.substring(0, rest.length - 4) : rest;
  const line = rest.substring(rest.length - 4);
  
  return `+${country} ${area} ${line}`;
}
