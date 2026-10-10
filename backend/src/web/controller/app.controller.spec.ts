import { AppController } from './app.controller';
describe('AppController', () => {
 it('returns a stable health response without requiring authentication or database access', () => {
   expect(new AppController().health()).toEqual({status: 200, message: 'success'});
 });
});
