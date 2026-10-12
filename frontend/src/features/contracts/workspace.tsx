import {useEffect,useMemo,useState} from 'react';
import {FileText,Download,Eye,LockKeyhole,Save,RefreshCw,Plus,Trash2} from 'lucide-react';
import {useLanguage} from '../../i18n/context';
import {localizeError} from '../../i18n/messages';
import {contractsWorkspaceEnabled,listContracts,getContract,saveContractDraft,downloadDraftPdf,
 contractFinalizationEnabled,prepareContractFinalization,finalizeContract,downloadFinalContractPdf,
 type ContractListItem,type ContractDetail,type DraftInstallment} from './contract-workspace-api';

const money=(value:number,locale:string)=>new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(value/100);
const guestFields=[
 ['cpf','CPF'],['rg','RG'],['nationality','Nacionalidade / Nationality'],
 ['maritalStatus','Estado civil / Marital status'],['address','Endereço / Address'],
 ['phone','Telefone / Phone'],['email','E-mail']
] as const;
function displayError(value:unknown,locale:'pt-BR'|'en'){
 return localizeError(value instanceof Error?value.message:String(value),locale);
}

export function ContractsWorkspacePage(){
 const {locale}=useLanguage(),pt=locale==='pt-BR';
 const [items,setItems]=useState<ContractListItem[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [detail,setDetail]=useState<ContractDetail|null>(null);
 const [guest,setGuest]=useState<Record<string,string>>({});
 const [payments,setPayments]=useState<DraftInstallment[]>([]);
 const [guestDirty,setGuestDirty]=useState(false),[paymentsDirty,setPaymentsDirty]=useState(false);
 const [loading,setLoading]=useState(true),[detailBusy,setDetailBusy]=useState(false),[saving,setSaving]=useState(false);
 const [pdfBusy,setPdfBusy]=useState(false);
 const [finalBusy,setFinalBusy]=useState(false);
 const [reviewToken,setReviewToken]=useState<string|null>(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const [query,setQuery]=useState(''),[status,setStatus]=useState('ALL'),[property,setProperty]=useState('ALL');
 const refresh=async()=>{
  setLoading(true);setError('');
  try{const result=await listContracts();setItems(result.items);
   setSelected(previous=>previous&&result.items.some(x=>x.id===previous)?previous:result.items[0]?.id??null);
  }catch(e){setError(displayError(e,locale));}finally{setLoading(false);}
 };
 useEffect(()=>{
  if(!contractsWorkspaceEnabled){setLoading(false);return;}
  let active=true;
  listContracts().then(data=>{if(active){setItems(data.items);setSelected(data.items[0]?.id??null);}})
   .catch(e=>{if(active)setError(displayError(e,locale));})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[locale]);
 useEffect(()=>{
  if(!selected||!contractsWorkspaceEnabled){setDetail(null);return;}
  let alive=true;setDetailBusy(true);setError('');
  getContract(selected).then(data=>{if(!alive)return;
   setDetail(data);setGuest({...data.guest});setPayments(data.installments.map(x=>({...x})));
   setGuestDirty(false);setPaymentsDirty(false);setReviewToken(null);setNotice('');
  }).catch(e=>{if(alive){setDetail(null);setError(displayError(e,locale));}})
   .finally(()=>{if(alive)setDetailBusy(false);});
  return()=>{alive=false;};
 },[selected,locale]);
 const properties=useMemo(()=>[...new Map(items.map(x=>[x.propertyId,x.propertyName])).entries()], [items]);
 const filtered=useMemo(()=>items.filter(x=>
  (status==='ALL'||status===x.status)&&(property==='ALL'||property===x.propertyId)&&
  [x.firstName,x.lastName,x.propertyName,x.startDate,x.endDate].join(' ')
   .toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR').trim())
 ),[items,status,property,query]);
 const editable=detail?.editable===true;
 const paid=payments.some(x=>(x.receivedCents??0)>0||Boolean(x.paidAt));
 const modifyPayment=(index:number,delta:Partial<DraftInstallment>)=>{
  setPayments(rows=>rows.map((r,i)=>i===index?{...r,...delta}:r));
  setPaymentsDirty(true);setReviewToken(null);setNotice('');
 };
 const save=async()=>{
  if(!detail||!editable||(!guestDirty&&!paymentsDirty))return;
  setSaving(true);setError('');setNotice('');
  try{
   const dto={
    editToken:detail.editToken,
    ...(guestDirty?{guest:Object.fromEntries(guestFields.map(([key])=>[key,guest[key]??'']))}:{}),
    ...(paymentsDirty?{installments:payments.map(row=>({
     agreedCents:row.agreedCents,
     ...(row.dueDate?{dueDate:row.dueDate}:{}),
     ...(row.dueEvent?{dueEvent:row.dueEvent}:{}),
     ...(row.paymentMethod?{paymentMethod:row.paymentMethod}:{}),
     isDeposit:row.isDeposit
    }))}:{})
   };
   const next=await saveContractDraft(detail.id,dto);
   setDetail(next);setGuest({...next.guest});setPayments(next.installments.map(x=>({...x})));
   setGuestDirty(false);setPaymentsDirty(false);setReviewToken(null);
   setNotice(pt?'Rascunho salvo e prévia atualizada.':'Draft saved and preview refreshed.');
  }catch(e){setError(displayError(e,locale));}
  finally{setSaving(false);}
 };
 const requestFinalReview=async()=>{
  if(!detail||guestDirty||paymentsDirty)return;
  setFinalBusy(true);setError('');setNotice('');setReviewToken(null);
  try {
   const result=await prepareContractFinalization(detail.id);
   setReviewToken(result.reviewToken);
   setNotice(pt?'Validações concluídas. Revise o documento e confirme a finalização não assinada.':
    'Checks passed. Review the document and confirm unsigned finalization.');
  }catch(e){setError(displayError(e,locale));}
  finally{setFinalBusy(false);}
 };
 const completeFinalization=async()=>{
  if(!detail||!reviewToken||guestDirty||paymentsDirty)return;
  if(!window.confirm(pt?'Finalizar e arquivar permanentemente esta versão SEM assinatura?':
   'Permanently finalize and archive this version WITHOUT a signature?'))return;
  setFinalBusy(true);setError('');
  try {
   await finalizeContract(detail.id,reviewToken);
   const next=await getContract(detail.id);
   setDetail(next);setReviewToken(null);
   await refresh();
   setNotice(pt?'Contrato finalizado, arquivado e não assinado.':
    'Contract finalized and archived. It remains unsigned.');
  }catch(e){setReviewToken(null);setError(displayError(e,locale));}
  finally{setFinalBusy(false);}
 };
 const finalPdf=async()=>{
  if(!detail||detail.status!=='FINALIZED')return;
  setPdfBusy(true);setError('');
  try {
   const blob=await downloadFinalContractPdf(detail.id,detail.revisionId);
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='contrato-finalizado-nao-assinado.pdf';
   document.body.appendChild(a);a.click();a.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){setError(displayError(e,locale));}
  finally{setPdfBusy(false);}
 };
 const pdf=async(download:boolean)=>{
  if(!detail)return;
  setPdfBusy(true);setError('');
  try{
   const blob=await downloadDraftPdf(detail.id),url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;
   if(download)a.download='contrato-rascunho.pdf';
   else{a.target='_blank';a.rel='noopener noreferrer';}
   document.body.appendChild(a);a.click();a.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
  }catch(e){setError(displayError(e,locale));}
  finally{setPdfBusy(false);}
 };
 if(!contractsWorkspaceEnabled)return <section className="rf-panel rf-contract-disabled">
  <LockKeyhole/><h2>{pt?'Contratos indisponíveis':'Contracts unavailable'}</h2>
  <p>{pt?'A área de contratos ainda não está habilitada.':'The contract workspace is not enabled.'}</p>
 </section>;
 return <section className="rf-contract-workspace">
  <header className="rf-contract-heading">
   <div><h2>{pt?'Contratos de temporada':'Rental contracts'}</h2>
    <p>{pt?'Revise hóspedes, parcelas e versões antes da finalização.':'Review guests, installments and versions before finalization.'}</p>
   </div>
   <button type="button" className="rf-button" onClick={()=>void refresh()} disabled={loading}>
    <RefreshCw size={15}/>{pt?'Atualizar':'Refresh'}
   </button>
  </header>
  {error&&<p role="alert" className="rf-contract-error">{error}</p>}
  {notice&&<p role="status" className="rf-contract-success">{notice}</p>}
  <div className="rf-contract-workspace-grid">
   <aside className="rf-panel rf-contract-workspace-list">
    <h3>{pt?'Reservas com contrato':'Bookings with contracts'}</h3>
    <label className="rf-contract-field">{pt?'Buscar':'Search'}
     <input type="search" maxLength={100} value={query} onChange={e=>setQuery(e.target.value)}
      placeholder={pt?'Hóspede ou imóvel':'Guest or property'}/></label>
    <div className="rf-contract-workspace-filters">
     <label className="rf-contract-field">{pt?'Estado':'Status'}
      <select value={status} onChange={e=>setStatus(e.target.value)}>
       <option value="ALL">{pt?'Todos':'All'}</option><option value="DRAFT">{pt?'Rascunho':'Draft'}</option>
       <option value="READY">{pt?'Pronto':'Ready'}</option><option value="FINALIZED">{pt?'Finalizado':'Finalized'}</option>
      </select></label>
     <label className="rf-contract-field">{pt?'Imóvel':'Property'}
      <select value={property} onChange={e=>setProperty(e.target.value)}>
       <option value="ALL">{pt?'Todos':'All'}</option>
       {properties.map(([id,name])=><option key={id} value={id}>{name}</option>)}
      </select></label>
    </div>
    {loading?<p>{pt?'Carregando...':'Loading...'}</p>:filtered.length===0?
     <p className="rf-contract-help">{pt?'Nenhum contrato encontrado.':'No contracts found.'}</p>:
     <div className="rf-contract-workspace-cards">{filtered.map(x=><button key={x.id} type="button"
      onClick={()=>setSelected(x.id)} aria-pressed={selected===x.id}
      className={'rf-contract-workspace-item '+(selected===x.id?'active':'')}>
      <span className="rf-contract-workspace-item-title">{x.firstName} {x.lastName}</span>
      <span>{x.propertyName} · {x.startDate} → {x.endDate}</span>
      <span>{money(Math.round(x.revenue*100),locale)} · {x.status}</span>
     </button>)}</div>}
    <p className="rf-contract-help">{pt?'Exibindo até 100 contratos recentes.':'Showing up to 100 recent contracts.'}</p>
   </aside>
   <div className="rf-panel rf-contract-workspace-detail">
    {detailBusy?<p>{pt?'Carregando contrato...':'Loading contract...'}</p>:!detail?
     <p>{pt?'Escolha um contrato da lista.':'Choose a contract from the list.'}</p>:<>
     <div className="rf-contract-workspace-title">
      <div><h3><FileText size={20}/>{detail.booking.clientFirstName} {detail.booking.clientLastName}</h3>
       <p>{detail.property.name} · {detail.booking.startDate} → {detail.booking.endDate}</p></div>
      <strong>{detail.status} · v{detail.revisionVersion}</strong>
     </div>
     <p className="rf-contract-help">{pt?'Total definido pelo servidor':'Server-authoritative total'}: <strong>{money(detail.booking.totalCents,locale)}</strong>.
      {' '}{pt?'O valor da reserva não pode ser alterado pelo editor do contrato.':'The contract editor cannot change the booking total.'}</p>
     {detail.pricing?.guestFeeReason&&<p className="rf-contract-help">
      {pt?'Justificativa para taxa de hóspedes':'Guest surcharge justification'}: {String(detail.pricing.guestFeeReason)}
     </p>}
     {!editable&&<p className="rf-contract-help">{pt?'Revisões prontas ou finalizadas não permitem alterações aqui.':'Ready or finalized revisions cannot be edited here.'}</p>}
     <h4>{pt?'Identificação do contratante':'Contracting guest identification'}</h4>
     <p className="rf-contract-help">{pt?'O nome do contratante vem da reserva. O restante é um rascunho criptografado.':'Guest name comes from the booking; these draft identity fields are encrypted at rest.'}</p>
     <div className="rf-contract-grid">
      {guestFields.map(([key,label])=><label key={key} className="rf-contract-field">{label}
       <input name={key} autoComplete="off" maxLength={key==='address'?500:key==='email'?254:key==='phone'?32:key==='nationality'||key==='maritalStatus'?40:20}
        disabled={!editable||saving} value={guest[key]??''} onChange={e=>{
         setGuest(g=>({...g,[key]:e.target.value}));setGuestDirty(true);setReviewToken(null);setNotice('');
        }}/></label>)}
     </div>
     <h4>{pt?'Parcelas previstas':'Planned installments'}</h4>
     {paid&&<p className="rf-contract-help">{pt?'Há pagamento registrado. O plano não pode ser reescrito nesta tela.':'Payments are recorded. The schedule cannot be rewritten here.'}</p>}
     <div className="rf-contract-workspace-installments">
      {payments.map((x,index)=><div className="rf-contract-installment" key={x.id??index}>
       <span>{pt?'Parcela':'Installment'} {index+1}</span>
       <label className="rf-contract-field">{pt?'Valor (R$)':'Amount (BRL)'}
        <input type="number" min="0" step="0.01" value={x.agreedCents/100}
         disabled={!editable||paid||saving} onChange={e=>modifyPayment(index,{agreedCents:Math.round(Number(e.target.value)*100)})}/></label>
       <label className="rf-contract-field">{pt?'Data de vencimento':'Due date'}
        <input type="date" value={x.dueDate??''} disabled={!editable||paid||saving} onChange={e=>
         modifyPayment(index,{dueDate:e.target.value||null,dueEvent:null})}/></label>
       <label className="rf-contract-field">{pt?'Ou evento':'Or due event'}
        <select value={x.dueEvent??''} disabled={!editable||paid||saving} onChange={e=>
         modifyPayment(index,{dueEvent:e.target.value||null,dueDate:null})}>
         <option value="">{pt?'Pendente':'Pending'}</option><option value="CHECKIN">Check-in</option>
         <option value="KEY_HANDOVER">{pt?'Entrega das chaves':'Key handover'}</option>
         <option value="AGREED_EVENT">{pt?'Evento combinado':'Agreed event'}</option>
        </select></label>
       <label className="rf-contract-field">{pt?'Forma':'Method'}
        <select value={x.paymentMethod??''} disabled={!editable||paid||saving} onChange={e=>
         modifyPayment(index,{paymentMethod:e.target.value||null})}>
         <option value="">{pt?'Pendente':'Pending'}</option><option value="PIX">PIX</option>
         <option value="BANK_TRANSFER">{pt?'Transferência':'Bank transfer'}</option>
         <option value="CUSTOM">{pt?'Outro':'Other'}</option>
        </select></label>
       <label className="rf-contract-check"><input type="checkbox" checked={x.isDeposit} disabled={!editable||paid||saving}
        onChange={e=>modifyPayment(index,{isDeposit:e.target.checked})}/>
        {pt?'Sinal':'Deposit'}</label>
       {editable&&!paid&&payments.length>1&&<button type="button" aria-label={pt?'Remover parcela':'Remove installment'}
        onClick={()=>{setPayments(p=>p.filter((_,i)=>i!==index));setPaymentsDirty(true);}}><Trash2 size={17}/></button>}
      </div>)}
     </div>
     {editable&&!paid&&payments.length<12&&<button type="button" className="rf-button rf-contract-secondary"
      onClick={()=>{setPayments(p=>[...p,{sequence:p.length+1,agreedCents:0,isDeposit:false}]);setPaymentsDirty(true);}}>
      <Plus size={15}/>{pt?'Adicionar parcela':'Add installment'}</button>}
     {editable&&<button type="button" className="rf-button" disabled={saving||(!guestDirty&&!paymentsDirty)} onClick={()=>void save()}>
      <Save size={17}/>{saving?(pt?'Salvando...':'Saving...'):pt?'Salvar rascunho':'Save draft'}</button>}
     <div className="rf-contract-workspace-preview">
      <div className="rf-contract-workspace-title"><h4>{pt?'Prévia do contrato':'Contract preview'}</h4>
       <span>{pt?'Não finalizado':'Not finalized'}</span></div>
      {detail.preview.missing.length>0&&<p className="rf-contract-help" role="status">
       {pt?'Campos pendentes: ':'Missing fields: '}{detail.preview.missing.join(', ')}</p>}
      {detail.preview.clauses.length===0?<p>{pt?'Publique primeiro um modelo aprovado.':'Publish an approved template first.'}</p>:
       <div className="rf-contract-preview">{detail.preview.clauses.map(c=><article key={c.id}>
        <h4>{c.title}</h4><p>{c.body}</p>
       </article>)}</div>}
      {detail.status==='DRAFT'&&<div className="rf-contract-actions">
       <button type="button" className="rf-button rf-contract-secondary" disabled={pdfBusy} onClick={()=>void pdf(false)}>
        <Eye size={16}/>{pt?'Ver PDF rascunho':'Preview draft PDF'}</button>
       <button type="button" className="rf-button rf-contract-secondary" disabled={pdfBusy} onClick={()=>void pdf(true)}>
        <Download size={16}/>{pt?'Baixar prévia':'Download preview'}</button>
      </div>}
      {detail.status==='DRAFT'&&<p className="rf-contract-help">{pt?'Prévia não assinada e sem validade de contrato final.':'Unsigned preview; not a finalized contract.'}</p>}
     </div>
     {contractFinalizationEnabled&&detail.status==='DRAFT'&&<div className="rf-contract-actions">
      <p className="rf-contract-help">{pt?'A finalização arquiva uma versão imutável, sem recolher assinaturas. Salve e revise todos os campos antes de continuar.':
       'Finalization creates an immutable archive without collecting signatures. Save and check all fields first.'}</p>
      <button type="button" className="rf-button rf-contract-secondary"
       disabled={finalBusy||guestDirty||paymentsDirty||!detail.preview.ready}
       onClick={()=>void requestFinalReview()}>{pt?'Validar para finalização':'Validate for finalization'}</button>
      {reviewToken&&<button type="button" className="rf-button" disabled={finalBusy}
       onClick={()=>void completeFinalization()}>{pt?'Confirmar finalização sem assinatura':'Confirm unsigned finalization'}</button>}
     </div>}
     {contractFinalizationEnabled&&detail.status==='FINALIZED'&&<div className="rf-contract-actions">
      <p className="rf-contract-help">{pt?'Arquivo finalizado, porém não assinado.':'Finalized archive, not signed.'}</p>
      <button type="button" className="rf-button rf-contract-secondary" disabled={pdfBusy}
       onClick={()=>void finalPdf()}><Download size={16}/>{pt?'Baixar PDF arquivado':'Download archived PDF'}</button>
     </div>}
     <h4>{pt?'Histórico de revisões':'Revision history'}</h4>
     <div className="rf-contract-workspace-history">
      {detail.history.map(x=><p key={x.id}>v{x.version} · {x.status} · {String(x.createdAt).slice(0,10)}</p>)}
     </div>
    </>}
   </div>
  </div>
 </section>;
}
