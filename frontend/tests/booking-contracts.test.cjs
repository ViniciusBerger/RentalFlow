const {test}=require('node:test');
const assert=require('node:assert/strict');
require('./register-typescript.cjs');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {BookingContractFields}=require('../src/components/add-rental-popup/booking-contract-fields.tsx');
const {mount}=require('./test-dispatcher.cjs');

const defaultData={
 cpf:'',rg:'',address:'',phone:'',email:'',nationality:'BR',maritalStatus:'',
 feeMode:'AUTOMATIC',feeReason:'',feeAdjustment:'',paymentMethod:'PIX',
 paymentDueEvent:'KEY_HANDOVER'
};
const find=(node,fn)=>{
 if(!node||typeof node!=='object')return null;
 if(Array.isArray(node))return node.map(x=>find(x,fn)).find(Boolean)||null;
 if(fn(node))return node;
 return find(node.props?.children,fn);
};
const html=(data,locale='pt-BR')=>renderToStaticMarkup(React.createElement(
 BookingContractFields,{data,locale,onChange:()=>{}}
));
test('Portuguese automatic surcharge is provisional and keeps payment unconfirmed',()=>{
 const s=html(defaultData);
 assert.match(s,/Contrato vinculado à reserva/);
 assert.match(s,/taxa por hóspedes extras/);
 assert.match(s,/calculad[ao] pelo servidor/);
 assert.match(s,/rascunho/);
 assert.doesNotMatch(s,/name="feeAdjustment"/);
 assert.match(s,/PIX/);
});
test('English waiver reveals required reason but not adjustment amount',()=>{
 const s=html({...defaultData,feeMode:'WAIVED'},'en');
 assert.match(s,/Waive/);
 assert.match(s,/reason required/);
 assert.match(s,/name="feeReason"/);
 assert.match(s,/required/);
 assert.doesNotMatch(s,/name="feeAdjustment"/);
});
test('Adjustment requires amount and reason, and offers no payment confirmation',()=>{
 for(const locale of ['pt-BR','en']){
  const s=html({...defaultData,feeMode:'ADJUSTED',feeAdjustment:'30',feeReason:'Corrected'},locale);
  assert.match(s,/name="feeAdjustment"/);
  assert.match(s,/name="feeReason"/);
  assert.match(s,/step="0.01"/);
  assert.match(s,/30/);
  assert.doesNotMatch(s,/receivedCents/);
 }
});
test('Sensitive fields are not persisted by the component; inputs only delegate change events',()=>{
 const actions=[];
 const view=mount(BookingContractFields,{data:defaultData,locale:'en',onChange:e=>actions.push(e.target.name)});
 const cpf=find(view.tree,x=>x.type==='input'&&x.props.name==='cpf');
 assert.ok(cpf);assert.equal(cpf.props.autoComplete,'off');
 cpf.props.onChange({target:{name:'cpf',value:'test'}});assert.deepEqual(actions,['cpf']);
 const method=find(view.tree,x=>x.type==='select'&&x.props.name==='paymentMethod');
 assert.ok(method);method.props.onChange({target:{name:'paymentMethod',value:'PIX'}});
 assert.deepEqual(actions,['cpf','paymentMethod']);
});
