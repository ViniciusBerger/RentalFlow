import type {ChangeEvent} from 'react';

type Props={data:Record<string,string>;onChange:(e:ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>void;locale:string};
export function BookingContractFields({data,onChange,locale}:Props){
 const pt=locale==='pt-BR';
 const field=(name:string,label:string,kind='text')=><label key={name} className="text-xs font-semibold text-slate-700">
  {label}<input type={kind} name={name} value={data[name]??''} maxLength={name==='address'?500:254}
   autoComplete="off" onChange={onChange} className="block mt-1 w-full px-3 py-2 rounded-xl bg-white border border-slate-200"/></label>;
 return <section className="rounded-2xl bg-sage-50 p-4 space-y-4" aria-label={pt?'Contrato':'Contract'}>
  <h3 className="font-bold text-slate-800">{pt?'Contrato vinculado à reserva':'Booking-linked contract'}</h3>
  <p className="text-xs text-slate-600">{pt?
   'O valor informado é a tarifa base. A taxa por hóspedes extras é calculada e somada pelo servidor. O contrato será criado como rascunho.':
   'The entered amount is the base price. The server calculates and adds extra-guest charges. The contract will start as a draft.'}</p>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
   {field('cpf','CPF')}{field('rg','RG')}
   {field('address',pt?'Endereço residencial':'Home address')}
   {field('phone',pt?'Telefone':'Phone','tel')}
   {field('email','E-mail','email')}
   <label className="text-xs font-semibold">{pt?'Nacionalidade':'Nationality'}
    <select name="nationality" value={data.nationality} onChange={onChange} className="block mt-1 w-full px-3 py-2 rounded-xl bg-white">
     <option value="BR">{pt?'Brasileira':'Brazilian'}</option><option value="OTHER">{pt?'Outra (revisão necessária)':'Other (review needed)'}</option>
    </select>
   </label>
   <label className="text-xs font-semibold">{pt?'Estado civil':'Marital status'}
    <select name="maritalStatus" value={data.maritalStatus} onChange={onChange} className="block mt-1 w-full px-3 py-2 rounded-xl bg-white">
     <option value="">{pt?'Pendente':'Pending'}</option>
     {['SOLTEIRO','CASADO','DIVORCIADO','VIUVO','UNIAO_ESTAVEL','SEPARADO'].map(v=><option key={v} value={v}>{v.replace('_',' ')}</option>)}
    </select>
   </label>
  </div>
  <label className="block text-xs font-semibold">{pt?'Taxa por hóspedes extras':'Extra-guest surcharge'}
   <select name="feeMode" value={data.feeMode} onChange={onChange} className="block mt-1 w-full px-3 py-2 rounded-xl bg-white">
    <option value="AUTOMATIC">{pt?'Automática':'Automatic'}</option>
    <option value="WAIVED">{pt?'Isentar (exige justificativa)':'Waive (reason required)'}</option>
    <option value="ADJUSTED">{pt?'Ajustar total (exige justificativa)':'Adjust total (reason required)'}</option>
   </select>
  </label>
  {data.feeMode!=='AUTOMATIC'&&<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
   {data.feeMode==='ADJUSTED'&&<label className="text-xs font-semibold">
    {pt?'Taxa extra ajustada (R$)':'Adjusted surcharge (BRL)'}
    <input required type="number" min="0" step="0.01" name="feeAdjustment" value={data.feeAdjustment}
     onChange={onChange} className="block mt-1 w-full px-3 py-2 rounded-xl bg-white"/>
   </label>}
   <label className="text-xs font-semibold">{pt?'Justificativa':'Reason'}
    <input required name="feeReason" maxLength={300} value={data.feeReason} onChange={onChange}
     className="block mt-1 w-full px-3 py-2 rounded-xl bg-white"/></label>
  </div>}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
   <label className="text-xs font-semibold">{pt?'Pagamento previsto':'Planned payment method'}
    <select name="paymentMethod" value={data.paymentMethod} onChange={onChange}
     className="block mt-1 w-full px-3 py-2 rounded-xl bg-white">
     <option value="PIX">PIX</option><option value="BANK_TRANSFER">{pt?'Transferência bancária':'Bank transfer'}</option>
     <option value="CUSTOM">{pt?'Outra':'Other'}</option>
    </select>
   </label>
   <label className="text-xs font-semibold">{pt?'Vencimento da parcela':'Installment due event'}
    <select name="paymentDueEvent" value={data.paymentDueEvent} onChange={onChange}
     className="block mt-1 w-full px-3 py-2 rounded-xl bg-white">
     <option value="CHECKIN">Check-in</option>
     <option value="KEY_HANDOVER">{pt?'Entrega das chaves':'Key handover'}</option>
     <option value="AGREED_EVENT">{pt?'Evento combinado':'Agreed event'}</option>
    </select>
   </label>
  </div>
  <p className="text-xs text-slate-600">{pt?
   'Dados pessoais são opcionais no rascunho e criptografados no backend. Uma parcela pendente utiliza o total calculado pelo servidor; isso não confirma qualquer pagamento.':
   'Personal details are optional in drafts and encrypted on the backend. One pending installment uses the server-calculated total; this does not confirm payment.'}</p>
 </section>;
}
