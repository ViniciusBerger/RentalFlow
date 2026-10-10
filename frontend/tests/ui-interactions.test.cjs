const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./register-typescript.cjs');
const React = require('react');
const { mount }=require('./test-dispatcher.cjs');
const AddRentalPopUp = require('../src/components/add-rental-popup/index.tsx').default;
const EditRentalPopUp = require('../src/components/edit-rental-popup/index.tsx').default;
const RentalDetailPopUp = require('../src/components/rental-detail-popup/index.tsx').default;
const { AuthForm } = require('../src/features/auth/components/auth-form/index.tsx');
const { NextRentals }=require('../src/components/next-rentals/index.tsx');
const { DesktopNavBar }=require('../src/components/nav-bar/desktop-navbar/index.tsx');
const { MobileNavBar }=require('../src/components/nav-bar/mobile-navbar/index.tsx');

// Minimal *unit-only* React dispatcher for exercising event callback logic.
// UI rendering/integration is separately tested through real React SSR tests.
function find(node,fn){
 if(!node||typeof node!=='object')return null;
 if(Array.isArray(node))return node.map(x=>find(x,fn)).find(Boolean)||null;
 if(fn(node))return node;
 return find(node.props?.children,fn);
}
const noop=()=>{};

test('auth form passes typed email/password to the handler instead of default empty state', async()=>{
 let received;const ui=mount(AuthForm,{onSubmit:async(...args)=>{received=args},error:null,isLoading:false});
 let inputs=[];
 function collect(node){if(!node||typeof node!=='object')return;if(Array.isArray(node))return node.forEach(collect);if(node.type?.name==='TextInputFormDiv')inputs.push(node);collect(node.props?.children)}
 collect(ui.tree);assert.equal(inputs.length,2);
 inputs[0].props.onChange({target:{value:'test@test.com'}});
 inputs[1].props.onChange({target:{value:'test123'}});
 ui.render();
 let prevented=false;const form=find(ui.tree,n=>n.type==='form');
 await form.props.onSubmit({preventDefault:()=>{prevented=true}});
 assert.deepEqual(received,['test@test.com','test123']);assert.equal(prevented,true);
});
test('booking creation form capitalizes names, converts BRL values and closes only after successful save',async()=>{
 const called=[];let saved;
 const props={isOpen:true,onSubmit:async data=>{saved=data;return false},onClose:()=>called.push('close'),isSaving:false,error:null};
 const ui=mount(AddRentalPopUp,props);
 const form=find(ui.tree,n=>n.type?.name==='AddRentalForm');
 assert.ok(form);
 for(const [name,value] of Object.entries({clientFirstName:'ana',clientLastName:'silva',revenue:'500.50',fee:'50',guests:'2',startDate:'2026-11-01',endDate:'2026-11-03'}))form.props.handleChange({target:{name,value}});
 ui.render();const form2=find(ui.tree,n=>n.type?.name==='AddRentalForm');
 assert.deepEqual(form2.props.formData,{clientFirstName:'Ana',clientLastName:'Silva',revenue:500.5,fee:50,guests:'2',startDate:'2026-11-01',endDate:'2026-11-03'});
 let prevented=false;await form2.props.handleSubmit({preventDefault:()=>prevented=true});
 assert.equal(prevented,true);assert.equal(saved.clientFirstName,'Ana');assert.deepEqual(called,[]);
 props.onSubmit=async()=>true;
 ui.render();const successForm=find(ui.tree,n=>n.type?.name==='AddRentalForm');
 await successForm.props.handleSubmit({preventDefault:noop});
 assert.deepEqual(called,['close']);
});
test('booking creation does not treat a rejected save as success',async()=>{
 let closed=false;
 const ui=mount(AddRentalPopUp,{isOpen:true,onSubmit:async()=>{throw new Error('Failed validation')},onClose:()=>closed=true,isSaving:false,error:null});
 const form=find(ui.tree,n=>n.type?.name==='AddRentalForm');
 await assert.rejects(form.props.handleSubmit({preventDefault:noop}),/Failed validation/);
 assert.equal(closed,false);
});
test('booking edit populates form from the selected booking and closes only after success',async()=>{
 const rental={clientFirstName:'Lia',clientLastName:'Costa',startDate:'2026-11-01',endDate:'2026-11-04',guests:2,revenue:400,fee:40,profit:360};
 let seen, closed=false;
 const props={isOpen:true,rental,onSubmit:async data=>{seen=data;return false},onClose:()=>closed=true,isSaving:false,error:null};
 const ui=mount(EditRentalPopUp,props);
 ui.render();
 let form=find(ui.tree,n=>n.type?.name==='AddRentalForm');
 assert.equal(form.props.formData.clientFirstName,'Lia');
 assert.equal(form.props.formData.profit,360);
 form.props.handleChange({target:{name:'revenue',value:'450.25'}});
 form.props.handleChange({target:{name:'clientLastName',value:'moura'}});
 ui.render();form=find(ui.tree,n=>n.type?.name==='AddRentalForm');
 assert.equal(form.props.formData.revenue,450.25);
 assert.equal(form.props.formData.clientLastName,'Moura');
 await form.props.handleSubmit({preventDefault:noop});assert.equal(seen.revenue,450.25);assert.equal(closed,false);
 props.onSubmit=async()=>true;
 ui.render();form=find(ui.tree,n=>n.type?.name==='AddRentalForm');
 await form.props.handleSubmit({preventDefault:noop});assert.equal(closed,true);
});
test('booking details require confirmation before destructive delete',async()=>{
 const rental={id:'r-12345678',clientFirstName:'Ana',clientLastName:'Silva',startDate:'2026-11-01',endDate:'2026-11-03',guests:2,revenue:100,profit:80,fee:20,isActive:true};
 const events=[];
 const ui=mount(RentalDetailPopUp,{isOpen:true,rental,onClose:()=>events.push('close'),onDelete:id=>{events.push(id);return true},onEditSubmit:async()=>true,isSavingEdit:false,editError:null});
 let trash=find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='');
 assert.ok(trash);trash.props.onClick();
 assert.deepEqual(events,[]);
 ui.render();
 const del=find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='Delete');
 assert.ok(del);await del.props.onClick();
 assert.deepEqual(events,['r-12345678','close']);
});
test('booking details cancel deletion and permit editing the selected record',()=>{
 const rental={id:'r-12345678',clientFirstName:'Ana',clientLastName:'Silva',startDate:'2026-11-01',endDate:'2026-11-03',guests:2,revenue:100,profit:80,fee:20,isActive:true};
 let removed=false;
 const ui=mount(RentalDetailPopUp,{isOpen:true,rental,onClose:noop,onDelete:()=>removed=true,onEditSubmit:async()=>true,isSavingEdit:false,editError:null});
 let trash=find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='');trash.props.onClick();ui.render();
 const cancel=find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='cancel');cancel.props.onClick();ui.render();
 assert.equal(find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='Delete'),null);
 assert.equal(removed,false);
 const edit=find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='Edit Booking');edit.props.onClick();ui.render();
 let modal=find(ui.tree,n=>n.type?.name==='EditRentalPopUp');assert.equal(modal.props.isOpen,true);assert.equal(modal.props.rental.id,'r-12345678');
 modal.props.onClose();ui.render();modal=find(ui.tree,n=>n.type?.name==='EditRentalPopUp');assert.equal(modal.props.isOpen,false);
});
test('upcoming rental row action forwards the clicked booking and opens its details',()=>{
 const data={id:'r1',clientFirstName:'Ana',clientLastName:'Silva',startDate:'2026-11-01',endDate:'2026-11-03',guests:2,isActive:true};
 let received,open=false;
 const tree=NextRentals({rentals:[data],onSelectRental:x=>received=x,onOpenPopUp:()=>open=true,headerContent:'Next'});
 const row=find(tree,n=>n.type==='button'&&n.props.className==='rf-rental-row');assert.ok(row);row.props.onClick();
 assert.equal(received,data);assert.equal(open,true);
});
test('navigation active-state styles and mobile create action are wired',()=>{
 const sidebar=DesktopNavBar();
 const mainNav=find(sidebar,n=>n.type==='nav');const links=mainNav.props.children;
 assert.match(links[0].props.className({isActive:true}),/active/);
 assert.doesNotMatch(links[0].props.className({isActive:false}),/active/);
 const events=[];const mobile=MobileNavBar({onCreateClick:()=>events.push('create')});
 const btn=find(mobile,n=>n.type==='button'&&n.props['aria-label']==='Create booking');btn.props.onClick();
 assert.deepEqual(events,['create']);
});
test('create booking form normalizes all monetary fields, handles blank prices and other input fields',()=>{
 const ui=mount(AddRentalPopUp,{isOpen:true,onSubmit:async()=>true,onClose:noop,isSaving:false,error:null});
 const form=find(ui.tree,n=>n.type?.name==='AddRentalForm');
 for(const [name,value] of [['profit','91.75'],['fee','invalid amount'],['revenue',''],['clientFirstName',''],['clientLastName','doe'],['startDate','2026-12-01']]){
   form.props.handleChange({target:{name,value}});
 }
 ui.render();
 const data=find(ui.tree,n=>n.type?.name==='AddRentalForm').props.formData;
 assert.equal(data.profit,91.75);
 assert.equal(data.fee,0);
 assert.equal(data.revenue,0);
 assert.equal(data.clientFirstName,'');
 assert.equal(data.clientLastName,'Doe');
 assert.equal(data.startDate,'2026-12-01');
});
test('edit booking form parses profit and handles blank names without inventing values',()=>{
 const ui=mount(EditRentalPopUp,{isOpen:true,rental:{clientFirstName:'Ana'},onSubmit:async()=>true,onClose:noop,isSaving:false,error:null});
 ui.render();
 const form=find(ui.tree,n=>n.type?.name==='AddRentalForm');
 form.props.handleChange({target:{name:'profit',value:'333.33'}});
 form.props.handleChange({target:{name:'clientFirstName',value:''}});
 form.props.handleChange({target:{name:'guests',value:'4'}});
 ui.render();
 const data=find(ui.tree,n=>n.type?.name==='AddRentalForm').props.formData;
 assert.equal(data.profit,333.33);assert.equal(data.clientFirstName,'');assert.equal(data.guests,'4');
});

test('failed deletion leaves the confirmation open with an actionable error message',async()=>{
 const rental={id:'r-1',clientFirstName:'Ana',clientLastName:'Silva',isActive:true};
 let closed=0;
 const ui=mount(RentalDetailPopUp,{isOpen:true,rental,onClose:()=>closed++,onDelete:async()=>false,onEditSubmit:async()=>true,isSavingEdit:false,editError:null});
 find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='').props.onClick();ui.render();
 const button=find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='Delete');
 await button.props.onClick();ui.render();
 assert.equal(closed,0);assert.ok(find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='Delete'));
 assert.ok(find(ui.tree,n=>n.type==='p'&&n.props.role==='alert'));
});
test('delete error from API does not close booking details',async()=>{
 const rental={id:'r-1',clientFirstName:'Ana',clientLastName:'Silva',isActive:true};
 let closed=0;
 const ui=mount(RentalDetailPopUp,{isOpen:true,rental,onClose:()=>closed++,onDelete:async()=>{throw Error('API offline')},onEditSubmit:async()=>true,isSavingEdit:false,editError:null});
 find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='').props.onClick();ui.render();
 await find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='Delete').props.onClick();ui.render();
 assert.equal(closed,0);assert.ok(find(ui.tree,n=>n.type==='p'&&n.props.role==='alert'));
});
test('deletion is not falsely confirmed when no delete callback was provided',async()=>{
 const rental={id:'r-1',clientFirstName:'Ana',clientLastName:'Silva',isActive:true};
 let closed=0;
 const ui=mount(RentalDetailPopUp,{isOpen:true,rental,onClose:()=>closed++,onEditSubmit:async()=>true,isSavingEdit:false,editError:null});
 find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='').props.onClick();ui.render();
 await find(ui.tree,n=>n.type?.name==='GenericButton'&&n.props.content==='Delete').props.onClick();ui.render();
 assert.equal(closed,0);assert.ok(find(ui.tree,n=>n.type==='p'&&n.props.role==='alert'));
});
