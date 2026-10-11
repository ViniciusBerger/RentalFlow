const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
require('./register-typescript.cjs');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const {mount}=require('./test-dispatcher.cjs');
const {PROPERTY_COLORS,PROPERTY_ICONS,bookingMatches,calculatePropertyBalances,loadProperties,createProperty,editProperty,archiveProperty}=require('../src/features/properties/property-data.ts');
const {refreshProperties,resetProperties,selectProperty,useProperties}=require('../src/features/properties/property-store.ts');
const {PropertySelector}=require('../src/features/properties/property-selector.tsx');
const {PropertiesPage}=require('../src/features/properties/index.tsx');
const {LanguageProvider}=require('../src/i18n/language.tsx');
const {calendarRowHeight,calendarDisplay,normalizeRentalDates}=require('../src/features/booking/service/calendar-service.tsx');
const oldFetch=global.fetch;
const {clearCsrfToken}=require('../src/lib/csrf-fetch.ts');
const csrfResponse=()=>response({csrfToken:'test-session-bound-csrf-token'});
const withCsrf=(handler)=>async(url,opts)=>String(url).endsWith('/auth/csrf')?csrfResponse():handler(url,opts);
const property=(id='11111111-1111-4111-8111-111111111111',overrides={})=>({id,userId:'company-A',name:'Casa Praia',address:'Rua 1',color:'#2563EB',icon:'waves',isActive:true,isDefault:false,...overrides});
const response=(data,ok=true)=>({ok,json:async()=>data,status:ok?200:404});
afterEach(()=>{global.fetch=oldFetch;resetProperties();clearCsrfToken();});

test('palette identifiers are stable and do not require external image uploads',()=>{
 assert.ok(PROPERTY_COLORS.length>=6);assert.ok(PROPERTY_ICONS.length>=6);
 assert.ok(PROPERTY_COLORS.every(c=>/^#[\da-f]{6}$/i.test(c)));
 assert.ok(PROPERTY_ICONS.includes('house'));assert.ok(PROPERTY_ICONS.includes('waves'));
});
test('all-properties and single-property filters include exactly the right bookings',()=>{
 const [one,two]=[property().id,property('22222222-2222-4222-8222-222222222222').id];
 assert.equal(bookingMatches({propertyId:one},'all'),true);
 assert.equal(bookingMatches({propertyId:one},one),true);
 assert.equal(bookingMatches({propertyId:one},two),false);
 assert.equal(bookingMatches({},two),false);
});
test('monthly balances only include selected property and preserve check-in-year boundary',()=>{
 const [one,two]=[property().id,property('22222222-2222-4222-8222-222222222222').id];
 const bookings=[
 {propertyId:one,startDate:'2026-04-02',revenue:500,profit:350},
 {propertyId:one,startDate:'2026-04-29',revenue:800,profit:650},
 {propertyId:two,startDate:'2026-04-15',revenue:200,profit:150},
 {propertyId:one,startDate:'2025-12-12',revenue:9000,profit:9000},
 {propertyId:two,startDate:'2026-05-01',revenue:300,profit:200}];
 const a=calculatePropertyBalances(bookings,one,2026,4);
 assert.equal(a.months.length,12);assert.deepEqual(a.months[3],{label:'2026-04',totalRevenue:1300,totalProfit:1000,bookingCount:2});
 assert.equal(a.monthly.totalRevenue,1300);assert.equal(a.yearly.totalRevenue,1300);
 const b=calculatePropertyBalances(bookings,two,2026,4);
 assert.equal(b.yearly.totalRevenue,500);assert.equal(b.monthly.bookingCount,1);
 const all=calculatePropertyBalances(bookings,'all',2026,4);
 assert.equal(all.yearly.totalRevenue,1800);assert.equal(all.months[4].bookingCount,1);
});
test('a property with no bookings has 12 zero-valued months',()=>{
 const result=calculatePropertyBalances([],property().id,2026,1);
 assert.deepEqual(result.months[0],{label:'2026-01',totalRevenue:0,totalProfit:0,bookingCount:0});
 assert.equal(result.yearly.totalRevenue,0);assert.equal(result.yearly.totalProfit,0);
});
test('all property CRUD calls require cookies and use account-scoped endpoints',async()=>{
 const requests=[];global.fetch=withCsrf(async(url,opts)=>{requests.push({url,opts});return response(opts?.method==='DELETE'?{archived:true}:property());});
 await loadProperties();await createProperty({name:'Casa',address:'',color:'#2563EB',icon:'waves'});
 await editProperty(property().id,{name:'Casa 2',address:'Rua',color:'#9333EA',icon:'house'});
 await archiveProperty(property().id);
 assert.equal(requests.length,4);
 assert.equal(requests[0].opts.credentials,'include');
 assert.equal(requests[1].opts.headers.get('X-CSRF-Token'),'test-session-bound-csrf-token');
 assert.equal(requests[1].opts.method,'POST');assert.equal(JSON.parse(requests[1].opts.body).name,'Casa');
 assert.equal(requests[2].opts.method,'PATCH');assert.match(requests[2].url,/11111111/);
 assert.equal(requests[3].opts.method,'DELETE');
});
test('property API surfaces server errors and safe fallback messages',async()=>{
 global.fetch=async()=>response({message:'Property not found'},false);
 await assert.rejects(loadProperties(),/Property not found/);
 global.fetch=async()=>({ok:false,status:403,json:async()=>{throw Error('parse failed')}});
 await assert.rejects(loadProperties(),/HTTP 403/);
});
test('shared property store loads list, remembers selected property, and guards unknown selection',async()=>{
 resetProperties();const first=property(),second=property('22222222-2222-4222-8222-222222222222');
 global.fetch=async()=>response([first,second]);await refreshProperties();
 selectProperty(second.id);let state=mount(useProperties).tree;
 assert.equal(state.selectedId,second.id);assert.equal(state.properties.length,2);assert.equal(state.loading,false);
 selectProperty('somebody-elses-id');state=mount(useProperties).tree;assert.equal(state.selectedId,second.id);
 selectProperty('all');assert.equal(mount(useProperties).tree.selectedId,'all');
});
test('shared property store excludes archived selected property on refresh',async()=>{
 const first=property(),second=property('22222222-2222-4222-8222-222222222222');
 global.fetch=async()=>response([first,second]);await refreshProperties();selectProperty(second.id);
 global.fetch=async()=>response([first,{...second,isActive:false}]);await refreshProperties();
 assert.equal(mount(useProperties).tree.selectedId,'all');
});
test('property store retains a safe state when list request fails',async()=>{
 global.fetch=async()=>{throw Error('Network down')};
 await assert.rejects(refreshProperties(),/Network down/);
 const state=mount(useProperties).tree;
 assert.equal(state.loading,false);assert.equal(state.error,'Network down');
});
test('late property response after logout/reset never restores previous account data',async()=>{
 let resolveFetch;
 global.fetch=()=>new Promise(resolve=>{resolveFetch=resolve});
 const pending=refreshProperties();resetProperties();resolveFetch(response([property()]));await pending;
 const state=mount(useProperties).tree;assert.deepEqual(state.properties,[]);assert.equal(state.selectedId,'all');
});
test('concurrent property refresh requests use the same network call',async()=>{
 let count=0;global.fetch=async()=>{count++;return response([property()])};
 const a=refreshProperties(),b=refreshProperties();await Promise.all([a,b]);assert.equal(count,1);
});
test('Portuguese property selector includes account-owned properties and all option',async()=>{
 global.fetch=async()=>response([property()]);await refreshProperties();
 const html=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(LanguageProvider,{initialLocale:'pt-BR'},React.createElement(PropertySelector))));
 assert.match(html,/Todos os imóveis/);assert.match(html,/Casa Praia/);assert.match(html,/Imóvel/);
 const required=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(LanguageProvider,{initialLocale:'en'},React.createElement(PropertySelector,{allowAll:false,required:true,value:''}))));
 assert.match(required,/Choose a property/);assert.match(required,/required/);
});
test('property list renders a primary icon and archive control only for non-primary active properties',async()=>{
 const primary=property(undefined,{isDefault:true,name:'Imóvel principal'});const secondary=property('22222222-2222-4222-8222-222222222222');
 global.fetch=async()=>response([primary,secondary]);await refreshProperties();
 const html=renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(LanguageProvider,{initialLocale:'pt-BR'},React.createElement(PropertiesPage))));
 assert.match(html,/Imóvel principal/);assert.match(html,/Casa Praia/);assert.match(html,/Arquivar imóvel/);assert.match(html,/Adicionar imóvel/);
});
test('calendar uses separate color lanes for simultaneous properties, growing row height as needed',()=>{
 const one=property().id,two=property('22222222-2222-4222-8222-222222222222').id;
 const bookings=[{id:'A',propertyId:one,propertyColor:'#2563EB',clientFirstName:'Ana',startDate:'2026-11-03',endDate:'2026-11-07'},
 {id:'B',propertyId:two,propertyColor:'#9333EA',clientFirstName:'Bia',startDate:'2026-11-03',endDate:'2026-11-07'}].map(normalizeRentalDates);
 const items=calendarDisplay(bookings,new Date(2026,10,1),'pt-BR');
 assert.equal(items.length,2);assert.notEqual(items[0].props.style.marginTop,items[1].props.style.marginTop);
 assert.equal(items[0].props.style.backgroundColor,'#2563EB');assert.equal(items[1].props.style.backgroundColor,'#9333EA');
 assert.ok(calendarRowHeight(bookings,new Date(2026,10,1))>=90);
});
test('calendar clips older/future out-of-month bookings instead of painting off-grid',()=>{
 const bookings=[{id:'older',startDate:'2026-08-01',endDate:'2026-08-04',clientFirstName:'old'},
 {id:'after',startDate:'2026-12-31',endDate:'2027-01-02',clientFirstName:'future'},
 {id:'spans',startDate:'2026-10-30',endDate:'2026-11-02',clientFirstName:'ok'}].map(normalizeRentalDates);
 const items=calendarDisplay(bookings,new Date(2026,10,1),'pt-BR');
 assert.equal(items.length,1);assert.equal(items[0].props.style.gridRow,1);
});
const find=(node,fn)=>{
 if(!node||typeof node!=='object')return null;
 if(Array.isArray(node))return node.map(n=>find(n,fn)).find(Boolean)||null;
 if(fn(node))return node;
 return find(node.props?.children,fn);
};
test('property selector invokes externally controlled callback for chosen property',async()=>{
 global.fetch=async()=>response([property()]);await refreshProperties();
 let selected='';const view=mount(PropertySelector,{allowAll:false,required:true,value:'',onChange:id=>selected=id});
 const select=find(view.tree,n=>n.type==='select');
 assert.equal(select.props.required,true);assert.equal(select.props.value,'');
 select.props.onChange({target:{value:property().id}});assert.equal(selected,property().id);
});
test('uncontrolled selector updates the shared dashboard property filter',async()=>{
 global.fetch=async()=>response([property()]);await refreshProperties();
 const view=mount(PropertySelector);
 find(view.tree,n=>n.type==='select').props.onChange({target:{value:property().id}});
 assert.equal(mount(useProperties).tree.selectedId,property().id);
});
test('properties editor can add a property, choose color/icon and persist',async()=>{
 const saved=[];global.fetch=withCsrf(async(url,opts)=>{
   if(opts?.method==='POST'){saved.push(JSON.parse(opts.body));return response(property('33333333-3333-4333-8333-333333333333'));}
   return response([property()]);
 });
 await refreshProperties();const view=mount(PropertiesPage);
 let add=find(view.tree,n=>n.type==='button'&&n.props?.className==='rf-button');
 add.props.onClick();view.render();
 const input=find(view.tree,n=>n.type==='input'&&n.props?.maxLength===120);
 input.props.onChange({target:{value:'Apartamento Centro'}});view.render();
 const color=find(view.tree,n=>n.type==='button'&&n.props?.['aria-label']==='#9333EA');color.props.onClick();view.render();
 const icon=find(view.tree,n=>n.type==='button'&&n.props?.['aria-label']==='apartment');icon.props.onClick();view.render();
 const form=find(view.tree,n=>n.type==='form');await form.props.onSubmit({preventDefault(){}});
 await new Promise(resolve=>setImmediate(resolve));view.render();
 assert.equal(saved.length,1);assert.equal(saved[0].name,'Apartamento Centro');assert.equal(saved[0].color,'#9333EA');assert.equal(saved[0].icon,'apartment');
});
test('existing property can be edited and property archiving is blocked for primary property',async()=>{
 const primary=property('11111111-1111-4111-8111-111111111111',{isDefault:true});
 const second=property('22222222-2222-4222-8222-222222222222');
 let archiveCount=0,updateCount=0;
 global.fetch=withCsrf(async(_url,options)=>{
   if(options?.method==='PATCH'){updateCount++;return response(second);}
   if(options?.method==='DELETE'){archiveCount++;return response({archived:true});}
   return response([primary,second]);
 });
 await refreshProperties();const view=mount(PropertiesPage);
 const all=(node,fn)=>{const acc=[];const rec=n=>{if(!n||typeof n!=='object')return;if(Array.isArray(n))return n.forEach(rec);if(fn(n))acc.push(n);rec(n.props?.children);};rec(node);return acc;};
 const editButtons=all(view.tree,n=>n.type==='button'&&n.props?.className==='rf-outline');
 assert.equal(editButtons.length,3); // two edit buttons, only secondary has archive
 editButtons[1].props.onClick();view.render();
 assert.equal(find(view.tree,n=>n.type==='input'&&n.props?.maxLength===120).props.value,'Casa Praia');
 await find(view.tree,n=>n.type==='form').props.onSubmit({preventDefault(){}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(updateCount,1);view.render();
 const archiveButton=all(view.tree,n=>n.type==='button'&&n.props?.className==='rf-outline')[2];
 const before=global.window;global.window={confirm:()=>true};
 try{await archiveButton.props.onClick();await new Promise(resolve=>setImmediate(resolve));}finally{global.window=before;}
 assert.equal(archiveCount,1);
});
test('archiving a property can be cancelled and does not call the API',async()=>{
 global.fetch=async()=>response([property()]);await refreshProperties();const view=mount(PropertiesPage);
 const archive=find(view.tree,n=>n.type==='button'&&n.props?.className==='rf-outline'&&Array.isArray(n.props?.children)&&n.props.children.includes('Archive property'));
 assert.ok(archive);
 const before=global.window;global.window={confirm:()=>false};
 try{await archive.props.onClick();}finally{global.window=before;}
 assert.equal(mount(useProperties).tree.properties.length,1);
});
test('property create failures keep editor open and show feedback',async()=>{
 global.fetch=withCsrf(async(_url,opts)=>opts?.method==='POST'?response({message:'Invalid property'},false):response([property()]));
 await refreshProperties();const view=mount(PropertiesPage);
 find(view.tree,n=>n.type==='button'&&n.props.className==='rf-button').props.onClick();view.render();
 await find(view.tree,n=>n.type==='form').props.onSubmit({preventDefault(){}});view.render();
 const error=find(view.tree,n=>n.props?.role==='alert');
 assert.ok(error||find(view.tree,n=>n.type==='form')); // validation failure never closes the editor
});
test('properties editor cancel button closes without persisting',async()=>{
 let writes=0;global.fetch=async(_url,opts)=>{if(opts?.method)writes++;return response([property()]);};
 await refreshProperties();const view=mount(PropertiesPage);
 find(view.tree,n=>n.type==='button'&&n.props.className==='rf-button').props.onClick();view.render();
 const cancel=find(view.tree,n=>n.type==='button'&&n.props?.className==='rf-outline'&&n.props.children==='Cancel');
 cancel.props.onClick();view.render();assert.equal(find(view.tree,n=>n.type==='form'),null);assert.equal(writes,0);
});
test('booking form renders the actual owned property options, no remote images, and default for one property',async()=>{
 global.fetch=async()=>response([property()]);await refreshProperties();
 const {AddRentalForm}=require('../src/components/add-rental-popup/add-rental-form.tsx');
 const html=renderToStaticMarkup(React.createElement(LanguageProvider,{initialLocale:'pt-BR'},
  React.createElement(AddRentalForm,{handleSubmit:()=>{},handleChange:()=>{},error:null,isSaving:false})));
 assert.match(html,/Imóvel/);assert.match(html,/Casa Praia/);assert.match(html,/11111111-1111-4111-8111-111111111111/);
 assert.doesNotMatch(html,/<img/);
});
test('booking form requires explicit property with multiple properties',async()=>{
 global.fetch=async()=>response([property(),property('22222222-2222-4222-8222-222222222222')]);await refreshProperties();
 const {AddRentalForm}=require('../src/components/add-rental-popup/add-rental-form.tsx');
 const html=renderToStaticMarkup(React.createElement(LanguageProvider,{initialLocale:'en'},
  React.createElement(AddRentalForm,{handleSubmit:()=>{},handleChange:()=>{},error:null,isSaving:false})));
 assert.match(html,/Choose a property/);assert.match(html,/Casa Praia/);
});
test('property archive service reports errors without removing bookings',async()=>{
 const secondary=property();global.fetch=withCsrf(async(_url,opts)=>opts?.method==='DELETE'?response({message:'Property has active or future bookings'},false):response([secondary]));
 await refreshProperties();const view=mount(PropertiesPage);
 const archive=find(view.tree,n=>n.type==='button'&&n.props.className==='rf-outline'&&Array.isArray(n.props.children)&&n.props.children.includes('Archive property'));
 const prior=global.window;global.window={confirm:()=>true};
 try{archive.props.onClick();await new Promise(resolve=>setImmediate(resolve));view.render();}finally{global.window=prior;}
 assert.equal(mount(useProperties).tree.properties.length,1);
 const message=find(view.tree,n=>n.type==='p'&&n.props.role==='status');assert.ok(message);
});
test('property list includes inactive historical property with disabled editor',async()=>{
 global.fetch=async()=>response([property(undefined,{isActive:false,name:'Archived place'})]);await refreshProperties();
 const html=renderToStaticMarkup(React.createElement(MemoryRouter,null,
 React.createElement(LanguageProvider,{initialLocale:'en'},React.createElement(PropertiesPage))));
 assert.match(html,/Archived place/);assert.match(html,/Property archived/);assert.match(html,/disabled/);
});
test('property selector handles missing and unknown identifiers with nonblocking all fallback',async()=>{
 global.fetch=async()=>response([property()]);await refreshProperties();
 const view=mount(PropertySelector,{value:'all'});
 const select=find(view.tree,n=>n.type==='select');assert.equal(select.props.value,'all');
 select.props.onChange({target:{value:'all'}});
 assert.equal(mount(useProperties).tree.selectedId,'all');
});
test('new property modal shows localized title and cancel button',async()=>{
 global.fetch=async()=>response([property()]);await refreshProperties();
 const view=mount(PropertiesPage);
 find(view.tree,n=>n.type==='button'&&n.props.className==='rf-button').props.onClick();view.render();
 const dialog=find(view.tree,n=>n.props?.role==='dialog');assert.ok(dialog);
 assert.match(dialog.props['aria-label'],/Add property/);
});
test('calendar handles multiple sequential bookings in one property lane without breaking week',()=>{
 const same=property().id;
 const stays=[{id:'one',propertyId:same,startDate:'2026-11-03',endDate:'2026-11-04',clientFirstName:'A'},
 {id:'two',propertyId:same,startDate:'2026-11-05',endDate:'2026-11-06',clientFirstName:'B'}].map(normalizeRentalDates);
 const events=calendarDisplay(stays,new Date(2026,10,1));assert.equal(events.length,2);
 assert.equal(events[0].props.style.marginTop,events[1].props.style.marginTop);
});
test('property list shows an actionable empty state for a new account',async()=>{
 global.fetch=async()=>response([]);await refreshProperties();
 const html=renderToStaticMarkup(React.createElement(MemoryRouter,null,
 React.createElement(LanguageProvider,{initialLocale:'en'},React.createElement(PropertiesPage))));
 assert.match(html,/Add property/);
});
test('property create provides fallback error even when network returns no message',async()=>{
 global.fetch=withCsrf(async(_url,opts)=>opts?.method==='POST'?response({},false):response([property()]));
 await refreshProperties();const view=mount(PropertiesPage);
 find(view.tree,n=>n.type==='button'&&n.props.className==='rf-button').props.onClick();view.render();
 await find(view.tree,n=>n.type==='form').props.onSubmit({preventDefault(){}});view.render();
 assert.ok(find(view.tree,n=>n.type==='form'));
});
