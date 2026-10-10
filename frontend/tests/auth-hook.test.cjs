const {test}=require('node:test');
const assert=require('node:assert/strict');
require('./register-typescript.cjs');
const Module=require('node:module');
const {mount}=require('./test-dispatcher.cjs');
const actions={login:async()=>{},getMe:async()=>({isRegistered:true}),completeProfile:async()=>{},logout:async()=>{}};
const routes=[];
const original=Module._load;
Module._load=function(request,parent,isMain){
  if(request==='./auth-service'&&parent?.filename?.endsWith('/hooks/auth/useAuth.tsx'))return{
    login:(...args)=>actions.login(...args),getMe:(...args)=>actions.getMe(...args),
    completeProfile:(...args)=>actions.completeProfile(...args),logout:(...args)=>actions.logout(...args)
  };
  if(request==='react-router-dom'&&parent?.filename?.endsWith('/hooks/auth/useAuth.tsx'))return{useNavigate:()=>path=>routes.push(path)};
  return original.apply(this,arguments);
};
const {useAuth}=require('../src/hooks/auth/useAuth.tsx');
Module._load=original;
const reset=()=>{routes.length=0;actions.login=async()=>{};actions.getMe=async()=>({isRegistered:true});actions.completeProfile=async()=>{};actions.logout=async()=>{}};
test('login submits credentials and navigates registered user only after fetching profile',async()=>{
 reset();const events=[];
 actions.login=async(...args)=>events.push(['login',...args]);
 actions.getMe=async()=>{events.push(['getMe']);return {isRegistered:true}};
 const ui=mount(useAuth);
 await ui.tree.handleLogin('test@test.com','test123');ui.render();
 assert.deepEqual(events,[['login','test@test.com','test123'],['getMe']]);
 assert.deepEqual(routes,['/dashboard']);assert.equal(ui.tree.isLoading,false);assert.equal(ui.tree.error,null);
});
test('login routes unregistered user to onboarding, not protected dashboard',async()=>{
 reset();actions.getMe=async()=>({isRegistered:false});
 const ui=mount(useAuth);await ui.tree.handleLogin('test@test.com','test123');ui.render();
 assert.deepEqual(routes,['/complete-profile']);assert.equal(ui.tree.error,null);
});
test('login network failure shows server message and does not navigate',async()=>{
 reset();actions.login=async()=>{throw Error('Invalid credentials')};
 const ui=mount(useAuth);await ui.tree.handleLogin('bad','bad');ui.render();
 assert.equal(ui.tree.error,'Invalid credentials');assert.deepEqual(routes,[]);assert.equal(ui.tree.isLoading,false);
 ui.tree.resetError();ui.render();assert.equal(ui.tree.error,null);
});
test('unexpected login exception has safe fallback error text',async()=>{
 reset();actions.getMe=async()=>{throw {}};
 const ui=mount(useAuth);await ui.tree.handleLogin('a','b');ui.render();
 assert.equal(ui.tree.error,'Login failed');assert.deepEqual(routes,[]);
});
test('onboarding forwards profile fields and routes only after server registration succeeds',async()=>{
 reset();let received;
 actions.completeProfile=async data=>{received=data};
 actions.getMe=async()=>({isRegistered:true});
 const ui=mount(useAuth);await ui.tree.handleCompleteProfile('Ana','Silva');ui.render();
 assert.deepEqual(received,{firstName:'Ana',lastName:'Silva'});assert.deepEqual(routes,['/dashboard']);
 assert.equal(ui.tree.isLoading,false);
});
test('unconfirmed profile update does not navigate to the dashboard',async()=>{
 reset();actions.getMe=async()=>({isRegistered:false});
 const ui=mount(useAuth);await ui.tree.handleCompleteProfile('Ana','Silva');ui.render();
 assert.deepEqual(routes,[]);assert.equal(ui.tree.error,null);
});
test('profile update failure does not falsely report success',async()=>{
 reset();actions.completeProfile=async()=>{throw Error('First name required')};
 const ui=mount(useAuth);await ui.tree.handleCompleteProfile('','Silva');ui.render();
 assert.equal(ui.tree.error,'First name required');assert.deepEqual(routes,[]);assert.equal(ui.tree.isLoading,false);
});
test('profile update handles errors without a message safely',async()=>{
 reset();actions.getMe=async()=>{throw {}};
 const ui=mount(useAuth);await ui.tree.handleCompleteProfile('Ana','Silva');ui.render();
 assert.equal(ui.tree.error,'Failed to complete profile');assert.deepEqual(routes,[]);
});
test('logout destroys backend session before navigating away',async()=>{
 reset();let called=0;actions.logout=async()=>called++;
 const ui=mount(useAuth);await ui.tree.handleLogout();ui.render();
 assert.equal(called,1);assert.deepEqual(routes,['/auth']);assert.equal(ui.tree.isLoading,false);
});
test('logout server failure retains error and rejects instead of navigating',async()=>{
 reset();actions.logout=async()=>{throw Error('Logout failed on server')};
 const ui=mount(useAuth);await assert.rejects(ui.tree.handleLogout(),/Logout failed on server/);
 ui.render();assert.equal(ui.tree.error,'Logout failed on server');assert.equal(ui.tree.isLoading,false);assert.deepEqual(routes,[]);
});
test('logout has a fallback error if server rejects without message',async()=>{
 reset();actions.logout=async()=>{throw {}};
 const ui=mount(useAuth);await assert.rejects(ui.tree.handleLogout());ui.render();
 assert.equal(ui.tree.error,'Logout failed');assert.deepEqual(routes,[]);
});
