/** CSRF is derived and verified on the server against the HttpOnly login session. */
let cached: string | null = null;
let pending: Promise<string | null> | null = null;
export function clearCsrfToken() {cached=null;pending=null;}
async function getToken(): Promise<string | null> {
  if (cached) return cached;
  if (!pending) pending=(async()=>{
    const url=import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response=await fetch(`${url}/auth/csrf`,{credentials:'include',cache:'no-store'});
    // Old backend during the two-service Railway rollout has no CSRF route.
    // Origin protection is still enforced there. Do not fall back for 401/403/5xx.
    if (response.status===404) return null;
    if (!response.ok) throw new Error('Unable to validate session');
    const result:unknown=await response.json();
    if (!result || typeof result!=='object' || !('csrfToken' in result) ||
        typeof result.csrfToken!=='string') throw new Error('Invalid session verification response');
    cached=result.csrfToken;return cached;
  })().finally(()=>{pending=null;});
  return pending;
}
/** Call for every authenticated write; never use a client-generated approval flag. */
export async function csrfFetch(url:string,init:RequestInit={}): Promise<Response> {
  const token=await getToken();
  const headers=new Headers(init.headers);
  if (token) headers.set('X-CSRF-Token',token);
  return fetch(url,{...init,headers,credentials:'include',cache:'no-store'});
}
