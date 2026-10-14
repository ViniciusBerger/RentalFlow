import {BadRequestException,ConflictException} from '@nestjs/common';

/** Contract amendments are proposals, never direct mutations of an archived agreement. */
export type ContractAmendmentInput={
 startDate:string;endDate:string;propertyId:string;guests:number;quotedTotalCents:number;
 installments:{agreedCents:number;dueDate?:string;dueEvent?:string;paymentMethod:string;isDeposit:boolean}[];
};
export type CancellationQuote={
 refundDueCents:number|null;retainedCents:number|null;paidCents:number;
 deadlineMet:boolean;automaticTransferAvailable:false;refundState:'NO_PAYMENT'|'FULL_REFUND_DUE'|'POLICY_REVIEW_REQUIRED';
};
const iso=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
export function validateAmendmentProposal(input:ContractAmendmentInput):void{
 if(!iso(input.startDate)||!iso(input.endDate)||input.endDate<=input.startDate||
  !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(input.propertyId)||
  !Number.isSafeInteger(input.guests)||input.guests<1||input.guests>999||
  !Number.isSafeInteger(input.quotedTotalCents)||input.quotedTotalCents<0||
  !Array.isArray(input.installments)||input.installments.length<1||input.installments.length>12)
  throw new BadRequestException('Invalid amendment');
 let total=0,deposit=0;
 for(const [index,p] of input.installments.entries()){
  if(!Number.isSafeInteger(p.agreedCents)||p.agreedCents<0||
   !['PIX','BANK_TRANSFER','CUSTOM'].includes(p.paymentMethod)||
   (!!p.dueDate===!!p.dueEvent)||p.dueDate&&!iso(p.dueDate)||
   p.dueEvent&&!['CHECKIN','KEY_HANDOVER','AGREED_EVENT'].includes(p.dueEvent))
   throw new BadRequestException('Invalid amendment installment '+(index+1));
  total+=p.agreedCents;if(p.isDeposit)deposit++;
 }
 if(deposit>1||total!==input.quotedTotalCents)
  throw new BadRequestException('Amendment installment total mismatch');
}
export function cancellationQuote(input:{
 startDate:string;cancelledOn:string;cancelDays:number;paidCents:number;
 agreedTotalCents:number;freeCancellationConfirmed?:boolean;
}):CancellationQuote{
 const {startDate,cancelledOn,cancelDays,paidCents,agreedTotalCents}=input;
 if(!iso(startDate)||!iso(cancelledOn)||!Number.isInteger(cancelDays)||cancelDays<0||cancelDays>365||
  !Number.isSafeInteger(paidCents)||!Number.isSafeInteger(agreedTotalCents)||
  paidCents<0||agreedTotalCents<0||paidCents>agreedTotalCents)
  throw new BadRequestException('Invalid cancellation financial basis');
 if(cancelledOn>startDate)throw new ConflictException('Cannot use pre-stay cancellation workflow after check-in');
 const days=Math.round((Date.parse(startDate)-Date.parse(cancelledOn))/86400000);
 const deadlineMet=days>=cancelDays;
 // The existing questionnaire specifies a cancellation *window*, not an explicit
 // refund guarantee or penalty. Full refunds require a separately approved policy flag.
 // Never reinterpret general breach/damage penalties as cancellation charges.
 // Refund destination/provider still needs verification and separate payout integration.
 if(!paidCents)return {refundDueCents:0,retainedCents:0,paidCents,deadlineMet,
  automaticTransferAvailable:false,refundState:'NO_PAYMENT'};
 if(deadlineMet&&input.freeCancellationConfirmed===true)return {refundDueCents:paidCents,retainedCents:0,paidCents,deadlineMet,
  automaticTransferAvailable:false,refundState:'FULL_REFUND_DUE'};
 return {refundDueCents:null,retainedCents:null,paidCents,deadlineMet,
  automaticTransferAvailable:false,refundState:'POLICY_REVIEW_REQUIRED'};
}
