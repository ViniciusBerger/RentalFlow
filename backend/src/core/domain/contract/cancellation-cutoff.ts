/** RentalFlow bookings and property check-in times use the São Paulo civil timezone.
 * A cancellation is forbidden as soon as local check-in time is reached.
 * Missing/invalid check-in times fail closed, never default to midnight/noon. */
export function canCancelBeforeCheckIn(startDate:string,checkInTime:string|null|undefined,
 now:Date=new Date()):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!checkInTime||
  !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(checkInTime)||
  !Number.isFinite(now.getTime()))return false;
 const local=new Intl.DateTimeFormat('en-CA',{
  timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
 }).formatToParts(now);
 const part=(type:string)=>local.find(x=>x.type===type)?.value??'';
 const today=[part('year'),part('month'),part('day')].join('-');
 if(startDate!==today)return startDate>today;
 return [part('hour'),part('minute'),part('second')].join(':')<
  (checkInTime.length===5?checkInTime+':00':checkInTime);
}
