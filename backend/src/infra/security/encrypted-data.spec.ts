import { randomBytes } from 'node:crypto';
import { ContractDataCrypto } from './encrypted-data';
describe('AES-256-GCM tenant-bound contract payloads', () => {
 const first = randomBytes(32).toString('base64'), second = randomBytes(32).toString('base64');
 const config = JSON.stringify({v1: first, v2: second});
 const data = Buffer.from('CPF: sensitive guest identifier');
 it('encrypts and decrypts only under the matching tenant and resource', () => {
   const crypto = new ContractDataCrypto(config, 'v2');
   const sealed = crypto.seal(data,'owner-a','guest','rental-1');
   expect(sealed.ciphertext.toString()).not.toContain('sensitive');
   expect(crypto.open(sealed,'owner-a','guest','rental-1')).toEqual(data);
   expect(() => crypto.open(sealed,'owner-b','guest','rental-1')).toThrow();
   expect(() => crypto.open(sealed,'owner-a','guest','rental-2')).toThrow();
   expect(() => crypto.open(sealed,'owner-a','pdf','rental-1')).toThrow();
 });
 it('detects ciphertext and digest changes', () => {
   const crypto = new ContractDataCrypto(config,'v1');
   const sealed = crypto.seal(data,'a','pdf','b');
   const tampered = {...sealed,ciphertext: Buffer.from(sealed.ciphertext)};
   tampered.ciphertext[0] ^= 1;
   expect(() => crypto.open(tampered,'a','pdf','b')).toThrow();
   expect(() => crypto.open({...sealed,sha256:'0'.repeat(64)},'a','pdf','b')).toThrow();
 });
 it('allows reading old ciphertext after active-key rotation', () => {
   const old = new ContractDataCrypto(config,'v1').seal(data,'a','guest','b');
   expect(new ContractDataCrypto(config,'v2').open(old,'a','guest','b')).toEqual(data);
 });
 it('refuses missing or invalid key configuration', () => {
   expect(() => new ContractDataCrypto(undefined,'v1')).toThrow();
   expect(() => new ContractDataCrypto('{"v1":"not_a_real_key"}','v1')).toThrow();
   expect(() => new ContractDataCrypto(config,'missing')).toThrow();
 });
 it('refuses excessive payload size', () => {
   const crypto = new ContractDataCrypto(config,'v1');
   expect(() => crypto.seal(Buffer.alloc(5_000_001),'a','pdf','b')).toThrow();
 });
});
