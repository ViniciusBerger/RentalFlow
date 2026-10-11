export const PROPERTY_COLORS = ['#0D8A57','#2563EB','#C2410C','#9333EA','#D97706','#0E7490','#BE185D','#475569'] as const;
export const PROPERTY_ICONS = ['building','house','apartment','waves','sun','tree','mountain','key'] as const;
export type Property = {
  id:string;userId:string;name:string;address:string|null;color:string;icon:string;
  isActive:boolean;isDefault:boolean;
};
const url = import.meta.env.VITE_API_URL;
async function request<T>(path:string,init?:RequestInit):Promise<T> {
  const response=await fetch(`${url}/properties${path}`,{credentials:'include',...init,
    headers:{'Content-Type':'application/json',...init?.headers}});
  if(!response.ok) {const body=await response.json().catch(()=>null);throw new Error(body?.message??`HTTP ${response.status}`);}
  return response.json() as Promise<T>;
}
export const loadProperties = ()=>request<Property[]>('');
export const createProperty = (data:Pick<Property,'name'|'address'|'color'|'icon'>)=>request<Property>('',{method:'POST',body:JSON.stringify(data)});
export const editProperty = (id:string,data:Pick<Property,'name'|'address'|'color'|'icon'>)=>request<Property>(`/${id}`,{method:'PATCH',body:JSON.stringify(data)});
export const archiveProperty = (id:string)=>request<{archived:boolean}>(`/${id}`,{method:'DELETE'});
export const bookingMatches = (booking:{propertyId?:string},filter:string)=>filter==='all'||booking.propertyId===filter;
export function calculatePropertyBalances(bookings:readonly {propertyId?:string;startDate:string;revenue:number;profit:number}[],filter:string,year:number,month:number) {
  const rows=Array.from({length:12},(_,i)=>({label:`${year}-${String(i+1).padStart(2,'0')}`,totalRevenue:0,totalProfit:0,bookingCount:0}));
  for(const booking of bookings) {
    if(!bookingMatches(booking,filter)) continue;
    const key=booking.startDate.slice(0,7),row=rows.find(r=>r.label===key);
    if(row){row.bookingCount++;row.totalRevenue+=Number(booking.revenue);row.totalProfit+=Number(booking.profit);}
  }
  const yearly={label:String(year),totalRevenue:rows.reduce((s,r)=>s+r.totalRevenue,0),totalProfit:rows.reduce((s,r)=>s+r.totalProfit,0)};
  return {yearly,monthly:rows[month-1],months:rows};
}
