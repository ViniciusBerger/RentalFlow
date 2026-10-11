import {securityRateLimit} from './security-rate-limit';
describe('rate limiter',()=>{
 it('limits abusive sign in traffic',()=>{
  const limit=securityRateLimit();let last:any;
  for(let i=0;i<22;i++){
   const r:any={method:'POST',path:'/auth/login',ip:'rate-limit-unit-test',socket:{}};
   const response:any={setHeader:jest.fn(),status:jest.fn(),json:jest.fn()};
   response.status.mockReturnValue(response);const next=jest.fn();
   limit(r,response,next);last={response,next};
  }
  expect(last.response.status).toHaveBeenCalledWith(429);
  expect(last.next).not.toHaveBeenCalled();
 });
 it('passes harmless GET requests',()=>{
  const next=jest.fn();securityRateLimit()({method:'GET',path:'/'} as any,{} as any,next);
  expect(next).toHaveBeenCalled();
 });
});
