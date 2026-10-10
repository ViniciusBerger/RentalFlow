const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname,p), 'utf8');
test('dev login is doubly gated behind local development and opt-in',()=>{
 for(const p of ['src/web/controller/auth.controller.ts','src/infra/adapters/guards/auth.guard.ts']){
   const s=read(p);
   assert.match(s,/NODE_ENV === 'development'/);
   assert.match(s,/ENABLE_DEV_LOGIN === 'true'/);
 }
});
test('signed cookie is HttpOnly and uses timing-safe verification',()=>{
 assert.match(read('src/web/controller/auth.controller.ts'),/httpOnly: true, secure: false, sameSite: 'lax'/);
 assert.match(read('src/infra/adapters/guards/auth.guard.ts'),/timingSafeEqual/);
});
test('development credentials come from environment, not hardcoded controller values',()=>{
 const s=read('src/web/controller/auth.controller.ts');
 assert.match(s,/DEV_LOGIN_EMAIL/);
 assert.match(s,/DEV_LOGIN_PASSWORD/);
 assert.doesNotMatch(s,/test123|test@test\.com/);
});
test('Firebase remains the standard auth path',()=>{
 assert.match(read('src/web/controller/auth.controller.ts'),/authenticateUseCase\.authenticate\(credentials\)/);
});
