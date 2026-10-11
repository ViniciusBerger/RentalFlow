/** Minimal synchronous hook dispatcher used only for Node unit-level callback tests. */
const React=require('react');
const internals=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
function mount(Component,props={}){
 const slots=[];let index=0;let tree;
 const dispatcher={
  useContext(context){return context._currentValue},
  useRef(initial){const i=index++;if(!(i in slots))slots[i]={current:initial};return slots[i]},
  useState(initial){const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next}]},
  useEffect(fn,deps){const i=index++;const prev=slots[i];if(!prev||!deps||deps.some((d,k)=>!Object.is(d,prev[k]))){slots[i]=deps;fn()}},
 };
 const render=()=>{index=0;const original=internals.H;internals.H=dispatcher;try{tree=Component(props);return tree}finally{internals.H=original}};
 render();return {render,get tree(){return tree}};
}
module.exports={mount};
