import {useEffect,useState} from 'react';
import {AlertTriangle,ArrowRight} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useLanguage} from '../../i18n/context';
import {contractFeatureEnabled,readContractReadiness,type ContractReadinessIssue} from './contract-api';

const fieldLabels:Record<string,{pt:string;en:string}>={
 fullName:{pt:'Nome completo',en:'Full name'},cpf:{pt:'CPF',en:'CPF'},
 rg:{pt:'RG',en:'RG'},addressStreet:{pt:'Rua',en:'Street'},addressNumber:{pt:'Número',en:'Street number'},
 addressDistrict:{pt:'Bairro',en:'District'},addressCity:{pt:'Cidade',en:'City'},
 addressState:{pt:'UF',en:'State'},addressPostalCode:{pt:'CEP',en:'Postal code'},
 email:{pt:'E-mail',en:'Email'},phone:{pt:'Telefone',en:'Phone'},
 pixKey:{pt:'Chave PIX',en:'PIX key'},bankName:{pt:'Banco',en:'Bank name'},
 bankAgency:{pt:'Agência',en:'Bank branch'},bankAccount:{pt:'Conta',en:'Bank account'},
 jurisdiction:{pt:'Foro',en:'Jurisdiction'},acceptedMethods:{pt:'Meios de pagamento',en:'Payment methods'},
 address:{pt:'Endereço do imóvel',en:'Property address'},includedOccupancy:{pt:'Hóspedes inclusos',en:'Included guests'},
 maximumOccupancy:{pt:'Capacidade máxima',en:'Maximum occupancy'},
 extraGuestRateCents:{pt:'Taxa por hóspede extra',en:'Extra-guest fee'},
 checkInTime:{pt:'Horário de entrada',en:'Check-in time'},checkOutTime:{pt:'Horário de saída',en:'Check-out time'}
};
const issuesText={
 'pt-BR':{
 ACCOUNT_SETTINGS:'Questionário do locador não foi salvo',
 LANDLORD_DETAILS:'Dados obrigatórios do locador incompletos ou inválidos',
 PAYMENT_METHODS:'Formas de pagamento não configuradas',
 PAYMENT_DETAILS:'Dados de pagamento incompletos',
 JURISDICTION:'Foro do contrato ausente ou inválido',
 TEMPLATE_NOT_PUBLISHED:'Texto do contrato ainda não foi publicado',
 TEMPLATE_INVALID:'Cláusulas publicadas estão incompletas',
 NO_ACTIVE_PROPERTIES:'Nenhum imóvel ativo cadastrado',
 PROPERTY_ADDRESS:'Imóvel sem endereço',
 PROPERTY_SETTINGS:'Regras obrigatórias do imóvel incompletas',
 DRAFT_CONTRACTS:'Contratos em rascunho aguardam conferência e finalização'
 },
 en:{
 ACCOUNT_SETTINGS:'Landlord questionnaire has not been saved',
 LANDLORD_DETAILS:'Required landlord details are missing or invalid',
 PAYMENT_METHODS:'Accepted payment methods are not configured',
 PAYMENT_DETAILS:'Payment details are incomplete',
 JURISDICTION:'Contract jurisdiction is missing or invalid',
 TEMPLATE_NOT_PUBLISHED:'Contract wording has not been published',
 TEMPLATE_INVALID:'Published contract clauses are incomplete',
 NO_ACTIVE_PROPERTIES:'No active property has been added',
 PROPERTY_ADDRESS:'Property address is missing',
 PROPERTY_SETTINGS:'Required property contract rules are incomplete',
 DRAFT_CONTRACTS:'Draft contracts still need review and finalization'
 }
} as const;
function issueHref(issue:ContractReadinessIssue){
 return issue.code==='DRAFT_CONTRACTS'?'/contracts':issue.code==='PROPERTY_ADDRESS'||issue.code==='NO_ACTIVE_PROPERTIES'?'/properties':'/contracts/setup';
}
export function ContractReadinessBanner(){
 const {locale}=useLanguage();
 const pt=locale==='pt-BR';
 const [issues,setIssues]=useState<ContractReadinessIssue[]|null>(null);
 const [error,setError]=useState(false);
 useEffect(()=>{
  if(!contractFeatureEnabled)return;
  let active=true;
  readContractReadiness().then(result=>{
   if(active){setIssues(result.issues);setError(false);}
  }).catch(()=>{if(active)setError(true)});
  return()=>{active=false};
 },[]);
 if(!contractFeatureEnabled||(!error&&(!issues||issues.length===0)))return null;
 const issueLabel=(item:ContractReadinessIssue)=>{
  const title=issuesText[locale][item.code]??(pt?'Configuração pendente':'Setup required');
  const property=item.propertyName?' ('+item.propertyName+')':'';
  const fields=item.fields?.length?' — '+item.fields.map(f=>fieldLabels[f]?.[pt?'pt':'en']??f).join(', '):'';
  const count=item.count?' ('+item.count+')':'';
  return title+property+count+fields;
 };
 return <section role="alert" aria-label={pt?'Pendências do contrato':'Contract setup warnings'}
  className="mx-auto mb-5 w-full rounded-xl border border-red-300 bg-red-50 px-4 py-4 text-red-900 shadow-sm">
  <div className="flex items-start gap-3">
   <AlertTriangle size={21} className="mt-0.5 shrink-0 text-red-700"/>
   <div className="min-w-0 flex-1">
    <p className="text-base font-bold text-red-900">{error
     ?(pt?'Não foi possível verificar a configuração dos contratos.':'Could not verify contract configuration.')
     :(pt?'Atenção: há informações pendentes para os contratos.':'Attention: contract setup needs action.')}</p>
    {error?<p className="mt-2 text-sm">{pt
     ?'Atualize a página. Se o problema continuar, verifique o serviço de contratos.'
     :'Refresh the page. If this continues, check the contract service.'}</p>:<>
     <p className="mt-1 text-sm">{pt
      ?'Preencha os itens abaixo antes de gerar contratos completos.'
      :'Complete these items before generating complete contracts.'}</p>
     <ul className="mt-3 space-y-2 text-sm">
      {(issues??[]).map((issue,index)=><li key={issue.code+'-'+(issue.propertyId??index)}>
       <span>{issueLabel(issue)}</span>{' '}
       <Link to={issueHref(issue)} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-red-700">
        {pt?'Corrigir':'Fix'} <ArrowRight size={13}/>
       </Link>
      </li>)}
     </ul>
    </>}
   </div>
  </div>
 </section>;
}
