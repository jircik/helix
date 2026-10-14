import { describe, expect, it } from 'vitest';
import { safeNext } from './redirect';

describe('safeNext', () => {
  it.each([
    ['/leads?leadId=3', '/leads?leadId=3'],
    ['/', '/'],
    [null, '/dashboard'],
    ['', '/dashboard'],
    ['//evil.com', '/dashboard'],
    ['/\\evil.com', '/dashboard'],
    ['https://evil.com', '/dashboard'],
    ['javascript:alert(1)', '/dashboard'],
    ['/login', '/dashboard'],
    ['/\t/evil.com', '/dashboard'],
    ['/\n/evil.com', '/dashboard'],
  ])('%s → %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});
