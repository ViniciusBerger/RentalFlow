import { useEffect, useState } from 'react';
import { loadProperties, type Property } from './property-data';
type Snapshot={properties:Property[];selectedId:string;loading:boolean;error:string|null};
let state:Snapshot={properties:[],selectedId:'all',loading:true,error:null};
let pending:Promise<void>|null=null;
let version=0;
const listeners=new Set<()=>void>();
function emit(next:Partial<Snapshot>){state={...state,...next};listeners.forEach(listener=>listener());}
function subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
const getSnapshot=()=>state;
export async function refreshProperties(){
  const current=version;
  if(pending)return pending;
  pending=(async()=>{try{
    const properties=await loadProperties();
    if(current!==version)return;
    emit({properties,selectedId:state.selectedId==='all'||properties.some(p=>p.id===state.selectedId&&p.isActive)?state.selectedId:'all',loading:false,error:null});
  }catch(error){if(current===version)emit({loading:false,error:(error as Error).message});throw error;}
  })().finally(()=>{if(current===version)pending=null;});return pending;
}
export function selectProperty(id:string){if(id==='all'||state.properties.some(p=>p.id===id&&p.isActive))emit({selectedId:id});}
export function resetProperties(){version++;pending=null;emit({properties:[],selectedId:'all',loading:true,error:null});}
export function useProperties(){
  const [snapshot,setSnapshot]=useState(getSnapshot);
  useEffect(()=>subscribe(()=>setSnapshot(getSnapshot())),[]);
  useEffect(()=>{if(snapshot.loading)void refreshProperties().catch(()=>{});},[snapshot.loading]);
  return {...snapshot,refresh:refreshProperties,select:selectProperty};
}
