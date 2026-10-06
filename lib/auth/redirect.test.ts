import { describe, expect, it } from 'vitest';
import { safeNext } from './redirect';

describe('safeNext', () => {
  it.each([
    ['/leads?leadId=3', '/leads?leadId=3'],
    ['/', '/'],
    [null, '/'],
    ['', '/'],
    ['//evil.com', '/'],
    ['/\\evil.com', '/'],
    ['https://evil.com', '/'],
    ['javascript:alert(1)', '/'],
    ['/entrar', '/'],
    ['/\t/evil.com', '/'],
    ['/\n/evil.com', '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});
