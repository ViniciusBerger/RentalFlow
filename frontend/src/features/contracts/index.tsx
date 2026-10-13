import {useEffect, useState} from 'react';
import {CheckCircle2,FileText,LockKeyhole,ChevronLeft,ChevronRight,Plus,Save,ShieldCheck} from 'lucide-react';
import {useLanguage} from '../../i18n/context';
import {loadProperties,type Property} from '../properties/property-data';
import {
 contractFeatureEnabled,initialLandlord,initialPayment,initialPolicy,initialProperty,
 readSettings,saveSettings,readTemplate,saveTemplateDraft,publishTemplate,readPropertySetup,savePropertySetup,
 type Landlord,type Payment,type Policy,type Clause,type PropertySetup
} from './contract-api';
const texts={
 'pt-BR':{
  title:'Modelo de contrato',subtitle:'Configure os dados do locador, as regras e o contrato de temporada.',
  pending:'A configuração de contratos ainda não está ativada nesta instalação. Nenhum dado pessoal será solicitado.',
  landlord:'Locador',payment:'Pagamento',policy:'Políticas',property:'Imóvel',clauses:'Cláusulas',review:'Revisão',
  save:'Salvar configurações',saved:'Configurações salvas.',saveProperty:'Salvar regras do imóvel',propertySaved:'Regras do imóvel salvas.',
  saveDraft:'Salvar rascunho',draftSaved:'Rascunho salvo.',publish:'Publicar modelo',published:'Nova versão publicada.',
  busy:'Salvando...',next:'Avançar',back:'Voltar',
  noSource:'Cole o texto do contrato original em cada cláusula e no anexo. Não incluímos redação jurídica gerada automaticamente.',
  templateWarning:'É necessário preencher as 16 cláusulas e o Anexo I para publicar. A versão publicada não poderá ser alterada.',
  lastPublished:'Última versão publicada',notPublished:'Nenhuma versão publicada',draft:'Rascunho',addClause:'Adicionar cláusula opcional',
  remove:'Remover',disabled:'Desativada',preview:'Prévia do modelo',agree:'Revisei o texto e autorizo a publicação desta versão.',
  confirm:'Deseja publicar esta versão? O documento será imutável e novas alterações exigirão uma nova versão.',
  propertyAddress:'Endereço atual do imóvel',propertyAddressHelp:'Cadastre o endereço completo na página Imóveis antes de finalizar contratos.',
  selectProperty:'Selecione um imóvel',noProperties:'Cadastre um imóvel antes de definir suas regras.',
  general:'Dados para contratos sazonais brasileiros. CPF ou CNPJ, endereço e dados bancários são protegidos no backend autenticado.',
  documentType:'Tipo de locador',individual:'Pessoa física (CPF)',company:'Pessoa jurídica (CNPJ)',
  companyName:'Razão social da empresa',representativeName:'Nome do representante legal',
  representativeCpf:'CPF do representante legal',representativeRole:'Cargo / função do representante',
  companyHelp:'Informe um representante autorizado. CPF/CNPJ e dados do representante não constituem uma assinatura eletrônica. Para cláusulas empresariais use {{locador.documento}}, {{locador.cnpj}} ou {{locador.representante}} no texto original aprovado.',
  fullName:'Nome completo',cpf:'CPF',rg:'RG',address:'Endereço residencial',street:'Rua / logradouro',number:'Número (ou s/n)',district:'Bairro',city:'Cidade',state:'UF',zip:'CEP',complement:'Complemento (opcional)',phone:'Telefone (opcional)',
  email:'E-mail (opcional)',pix:'Chave PIX',bank:'Banco',agency:'Agência',account:'Conta',
  count:'Número padrão de parcelas',methods:'Formas de pagamento',due:'Vencimento padrão',deposit:'Tratamento do sinal',
  jurisdiction:'Foro (Cidade/UF)',cancelDays:'Prazo de cancelamento (dias)',damage:'Multa por danos (%)',
  breach:'Multa por descumprimento (%)',utilities:'Água, luz, gás e tributos incluídos',
  included:'Hóspedes incluídos',maximum:'Capacidade máxima',extra:'Taxa extra (centavos por pessoa/noite)',
  in:'Check-in',out:'Check-out',linen:'Fornece roupas de cama e banho',pool:'Possui piscina',
  rules:'Regras específicas (uma por linha)',newVersion:'Ao editar um modelo publicado, será criado um novo rascunho.',
  enabled:'Cláusula ativa',empty:'A cláusula ainda não possui texto.',version:'Versão',
  unpublished:'Publicação bloqueada até o cadastro completo e aprovação do texto.',
  requestError:'Não foi possível carregar os dados de contrato. Confira as migrações e as configurações de segurança.',
 },
 en:{
  title:'Contract template',subtitle:'Configure landlord details, policies, and your seasonal rental contract.',
  pending:'Contract configuration is not enabled in this installation. No sensitive data will be requested.',
  landlord:'Landlord',payment:'Payments',policy:'Policies',property:'Property',clauses:'Clauses',review:'Review',
  save:'Save settings',saved:'Settings saved.',saveProperty:'Save property rules',propertySaved:'Property rules saved.',
  saveDraft:'Save draft',draftSaved:'Draft saved.',publish:'Publish template',published:'New template version published.',
  busy:'Saving...',next:'Next',back:'Back',
  noSource:'Paste the original contract wording into each clause and annex. No generated legal text has been substituted.',
  templateWarning:'Complete all 16 clauses and Annex I to publish. A published version cannot be edited.',
  lastPublished:'Latest published version',notPublished:'No published version',draft:'Draft',addClause:'Add optional clause',
  remove:'Remove',disabled:'Disabled',preview:'Template preview',agree:'I reviewed the text and approve publication of this version.',
  confirm:'Publish this version? It will be immutable and subsequent changes will require a new version.',
  propertyAddress:'Current property address',propertyAddressHelp:'Provide the full address on the Properties page before finalizing contracts.',
  selectProperty:'Choose a property',noProperties:'Add a property before defining contract rules.',
  general:'Brazilian rental details. CPF or CNPJ, address and bank information are protected by the authenticated backend.',
  documentType:'Landlord type',individual:'Individual (CPF)',company:'Company (CNPJ)',
  companyName:'Registered company legal name',representativeName:'Authorized representative name',
  representativeCpf:'Representative CPF',representativeRole:'Representative role',
  companyHelp:'Provide an authorized representative. Company and representative details are not an electronic signature. Use {{locador.documento}}, {{locador.cnpj}} or {{locador.representante}} in your approved company template wording.',
  fullName:'Full name',cpf:'CPF',rg:'RG',address:'Residential address',street:'Street',number:'Number (or s/n)',district:'District',city:'City',state:'State (UF)',zip:'Postal code (CEP)',complement:'Complement (optional)',phone:'Phone (optional)',
  email:'Email (optional)',pix:'PIX key',bank:'Bank name',agency:'Bank branch',account:'Bank account',
  count:'Default installment count',methods:'Accepted payment methods',due:'Default payment due',deposit:'Deposit classification',
  jurisdiction:'Jurisdiction (City/State)',cancelDays:'Cancellation window (days)',damage:'Damage penalty (%)',
  breach:'Breach penalty (%)',utilities:'Water, electricity, gas and taxes included',
  included:'Included guests',maximum:'Maximum capacity',extra:'Extra fee (cents per guest/night)',
  in:'Check-in',out:'Check-out',linen:'Linens provided',pool:'Has swimming pool',
  rules:'Property rules (one per line)',newVersion:'Editing a published template will create a new draft version.',
  enabled:'Clause enabled',empty:'Clause wording not supplied yet.',version:'Version',
  unpublished:'Publication remains blocked until all required details and text are approved.',
  requestError:'Could not load contract configuration. Check migrations and security settings.'
 }
} as const;
const steps=['landlord','payment','policy','property','clauses','review'] as const;
export const ContractQuestionnairePage=()=>{
 const {locale}=useLanguage();const t=texts[locale];
 const [step,setStep]=useState(0),[landlord,setLandlord]=useState<Landlord>(initialLandlord);
 const [policy,setPolicy]=useState<Policy>(initialPolicy),[payment,setPayment]=useState<Payment>(initialPayment);
 const [clauses,setClauses]=useState<Clause[]>([]),[draftId,setDraftId]=useState<string|null>(null);
 const [published,setPublished]=useState<number|null>(null),[properties,setProperties]=useState<Property[]>([]);
 const [propertyId,setPropertyId]=useState(''),[prop,setProp]=useState<PropertySetup>(initialProperty),[rules,setRules]=useState('');
 const [approved,setApproved]=useState(false),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{
  if(!contractFeatureEnabled){setLoading(false);return;}
  let active=true;
  Promise.all([readSettings(),readTemplate(),loadProperties()]).then(([settings,template,list])=>{
   if(!active)return;
   setLandlord({...initialLandlord,...settings.landlord});setPolicy({...initialPolicy,...settings.policy});
   setPayment({...initialPayment,...settings.payment});setClauses(template.draft?.clauses??template.published?.clauses??template.scaffold);
   setDraftId(template.draft?.id??null);setPublished(template.published?.versionNumber??null);setProperties(list.filter(p=>p.isActive));
   setPropertyId(list.find(p=>p.isActive)?.id??'');
  }).catch(()=>{if(active)setError(t.requestError)}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[t.requestError]);
 useEffect(()=>{
  if(!propertyId||!contractFeatureEnabled)return;
  let active=true;
  readPropertySetup(propertyId).then(result=>{
   if(active){setProp({...initialProperty,...result.settings});setRules(result.settings?.houseRules.join('\n')??'');}
  }).catch(()=>{if(active)setError(t.requestError)});
  return()=>{active=false};
 },[propertyId,t.requestError]);
 const action=async (fn:()=>Promise<void>)=>{
  setSaving(true);setError('');setMessage('');
  try{await fn();}catch(e){setError(e instanceof Error?e.message:t.requestError);}finally{setSaving(false);}
 };
 const saveAccount=()=>action(async()=>{await saveSettings(landlord,policy,payment);setMessage(t.saved)});
 const saveProperty=()=>action(async()=>{if(!propertyId)return;await savePropertySetup(propertyId,{...prop,houseRules:rules.split('\n').map(s=>s.trim()).filter(Boolean)});setMessage(t.propertySaved)});
 const saveClauses=()=>action(async()=>{const result=await saveTemplateDraft(clauses);setDraftId(result.id);setApproved(false);setMessage(t.draftSaved)});
 const publish=()=>action(async()=>{
  if(!draftId||!approved||!window.confirm(t.confirm))return;
  const result=await publishTemplate(draftId);setPublished(result.versionNumber);setDraftId(null);setApproved(false);setMessage(t.published);
 });
 const editClause=(id:string,change:Partial<Clause>)=>{setClauses(list=>list.map(c=>c.id===id?{...c,...change}:c));setApproved(false);setDraftId(null)};
 const addClause=()=>{setDraftId(null);setApproved(false);setClauses(list=>[...list,{id:`extra-${Math.random().toString(36).slice(2,10)}`,title:locale==='pt-BR'?'Cláusula adicional':'Additional clause',body:'',enabled:false}])};
 const field=(label:string,key:keyof Landlord,type='text')=><label className="rf-contract-field" key={key}>{label}
  <input type={type} maxLength={key==='addressStreet'?120:254} value={landlord[key]} onChange={e=>setLandlord(x=>({...x,[key]:e.target.value}))} autoComplete="off"/></label>;
 const number=(label:string,key:keyof Policy)=><label className="rf-contract-field" key={key}>{label}
  <input type="number" min="0" max={key==='cancellationDays'?365:100} value={policy[key] as number}
   onChange={e=>setPolicy(x=>({...x,[key]:Number(e.target.value)}))}/></label>;
 if(!contractFeatureEnabled)return <section className="rf-panel rf-contract-disabled"><LockKeyhole/><h2>{t.title}</h2><p>{t.pending}</p></section>;
 return <section className="rf-contract-page">
  <div className="rf-contract-heading"><div><h2>{t.title}</h2><p>{t.subtitle}</p></div><span className="rf-contract-privacy"><ShieldCheck size={17}/>{t.general}</span></div>
  {error&&<p role="alert" className="rf-contract-error">{error}</p>}
  {message&&<p role="status" className="rf-contract-success"><CheckCircle2 size={17}/>{message}</p>}
  {loading?<p>{locale==='pt-BR'?'Carregando…':'Loading…'}</p>:<>
   <nav className="rf-contract-steps" aria-label={t.title}>{steps.map((name,i)=><button key={name} type="button"
    onClick={()=>{setStep(i);setError('');setMessage('')}} className={step===i?'active':''} aria-current={step===i?'step':undefined}>
    <span>{i+1}</span>{t[name]}</button>)}</nav>
   <div className="rf-panel rf-contract-card">
   {step===0&&<><h3>{t.landlord}</h3><p>{t.general}</p>
    <label className="rf-contract-field">{t.documentType}
     <select value={landlord.documentType} onChange={e=>setLandlord(x=>({
      ...x,documentType:e.target.value as Landlord['documentType'],fullName:'',cpf:'',rg:'',cnpj:'',
      representativeName:'',representativeCpf:'',representativeRole:''
     }))}>
      <option value="CPF">{t.individual}</option><option value="CNPJ">{t.company}</option>
     </select></label>
    {landlord.documentType==='CNPJ'&&<p className="rf-contract-help">{t.companyHelp}</p>}
    <div className="rf-contract-grid">{field(landlord.documentType==='CNPJ'?t.companyName:t.fullName,'fullName')}
     {landlord.documentType==='CNPJ'?<>
      {field('CNPJ','cnpj')}{field(t.representativeName,'representativeName')}
      {field(t.representativeCpf,'representativeCpf')}{field(t.representativeRole,'representativeRole')}
     </>:<>{field(t.cpf,'cpf')}{field(t.rg,'rg')}</>}
     {field(t.street,'addressStreet')}{field(t.number,'addressNumber')}{field(t.district,'addressDistrict')}{field(t.city,'addressCity')}{field(t.state,'addressState')}{field(t.zip,'addressPostalCode')}{field(t.complement,'addressComplement')}{field(t.phone,'phone','tel')}{field(t.email,'email','email')}
     {field(t.pix,'pixKey')}{field(t.bank,'bankName')}{field(t.agency,'bankAgency')}{field(t.account,'bankAccount')}</div>
    <button disabled={saving} className="rf-button" type="button" onClick={()=>void saveAccount()}><Save size={17}/>{saving?t.busy:t.save}</button>
   </>}
   {step===1&&<><h3>{t.payment}</h3><div className="rf-contract-grid">
    <label className="rf-contract-field">{t.count}<input type="number" min={1} max={12} value={payment.installmentCount}
     onChange={e=>setPayment(x=>({...x,installmentCount:Number(e.target.value)}))}/></label>
    <fieldset className="rf-contract-field"><legend>{t.methods}</legend>
     {(['PIX','BANK_TRANSFER','CUSTOM'] as const).map(method=><label key={method} className="rf-contract-check"><input type="checkbox"
      checked={payment.acceptedMethods.includes(method)} onChange={e=>setPayment(x=>({...x,acceptedMethods:e.target.checked?
       [...x.acceptedMethods,method]:x.acceptedMethods.filter(m=>m!==method)}))}/>{method==='BANK_TRANSFER'?'Transferência bancária':method}</label>)}</fieldset>
    <label className="rf-contract-field">{t.due}<select value={payment.defaultDueRule} onChange={e=>setPayment(x=>({...x,defaultDueRule:e.target.value}))}>
     <option value="DATE">Data informada</option><option value="CHECKIN">Check-in</option>
     <option value="KEY_HANDOVER">Entrega das chaves</option><option value="AGREED_EVENT">Evento combinado</option></select></label>
    <label className="rf-contract-field">{t.deposit}<select value={payment.depositMode} onChange={e=>setPayment(x=>({...x,depositMode:e.target.value}))}>
     <option value="MANUAL">Manual</option><option value="FIRST_INSTALLMENT">Primeira parcela</option><option value="NONE">Sem sinal</option></select></label>
    </div><button disabled={saving} className="rf-button" type="button" onClick={()=>void saveAccount()}><Save size={17}/>{saving?t.busy:t.save}</button>
   </>}
   {step===2&&<><h3>{t.policy}</h3><div className="rf-contract-grid">
    <label className="rf-contract-field">{t.jurisdiction}<input maxLength={90} placeholder="Vila Velha/ES"
     value={policy.jurisdiction} onChange={e=>setPolicy(x=>({...x,jurisdiction:e.target.value}))}/></label>
    {number(t.cancelDays,'cancellationDays')}{number(t.damage,'damagePenaltyPercent')}{number(t.breach,'breachPenaltyPercent')}
    <label className="rf-contract-check"><input type="checkbox" checked={policy.utilitiesIncluded}
     onChange={e=>setPolicy(x=>({...x,utilitiesIncluded:e.target.checked}))}/>{t.utilities}</label>
    </div><button disabled={saving} className="rf-button" type="button" onClick={()=>void saveAccount()}><Save size={17}/>{saving?t.busy:t.save}</button>
   </>}
   {step===3&&<><h3>{t.property}</h3>
    {properties.length===0?<p>{t.noProperties}</p>:<>
    <label className="rf-contract-field">{t.selectProperty}<select value={propertyId} onChange={e=>setPropertyId(e.target.value)}>
     {properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <p className="rf-contract-help">{t.propertyAddress}: {properties.find(p=>p.id===propertyId)?.address||'—'}. {t.propertyAddressHelp}</p>
    <div className="rf-contract-grid">
     {([['includedOccupancy',t.included],['maximumOccupancy',t.maximum],['extraGuestRateCents',t.extra]] as const).map(([key,label])=>
      <label className="rf-contract-field" key={key}>{label}<input type="number" min={key==='extraGuestRateCents'?0:1}
       value={prop[key]} onChange={e=>setProp(x=>({...x,[key]:Number(e.target.value)}))}/></label>)}
     {([['checkInTime',t.in],['checkOutTime',t.out]] as const).map(([key,label])=><label key={key} className="rf-contract-field">{label}
      <input type="time" value={prop[key]} onChange={e=>setProp(x=>({...x,[key]:e.target.value}))}/></label>)}
     <label className="rf-contract-check"><input type="checkbox" checked={prop.providesLinen}
      onChange={e=>setProp(x=>({...x,providesLinen:e.target.checked}))}/>{t.linen}</label>
     <label className="rf-contract-check"><input type="checkbox" checked={prop.hasPool}
      onChange={e=>setProp(x=>({...x,hasPool:e.target.checked}))}/>{t.pool}</label>
    </div>
    <label className="rf-contract-field">{t.rules}<textarea rows={5} maxLength={6000} value={rules}
     onChange={e=>setRules(e.target.value)}/></label>
    <button disabled={saving} className="rf-button" type="button" onClick={()=>void saveProperty()}><Save size={17}/>{saving?t.busy:t.saveProperty}</button>
    </>}</>}
   {step===4&&<><h3>{t.clauses}</h3><p className="rf-contract-help">{t.noSource}</p><p className="rf-contract-help">{t.newVersion}</p>
    <div className="rf-contract-clauses">{clauses.map((c,i)=><details key={c.id} className="rf-contract-clause" open={i===0&&clauses.length<20}>
     <summary><span>{c.id==='annex'?'Anexo I':c.id.startsWith('extra-')?'Extra':c.id.padStart(2,'0')} · {c.title}</span>
      <span className={c.body.trim()?'rf-contract-filled':'rf-contract-missing'}>{c.body.trim()?'✓':'!'}</span></summary>
     <div className="rf-contract-clause-editor">
      <label className="rf-contract-field">{locale==='pt-BR'?'Título':'Title'}<input maxLength={120} value={c.title}
       onChange={e=>editClause(c.id,{title:e.target.value})}/></label>
      <label className="rf-contract-field">{locale==='pt-BR'?'Texto':'Text'}<textarea rows={5} maxLength={10000} value={c.body}
       placeholder={t.empty} onChange={e=>editClause(c.id,{body:e.target.value})}/></label>
      {c.id.startsWith('extra-')&&<div className="rf-contract-actions"><label className="rf-contract-check"><input type="checkbox" checked={c.enabled}
       onChange={e=>editClause(c.id,{enabled:e.target.checked})}/>{t.enabled}</label>
       <button type="button" className="rf-outline" onClick={()=>{setClauses(x=>x.filter(v=>v.id!==c.id));setApproved(false);setDraftId(null)}}>{t.remove}</button></div>}
     </div>
    </details>)}</div>
    <div className="rf-contract-actions"><button type="button" className="rf-outline" onClick={addClause}><Plus size={17}/>{t.addClause}</button>
     <button type="button" className="rf-button" onClick={()=>void saveClauses()} disabled={saving}><Save size={17}/>{saving?t.busy:t.saveDraft}</button></div>
   </>}
   {step===5&&<><h3><FileText size={22}/>{t.review}</h3>
    <p className="rf-contract-help">{t.templateWarning}</p>
    <p className="rf-contract-version">{published?`${t.lastPublished}: ${t.version} ${published}`:t.notPublished}
     {draftId&&` · ${t.draft}`}</p>
    <div className="rf-contract-preview">{clauses.map(c=>c.enabled&&<article key={c.id}>
     <h4>{c.id==='annex'?'Anexo I':c.id.startsWith('extra-')?'Extra':c.id}. {c.title}</h4>
     <p>{c.body||t.empty}</p></article>)}</div>
    <label className="rf-contract-check rf-contract-approval"><input type="checkbox" checked={approved}
     onChange={e=>setApproved(e.target.checked)}/>{t.agree}</label>
    <p className="rf-contract-help">{t.unpublished}</p>
    <div className="rf-contract-actions"><button type="button" className="rf-outline" onClick={()=>void saveClauses()} disabled={saving}>{t.saveDraft}</button>
     <button className="rf-button" type="button" disabled={saving||!approved||!draftId} onClick={()=>void publish()}>
      <ShieldCheck size={17}/>{saving?t.busy:t.publish}</button></div>
   </>}
   </div>
   <div className="rf-contract-navigation">
    <button type="button" className="rf-outline" disabled={step===0} onClick={()=>setStep(i=>Math.max(0,i-1))}><ChevronLeft size={17}/>{t.back}</button>
    <span>{step+1} / {steps.length}</span>
    <button type="button" className="rf-outline" disabled={step===steps.length-1} onClick={()=>setStep(i=>Math.min(steps.length-1,i+1))}>{t.next}<ChevronRight size={17}/></button>
   </div>
  </>}
 </section>;
};
