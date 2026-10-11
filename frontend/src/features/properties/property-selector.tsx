import { useLanguage } from '../../i18n/context';
import { useProperties } from './property-store';
export const PropertySelector=({value,onChange,allowAll=true,required=false}:{value?:string;onChange?:(id:string)=>void;allowAll?:boolean;required?:boolean})=>{
 const {t}=useLanguage();const {properties,selectedId,select}=useProperties();
 const active=properties.filter(p=>p.isActive);
 const effective=value??selectedId;
 return <label className="rf-property-select">{t('property')}
   <select aria-label={t('property')} required={required} value={effective} onChange={e=>(onChange??select)(e.target.value)}>
   {allowAll&&<option value="all">{t('allProperties')}</option>}
   {!allowAll&&<option value="">{t('chooseProperty')}</option>}
   {active.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
   </select></label>;
};
