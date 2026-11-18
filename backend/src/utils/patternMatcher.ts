/**
 * Wildcard pattern matcher for email strings.
 * Supports patterns like:
 * - "2023*@dau.ac.in" -> Matches 202301131@dau.ac.in, 202301451@dau.ac.in
 * - "*@dau.ac.in" -> Matches any dau.ac.in email
 * - "admin@dau.ac.in, 2023*@dau.ac.in" -> Comma-separated multi-pattern
 * - "*@*dau*.ac.in" -> Flexible domain globbing
 */

export function parsePatternToRegex(pattern: string): RegExp {
  const trimmed = pattern.trim().toLowerCase();
  // Escape regex special characters except '*'
  const escaped = trimmed
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Checks whether an email matches any of the comma- or newline-separated patterns.
 * If rawPatterns is empty, null, or undefined, access is open (returns true).
 */
export function isEmailAllowedByPatterns(email: string, rawPatterns?: string | null): boolean {
  if (!rawPatterns || !rawPatterns.trim()) {
    return true; // No restrictions specified
  }

  const cleanEmail = email.trim().toLowerCase();
  const patternList = rawPatterns
    .split(/[,\n]/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (patternList.length === 0) {
    return true;
  }

  return patternList.some((pattern) => {
    try {
      const regex = parsePatternToRegex(pattern);
      return regex.test(cleanEmail);
    } catch {
      return false;
    }
  });
}
