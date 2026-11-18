import { describe, it, expect } from 'vitest';
import { isEmailAllowedByPatterns } from './patternMatcher';

describe('Wildcard Email Pattern Matcher', () => {
  it('allows any email when pattern is empty or undefined', () => {
    expect(isEmailAllowedByPatterns('student@example.com', '')).toBe(true);
    expect(isEmailAllowedByPatterns('student@example.com', null)).toBe(true);
    expect(isEmailAllowedByPatterns('student@example.com', undefined)).toBe(true);
  });

  it('matches prefix wildcards like 2023*@dau.ac.in', () => {
    const pattern = '2023*@dau.ac.in';
    expect(isEmailAllowedByPatterns('202301131@dau.ac.in', pattern)).toBe(true);
    expect(isEmailAllowedByPatterns('202301451@dau.ac.in', pattern)).toBe(true);
    expect(isEmailAllowedByPatterns('202401001@dau.ac.in', pattern)).toBe(false);
    expect(isEmailAllowedByPatterns('student@dau.ac.in', pattern)).toBe(false);
    expect(isEmailAllowedByPatterns('202301131@gmail.com', pattern)).toBe(false);
  });

  it('matches multiple comma-separated patterns', () => {
    const patterns = '2023*@dau.ac.in, faculty@dau.ac.in, *@admin.dau.ac.in';
    expect(isEmailAllowedByPatterns('202301131@dau.ac.in', patterns)).toBe(true);
    expect(isEmailAllowedByPatterns('faculty@dau.ac.in', patterns)).toBe(true);
    expect(isEmailAllowedByPatterns('dean@admin.dau.ac.in', patterns)).toBe(true);
    expect(isEmailAllowedByPatterns('guest@other.com', patterns)).toBe(false);
  });

  it('handles case insensitivity cleanly', () => {
    expect(isEmailAllowedByPatterns('202301131@DAU.AC.IN', '2023*@dau.ac.in')).toBe(true);
    expect(isEmailAllowedByPatterns('202301131@dau.ac.in', '2023*@DAU.AC.IN')).toBe(true);
  });
});
