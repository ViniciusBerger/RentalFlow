import {csrfFetch} from '../../lib/csrf-fetch';
const root=(import.meta.env.VITE_API_URL||'http://localhost:3000')+'/contracts/workspace';
export const contractsWorkspaceEnabled=import.meta.env.VITE_CONTRACT_WORKSPACE_ENABLED==='true';

export type ContractListItem={
 id:string;rentalId:string;propertyId:string;propertyName:string;
 firstName:string;lastName:string;startDate:string;endDate:string;
 guests:number;revenue:number;status:string;revisionId:string|null;
 revisionVersion:number|null;createdAt:string;
};
export type DraftInstallment={
 id?:string;sequence:number;agreedCents:number;dueDate?:string|null;
 dueEvent?:string|null;paymentMethod?:string|null;isDeposit:boolean;
 receivedCents?:number;paidAt?:string|null;
};
export type ContractPreview={
 watermark:string;ready:boolean;missing:string[];
 clauses:{id:string;title:string;body:string}[];
};
export type ContractDetail={
 id:string;rentalId:string;property:{id:string;name:string;address:string|null};
 booking:{clientFirstName:string;clientLastName:string;startDate:string;endDate:string;guests:number;totalCents:number};
 status:string;cancelled:boolean;revisionId:string;revisionVersion:number;
 history:{id:string;status:string;version:number;finalizedAt:string|null;createdAt:string}[];
 guest:Record<string,string>;installments:DraftInstallment[];editToken:string;
 pricing:{baseRevenueCents:number|null;calculatedExtraCents:number|null;chargedExtraCents:number|null;guestFeeMode:string|null;guestFeeReason:string|null};
 templateVersion:number|null;preview:ContractPreview;editable:boolean;
};
async function checked<T>(response:Response):Promise<T>{
 if(!response.ok){
  const payload:unknown=await response.json().catch(()=>null);
  const message=payload&&typeof payload==='object'&&'message' in payload
   ?String((payload as {message:unknown}).message):'HTTP '+response.status;
  throw new Error(message);
 }
 return response.json() as Promise<T>;
}
export async function listContracts(){
 const response=await fetch(root,{credentials:'include',cache:'no-store'});
 return checked<{items:ContractListItem[];limitedToRecent:number}>(response);
}
export async function getContract(id:string){
 const response=await fetch(root+'/'+encodeURIComponent(id),{credentials:'include',cache:'no-store'});
 return checked<ContractDetail>(response);
}
export type DraftInstallmentInput={
 agreedCents:number;dueDate?:string;dueEvent?:string;paymentMethod?:string;isDeposit?:boolean;
};
export async function saveContractDraft(id:string,input:{
 editToken:string;guest?:Record<string,string>;installments?:DraftInstallmentInput[];
}){
 const response=await csrfFetch(root+'/'+encodeURIComponent(id)+'/draft',{
  method:'PATCH',credentials:'include',cache:'no-store',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(input)
 });
 return checked<ContractDetail>(response);
}
export async function downloadDraftPdf(id:string):Promise<Blob>{
 const response=await fetch(root+'/'+encodeURIComponent(id)+'/preview.pdf',{
  credentials:'include',cache:'no-store'
 });
 if(!response.ok){
  await checked(response);
  throw new Error('Unable to get PDF preview');
 }
 const blob=await response.blob();
 if(blob.type!=='application/pdf'||blob.size<30)
  throw new Error('Invalid PDF preview response');
 return blob;
}

export const contractFinalizationEnabled=contractsWorkspaceEnabled&&import.meta.env.VITE_CONTRACT_FINALIZATION_ENABLED==='true';
export type FinalizationReview={ready:true;reviewToken:string;revisionId:string;version:number};
export async function prepareContractFinalization(id:string):Promise<FinalizationReview>{
 const response=await fetch(root+'/'+encodeURIComponent(id)+'/finalization-review',{
  credentials:'include',cache:'no-store'
 });
 return checked<FinalizationReview>(response);
}
export async function finalizeContract(id:string,reviewToken:string):Promise<{revisionId:string;status:'FINALIZED';signatureStatus:'UNSIGNED'}>{
 const response=await csrfFetch(root+'/'+encodeURIComponent(id)+'/finalize',{
  method:'POST',credentials:'include',cache:'no-store',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({reviewToken,confirm:true})
 });
 return checked(response);
}
export async function downloadFinalContractPdf(id:string,revisionId:string):Promise<Blob>{
 const api=import.meta.env.VITE_API_URL||'http://localhost:3000';
 const response=await fetch(api+'/contracts/'+encodeURIComponent(id)+'/revisions/'+
  encodeURIComponent(revisionId)+'/pdf',{credentials:'include',cache:'no-store'});
 if(!response.ok){await checked(response);throw new Error('Unable to download finalized PDF');}
 const blob=await response.blob();
 if(blob.type!=='application/pdf'||blob.size<100)throw new Error('Invalid finalized PDF');
 return blob;
}

export const contractCancellationsEnabled=contractsWorkspaceEnabled&&import.meta.env.VITE_CONTRACT_CANCELLATIONS_ENABLED==='true';
export type ContractCancellationReview={
 ready:true;reviewToken:string;contractId:string;revisionId:string;revisionStatus:string;
 startDate:string;endDate:string;revenueExcludedCents:number;profitExcludedCents:number;
 recordedReceivedCents:number;refundIssued:false
};
export async function prepareContractCancellation(id:string):Promise<ContractCancellationReview>{
 const response=await fetch(root+'/'+encodeURIComponent(id)+'/cancellation-review',{
  credentials:'include',cache:'no-store'
 });
 return checked<ContractCancellationReview>(response);
}
export async function confirmContractCancellation(id:string,reviewToken:string):Promise<{cancelled:true;refundIssued:false}>{
 const response=await csrfFetch(root+'/'+encodeURIComponent(id)+'/cancel',{
  method:'POST',credentials:'include',cache:'no-store',
  headers:{'Content-Type':'application/json'},body:JSON.stringify({reviewToken,confirm:true})
 });
 return checked(response);
}
