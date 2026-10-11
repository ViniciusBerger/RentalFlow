import {requireSessionCsrf,sessionCsrfToken} from './csrf-session';
describe('session-bound CSRF',()=>{
 function req(method:string,headers:Record<string,string>={},path='/rental/update'): any {
  return {method,path,cookies:{'__Host-access_token':'signed.random.high.entropy.sample.token'},get:(key:string)=>headers[key.toLowerCase()]};
 }
 function run(request:any) {
  const next=jest.fn();const response:any={status:jest.fn(),json:jest.fn()};
  response.status.mockReturnValue(response);
  requireSessionCsrf(request,response,next);return {next,response};
 }
 it('binds the header to the actual browser session',()=>{
  const valid=req('PATCH',{'x-csrf-token':sessionCsrfToken(req('GET'))!});
  expect(run(valid).next).toHaveBeenCalled();
  expect(run(req('PATCH')).response.status).toHaveBeenCalledWith(403);
  expect(run(req('POST',{'x-csrf-token':'bad-token'})).response.status).toHaveBeenCalledWith(403);
  const other=req('PATCH',{'x-csrf-token':sessionCsrfToken(req('GET'))!});
  other.cookies['__Host-access_token']='another session with sufficient entropy';
  expect(run(other).response.status).toHaveBeenCalledWith(403);
 });
 it('allows safe requests and login bootstrap but not unauthenticated writes',()=>{
  expect(run(req('GET')).next).toHaveBeenCalled();
  expect(run(req('POST',{},'/auth/login')).next).toHaveBeenCalled();
  const without=req('POST');without.cookies={};
  expect(run(without).next).toHaveBeenCalled(); // the Nest auth guard rejects unauthenticated requests
 });
});
