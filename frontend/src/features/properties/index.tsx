import { useState } from 'react';
import { Plus, Pencil, Archive, Check } from 'lucide-react';
import { useLanguage } from '../../i18n/context';
import { PROPERTY_COLORS, PROPERTY_ICONS, createProperty, editProperty, archiveProperty, type Property } from './property-data';
import { useProperties } from './property-store';
import { PropertyIcon } from './property-icon';
const empty={name:'',address:'',color:'#0D8A57',icon:'building'};
type Form=typeof empty;
export const PropertiesPage=()=>{
 const {t}=useLanguage();const {properties,loading,error,refresh}=useProperties();
 const [editing,setEditing]=useState<string|null>(null),[form,setForm]=useState<Form>(empty);
 const [saving,setSaving]=useState(false),[message,setMessage]=useState('');
 const start=(property?:Property)=>{setEditing(property?.id??'new');setForm(property?{name:property.name,address:property.address??'',color:property.color,icon:property.icon}:empty);setMessage('');};
 const submit=async(event:React.FormEvent)=>{event.preventDefault();setSaving(true);setMessage('');try{
  if(editing==='new')await createProperty(form);else if(editing)await editProperty(editing,form);
  await refresh();setEditing(null);
 }catch(err){setMessage((err as Error).message||t('propertySaveFailed'));}finally{setSaving(false);}};
 const archive=async(property:Property)=>{if(!window.confirm(t('propertyArchiveConfirm')))return;setSaving(true);try{
  await archiveProperty(property.id);await refresh();setMessage(t('propertyArchived'));
 }catch(err){setMessage((err as Error).message||t('propertyHasBookings'));}finally{setSaving(false);}};
 return <div className="rf-properties-page">
  <div className="rf-properties-heading"><div><h2>{t('properties')}</h2><p>{t('propertiesHelp')}</p></div><button type="button" className="rf-button" onClick={()=>start()}><Plus size={18}/>{t('addProperty')}</button></div>
  {error&&<p role="alert">{error}</p>}{message&&<p role="status" className="rf-property-message">{message}</p>}
  {loading?<p>{t('loading')}</p>:<div className="rf-properties-grid">
   {properties.map(property=><article className={`rf-panel rf-property-card${!property.isActive?' archived':''}`} key={property.id}>
    <div className="rf-property-card-top"><PropertyIcon icon={property.icon} color={property.color} size={27}/><span className="rf-property-swatch" style={{backgroundColor:property.color}} title={property.color}/></div>
    <h3>{property.name}</h3><p>{property.address||'—'}</p>
    {property.isDefault&&<span className="rf-property-default"><Check size={13}/>{t('primaryProperty')}</span>}
    {!property.isActive&&<span className="rf-property-default">{t('propertyArchived')}</span>}
    <div className="rf-property-actions"><button type="button" className="rf-outline" onClick={()=>start(property)} disabled={!property.isActive}><Pencil size={16}/>{t('editProperty')}</button>
    {!property.isDefault&&property.isActive&&<button type="button" className="rf-outline" disabled={saving} onClick={()=>void archive(property)}><Archive size={16}/>{t('archiveProperty')}</button>}</div>
   </article>)}
  </div>}
  {editing!==null&&<div className="rf-property-modal" role="presentation"><div className="rf-panel rf-property-editor" role="dialog" aria-modal="true" aria-label={t(editing==='new'?'addProperty':'editProperty')}>
    <h3>{t(editing==='new'?'addProperty':'editProperty')}</h3>
    <form onSubmit={event=>void submit(event)}>
     <label>{t('propertyName')}<input required minLength={2} maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
     <label>{t('propertyAddress')}<input maxLength={300} value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
     <span className="rf-property-field-title">{t('propertyColor')}</span><div className="rf-color-palette">{PROPERTY_COLORS.map(color=><button type="button" key={color} aria-label={color} aria-pressed={form.color===color} className={form.color===color?'chosen':''} style={{backgroundColor:color}} onClick={()=>setForm({...form,color})}>{form.color===color&&<Check size={18}/>}</button>)}</div>
     <span className="rf-property-field-title">{t('propertyIcon')}</span><div className="rf-icon-palette">{PROPERTY_ICONS.map(icon=><button type="button" key={icon} aria-label={icon} aria-pressed={form.icon===icon} className={form.icon===icon?'chosen':''} onClick={()=>setForm({...form,icon})}><PropertyIcon icon={icon} color={form.color}/></button>)}</div>
     {message&&<p role="alert">{message}</p>}
     <div className="rf-property-actions"><button type="button" className="rf-outline" onClick={()=>setEditing(null)}>{t('cancel')}</button><button type="submit" className="rf-button" disabled={saving}>{saving?t('loading'):t('save')}</button></div>
    </form>
   </div></div>}
 </div>;
};
