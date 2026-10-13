import {useEffect,useState} from 'react';
import {loadProperties,type Property} from '../properties/property-data';
import {rentalDataStore} from '../../hooks/load-data/rental-data-store';
import {useLanguage} from '../../i18n/context';
import {approveContractAmendment,reviewContractAmendment,type AmendmentProposal,
 type AmendmentReview,type ContractDetail} from './contract-workspace-api';

const money=(n:number,locale:string)=>new Intl.NumberFormat(locale,{
 style:'currency',currency:'BRL'}).format(n/100);
export function AmendmentPanel({detail,onApplied}:{detail:ContractDetail;onApplied:()=>Promise<void>}){
 const {locale}=useLanguage(),pt=locale==='pt-BR';
 const [properties,setProperties]=useState<Property[]>([]);
 const [propertyId,setPropertyId]=useState(detail.property.id);
 const [startDate,setStartDate]=useState(detail.booking.startDate);
 const [endDate,setEndDate]=useState(detail.booking.endDate);
 const [guests,setGuests]=useState(String(detail.booking.guests));
 const [base,setBase]=useState(detail.pricing.baseRevenueCents===null?
  '':String(detail.pricing.baseRevenueCents/100));
 const [feeMode,setFeeMode]=useState<'AUTOMATIC'|'WAIVED'|'ADJUSTED'>('AUTOMATIC');
 const [extra,setExtra]=useState('0'),[reason,setReason]=useState('');
 const [changeSchedule,setChangeSchedule]=useState(false);
 const [installments,setInstallments]=useState(detail.installments.map(p=>({
  agreedCents:p.agreedCents,dueDate:p.dueDate??'',dueEvent:p.dueEvent??'',
  paymentMethod:p.paymentMethod??'',isDeposit:p.isDeposit
 })));
 const [review,setReview]=useState<AmendmentReview|null>(null),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const paid=detail.installments.some(x=>(x.receivedCents??0)>0||!!x.paidAt);
 useEffect(()=>{let mounted=true;loadProperties().then(items=>{
  if(mounted)setProperties(items.filter(x=>x.isActive));
 }).catch(()=>{if(mounted)setError(pt?'Não foi possível carregar os imóveis.':'Unable to load properties.')});
 return()=>{mounted=false};},[pt]);
 const change=()=>{setReview(null);setNotice('');setError('');};
 const proposal=():AmendmentProposal=>{
  const baseRevenueCents=Math.round(Number(base)*100),totalGuests=Number(guests);
  if(!base.trim()||!Number.isSafeInteger(baseRevenueCents)||baseRevenueCents<0||
   !Number.isSafeInteger(totalGuests)||totalGuests<1||!propertyId||!startDate||!endDate)
   throw new Error(pt?'Revise os campos obrigatórios.':'Check all required fields.');
  const guestFee:AmendmentProposal['guestFee']=feeMode==='WAIVED'
   ?{mode:'WAIVED',reason}:feeMode==='ADJUSTED'
    ?{mode:'ADJUSTED',cents:Math.round(Number(extra)*100),reason}
    :{mode:'AUTOMATIC'};
  return {propertyId,startDate,endDate,guests:totalGuests,baseRevenueCents,guestFee,
   ...(changeSchedule?{installments:installments.map(p=>({
    agreedCents:p.agreedCents,
    ...(p.dueDate?{dueDate:p.dueDate}:{}),
    ...(p.dueEvent?{dueEvent:p.dueEvent}:{}),
    ...(p.paymentMethod?{paymentMethod:p.paymentMethod}:{}),isDeposit:p.isDeposit
   }))}:{})};
 };
 const requestReview=async()=>{setBusy(true);setError('');setReview(null);try{
  setReview(await reviewContractAmendment(detail.id,proposal()));
 }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false)}};
 const approve=async()=>{if(!review)return;
  const text=pt?'Confirmar e aplicar a alteração à reserva? A versão anterior do contrato ficará arquivada, e uma nova versão NÃO ASSINADA será criada.':
   'Confirm and apply this booking amendment? The original contract remains archived and a new UNSIGNED draft will be created.';
  if(!window.confirm(text))return;
  setBusy(true);setError('');
  try{
   await approveContractAmendment(detail.id,proposal(),review.reviewToken);
   setReview(null);
   await rentalDataStore.refreshAfterMutation();
   await onApplied();
   setNotice(pt?'Alteração aplicada pela confirmação do locador. Novo contrato ainda não assinado.':
    'Landlord confirmed the amendment. New contract draft remains unsigned.');
  }catch(e){setReview(null);setError(e instanceof Error?e.message:String(e))}
  finally{setBusy(false)};
 };
 if(detail.cancelled||detail.status!=='FINALIZED')return null;
 return <section className="rf-panel" aria-label={pt?'Alterar contrato':'Amend contract'}>
  <h4>{pt?'Alteração da reserva e do contrato':'Booking and contract amendment'}</h4>
  <p className="rf-contract-help">{pt
   ?'Após confirmação do locador, os novos dados passam a valer no sistema. O contrato antigo não será alterado e uma nova versão não assinada deverá ser finalizada.'
   :'New booking details take effect after landlord confirmation. The old contract stays immutable; a new unsigned draft must be finalized.'}</p>
  {error&&<p role="alert" className="rf-contract-error">{error}</p>}
  {notice&&<p role="status" className="rf-contract-success">{notice}</p>}
  <div className="rf-contract-grid">
   <label className="rf-contract-field">{pt?'Imóvel':'Property'}
    <select value={propertyId} onChange={e=>{setPropertyId(e.target.value);change()}}>
     {!properties.some(x=>x.id===propertyId)&&<option value={propertyId}>{detail.property.name}</option>}
     {properties.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
    </select></label>
   <label className="rf-contract-field">{pt?'Entrada':'Check-in'}
    <input type="date" value={startDate} onChange={e=>{setStartDate(e.target.value);change()}}/></label>
   <label className="rf-contract-field">{pt?'Saída':'Check-out'}
    <input type="date" value={endDate} onChange={e=>{setEndDate(e.target.value);change()}}/></label>
   <label className="rf-contract-field">{pt?'Hóspedes':'Guests'}
    <input type="number" min="1" max="999" step="1" value={guests}
     onChange={e=>{setGuests(e.target.value);change()}}/></label>
   <label className="rf-contract-field">{pt?'Preço base, antes da taxa extra (R$)':'Base price before extra guests (BRL)'}
    <input type="number" min="0" step="0.01" value={base}
     onChange={e=>{setBase(e.target.value);change()}}/></label>
   <label className="rf-contract-field">{pt?'Taxa por hóspedes extras':'Extra-guest fee'}
    <select value={feeMode} onChange={e=>{setFeeMode(e.target.value as typeof feeMode);change()}}>
     <option value="AUTOMATIC">{pt?'Cálculo automático':'Calculate automatically'}</option>
     <option value="WAIVED">{pt?'Isentar, com justificativa':'Waive with reason'}</option>
     <option value="ADJUSTED">{pt?'Ajustar, com justificativa':'Adjust with reason'}</option>
    </select></label>
   {feeMode==='ADJUSTED'&&<label className="rf-contract-field">{pt?'Taxa ajustada (R$)':'Adjusted fee (BRL)'}
    <input type="number" min="0" step="0.01" value={extra}
     onChange={e=>{setExtra(e.target.value);change()}}/></label>}
   {feeMode!=='AUTOMATIC'&&<label className="rf-contract-field">{pt?'Justificativa':'Reason'}
    <input type="text" maxLength={300} value={reason}
     onChange={e=>{setReason(e.target.value);change()}}/></label>}
  </div>
  <label className="rf-contract-check"><input type="checkbox" checked={changeSchedule}
   disabled={paid} onChange={e=>{setChangeSchedule(e.target.checked);change()}}/>
   {pt?'Propor novo parcelamento explícito':'Propose a new installment plan'}</label>
  {paid&&<p className="rf-contract-help">{pt
   ?'Há pagamentos registrados. Alterações do parcelamento estão bloqueadas até definição de conciliação.'
   :'Payments are recorded. Installment changes are blocked until reconciliation is defined.'}</p>}
  {changeSchedule&&<div className="rf-contract-workspace-installments">
   {installments.map((p,i)=><div key={i} className="rf-contract-installment">
    <label className="rf-contract-field">{pt?'Parcela':'Installment'} {i+1} (R$)
     <input type="number" min="0" step="0.01" value={p.agreedCents/100}
      onChange={e=>{setInstallments(old=>old.map((x,j)=>j===i?{...x,agreedCents:Math.round(Number(e.target.value)*100)}:x));change()}}/></label>
    <label className="rf-contract-field">{pt?'Data de vencimento':'Due date'}
     <input type="date" value={p.dueDate} onChange={e=>{setInstallments(old=>old.map((x,j)=>j===i?
      {...x,dueDate:e.target.value,dueEvent:''}:x));change()}}/></label>
    <label className="rf-contract-field">{pt?'Ou evento':'Or due event'}
     <select value={p.dueEvent} onChange={e=>{setInstallments(old=>old.map((x,j)=>j===i?
      {...x,dueEvent:e.target.value,dueDate:''}:x));change()}}>
      <option value="">{pt?'Nenhum':'None'}</option><option value="CHECKIN">Check-in</option>
      <option value="KEY_HANDOVER">{pt?'Entrega de chaves':'Key handover'}</option>
      <option value="AGREED_EVENT">{pt?'Evento acordado':'Agreed event'}</option>
     </select></label>
    <label className="rf-contract-field">{pt?'Pagamento':'Method'}
     <select value={p.paymentMethod} onChange={e=>{setInstallments(old=>old.map((x,j)=>j===i?
      {...x,paymentMethod:e.target.value}:x));change()}}>
      <option value="">{pt?'Não definido':'Unset'}</option><option value="PIX">PIX</option>
      <option value="BANK_TRANSFER">{pt?'Transferência':'Bank transfer'}</option>
      <option value="CUSTOM">{pt?'Outro':'Other'}</option>
     </select></label>
    <label className="rf-contract-check"><input type="checkbox" checked={p.isDeposit}
     onChange={e=>{setInstallments(old=>old.map((x,j)=>j===i?{...x,isDeposit:e.target.checked}:x));change()}}/>
     {pt?'Sinal':'Deposit'}</label>
    {installments.length>1&&<button type="button" onClick={()=>{setInstallments(old=>old.filter((_,j)=>j!==i));change()}}>
     {pt?'Remover parcela':'Remove installment'}</button>}
   </div>)}
   {installments.length<12&&<button type="button" className="rf-button rf-contract-secondary"
    onClick={()=>{setInstallments(old=>[...old,{agreedCents:0,dueDate:'',dueEvent:'',
     paymentMethod:'',isDeposit:false}]);change()}}>{pt?'Adicionar parcela':'Add installment'}</button>}
  </div>}
  <button type="button" className="rf-button rf-contract-secondary" disabled={busy}
   onClick={()=>void requestReview()}>{pt?'Revisar alteração':'Review amendment'}</button>
  {review&&<div className="rf-contract-actions">
   <p role="status" className="rf-contract-help">
    {pt?'Antes':'Before'}: {money(review.before.revenueCents,locale)}
    {' → '}{pt?'Depois':'After'}: {money(review.after.revenueCents,locale)}
    {' · '}{pt?'Novo lucro':'New profit'}: {money(review.after.profitCents,locale)}</p>
   <p className="rf-contract-help">{pt?'A confirmação muda a reserva imediatamente, mas NÃO assina o novo contrato.':
    'Confirmation updates the booking immediately but DOES NOT sign the new document.'}</p>
   <button type="button" className="rf-button" disabled={busy}
    onClick={()=>void approve()}>{pt?'Confirmar como locador':'Approve as landlord'}</button>
  </div>}
 </section>;
}
