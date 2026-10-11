import { requireContractAction, requireContractOwner } from './contract-authorization';
describe('contract access control', () => {
 it('allows only the authenticated owner', () => {
  expect(() => requireContractOwner('a','a')).not.toThrow();
  expect(() => requireContractAction('a','a','FINALIZE')).not.toThrow();
  expect(() => requireContractAction('b','a','DOWNLOAD')).toThrow('Resource not found');
  expect(() => requireContractOwner(undefined,'a')).toThrow();
 });
});
