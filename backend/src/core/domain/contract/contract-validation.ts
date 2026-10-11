/** Server-authoritative contract input validation. All currency is integer centavos. */
export type OccupancyPolicy = { included: number; maximum: number; extraRateCents: number };
export type GuestFeeChoice = { mode: 'AUTOMATIC' } | { mode: 'WAIVED'; reason: string } | { mode: 'ADJUSTED'; cents: number; reason: string };
const integer = (n: number, min: number, max: number) => Number.isSafeInteger(n) && n >= min && n <= max;
export function rentalCharge(baseCents: number, guests: number, nights: number,
  policy: OccupancyPolicy, choice: GuestFeeChoice, authorizedOverride: boolean) {
  if (!integer(baseCents,0,1_000_000_000) || !integer(guests,1,999) || !integer(nights,1,365) ||
      !integer(policy.included,1,999) || !integer(policy.maximum,policy.included,999) ||
      !integer(policy.extraRateCents,0,1_000_000)) throw new Error('Invalid rental or property pricing');
  if (guests > policy.maximum) throw new Error('Occupancy exceeds property maximum');
  const calculated = Math.max(0,guests-policy.included)*nights*policy.extraRateCents;
  let charged = calculated;
  if (choice.mode !== 'AUTOMATIC') {
    if (!authorizedOverride || !choice.reason.trim() || choice.reason.length > 300) throw new Error('Guest fee override requires account owner approval and justification');
    charged = choice.mode === 'WAIVED' ? 0 : choice.cents;
    if (!integer(charged,0,1_000_000_000)) throw new Error('Invalid agreed guest surcharge');
  }
  const total = baseCents + charged;
  if (!Number.isSafeInteger(total) || total > 1_000_000_000) throw new Error('Rental total outside supported range');
  return { calculatedExtraCents: calculated, chargedExtraCents: charged, totalCents: total };
}
export function verifyInstallments(totalCents: number, amounts: readonly number[]): void {
  if (!integer(totalCents,0,1_000_000_000) || amounts.length < 1 || amounts.length > 12 ||
      amounts.some(n=>!integer(n,0,1_000_000_000)) ||
      amounts.reduce((a,b)=>a+b,0) !== totalCents) throw new Error('Installments must exactly total the agreed amount');
}
export function validateBrazilianCpf(value: string): boolean {
  const cpf = value.replace(/[.-\s]/g,'');
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (n:number) => {
    const sum = cpf.slice(0,n).split('').reduce((s,ch,i)=>s+Number(ch)*(n+1-i),0);
    const remainder = (sum*10)%11;
    return remainder===10?0:remainder;
  };
  return digit(9)===Number(cpf[9]) && digit(10)===Number(cpf[10]);
}
export type ContractingGuest = {fullName:string; cpf:string; rg:string; nationality:string;
  maritalStatus:string; address:string; phone:string; email:string};
export function verifyGuestFinalization(guest: ContractingGuest): void {
  if (!guest || typeof guest.fullName!=='string' || guest.fullName.trim().length<3 ||
      !validateBrazilianCpf(guest.cpf??'') || typeof guest.rg!=='string' ||
      !/^[A-Za-z0-9.-]{4,20}$/.test(guest.rg.trim()) ||
      guest.nationality !== 'BR' || !['SOLTEIRO','CASADO','DIVORCIADO','VIUVO','UNIAO_ESTAVEL','SEPARADO'].includes(guest.maritalStatus) ||
      typeof guest.address!=='string' || guest.address.trim().length<10 || guest.address.length>500 ||
      typeof guest.phone!=='string' || !/^\+?\d[\d\s()-]{8,20}$/.test(guest.phone) ||
      typeof guest.email!=='string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email) || guest.email.length>254) {
    throw new Error('Required Brazilian contracting guest information is missing or invalid');
  }
}
