import {safeClauseText,escapeContractHtml} from './secure-clause-text';
describe('untrusted custom clause text',()=>{
 it('escapes script tags and entities before any HTML rendering',()=>{
  expect(escapeContractHtml('<img src=x onerror="alert(1)">')).not.toContain('<img');
  expect(escapeContractHtml('&')).toBe('&amp;');
 });
 it('refuses control characters and overly long content',()=>{
  expect(()=>safeClauseText('bad\u0000line')).toThrow();
  expect(()=>safeClauseText('a'.repeat(10001))).toThrow();
 });
});
