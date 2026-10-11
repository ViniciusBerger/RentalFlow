const {test, afterEach} = require('node:test');
const assert = require('node:assert/strict');
require('./register-typescript.cjs');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const {mount}=require('./test-dispatcher.cjs');
const {en,ptBR,translate,getWeekdays,formatBRL,formatBookingDate,formatBalancePeriod,localizeError}=require('../src/i18n/messages.ts');
const {initialLanguage,LanguageContext}=require('../src/i18n/context.ts');
const {LanguageProvider,LanguageSwitcher}=require('../src/i18n/language.tsx');
const {Header}=require('../src/features/dashboard/main/components/dashboard-header/index.tsx');
const {BalanceSection}=require('../src/features/dashboard/main/components/balace-section/index.tsx');
const {NextRentals}=require('../src/components/next-rentals/index.tsx');
const {CalendarHeader}=require('../src/features/booking/components/booking-calendar/calendar-header/index.tsx');
const {CalendarMain}=require('../src/features/booking/components/booking-calendar/calendar-main/index.tsx');
const {BookingHeader}=require('../src/features/booking/components/booking-header/index.tsx');
const {DesktopNavBar}=require('../src/components/nav-bar/desktop-navbar/index.tsx');
const {MobileNavBar}=require('../src/components/nav-bar/mobile-navbar/index.tsx');
const {AuthForm}=require('../src/features/auth/components/auth-form/index.tsx');
const {AddRentalForm}=require('../src/components/add-rental-popup/add-rental-form.tsx');
const AddRentalPopUp=require('../src/components/add-rental-popup/index.tsx').default;
const EditRentalPopUp=require('../src/components/edit-rental-popup/index.tsx').default;
const RentalDetailPopUp=require('../src/components/rental-detail-popup/index.tsx').default;
const {LoadingState}=require('../src/components/loading-state/index.tsx');
const {DashboardErrorState}=require('../src/components/error-state/index.tsx');
const h=React.createElement;const noop=()=>{};
const booking={id:'bk-12345678',clientFirstName:'Ana',clientLastName:'Silva',startDate:'2026-11-01',endDate:'2026-11-04',guests:2,fee:20,revenue:150,profit:130,isActive:true};
const ssr=(Component,props={},locale='pt-BR')=>renderToStaticMarkup(h(MemoryRouter,null,h(LanguageProvider,{initialLocale:locale},h(Component,props))));
const find=(node,fn)=>{if(!node||typeof node!=='object')return null;if(Array.isArray(node))return node.map(n=>find(n,fn)).find(Boolean)||null;if(fn(node))return node;return find(node.props?.children,fn)};
const originalWindow=global.window, originalDocument=global.document;
afterEach(()=>{global.window=originalWindow;global.document=originalDocument});

test('translation dictionaries have precisely matching user-facing keys and valid values',()=>{
 assert.deepEqual(Object.keys(en).sort(),Object.keys(ptBR).sort());
 for(const [key,value] of Object.entries(ptBR)){
   assert.ok(Array.isArray(value) ? value.length===7 && value.every(Boolean) : typeof value==='string'&&value.trim().length>0,key);
 }
});
test('translation resolves Brazilian Portuguese and English consistently',()=>{
 assert.equal(translate('pt-BR','newBooking'),'Nova reserva');
 assert.equal(translate('en','newBooking'),'New booking');
 assert.equal(translate('pt-BR','cancel'),'Cancelar');
 assert.equal(translate('en','cancel'),'Cancel');
});
test('weekdays follow Sunday-first calendar and translate all seven names',()=>{
 assert.deepEqual(getWeekdays('pt-BR').map(x=>x.short),['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']);
 assert.deepEqual(getWeekdays('en').map(x=>x.full),['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
});
test('BRL never becomes USD and handles missing values safely',()=>{
 assert.match(formatBRL(1050.99),/1\.050,99/); assert.match(formatBRL(null),/0,00/);
 assert.match(formatBRL(undefined),/0,00/); assert.match(formatBRL(-1.3),/1,30/);
});
test('booking dates use Brazilian ordering, retain calendar date across timezones, and support month title',()=>{
 assert.match(formatBookingDate('2026-11-02','pt-BR'),/02 de nov\. de 2026|02 nov\. 2026|02 de nov de 2026/);
 assert.match(formatBookingDate('2026-11-02T00:00:00Z','pt-BR'),/02/);
 assert.match(formatBookingDate(new Date(2026,10,1),'pt-BR',true),/novembro de 2026/);
 assert.match(formatBookingDate(new Date(2026,10,1),'en',true),/November 2026/);
 assert.match(formatBookingDate('2026-11-02','en'),/Nov/);
});
test('missing and invalid booking dates remain safe',()=>{
 assert.equal(formatBookingDate(null,'pt-BR'),'—'); assert.equal(formatBookingDate('','en'),'—');
 assert.equal(formatBookingDate('invalid','pt-BR'),'invalid');
});
test('development and API errors translate common invalid credentials and expired sessions',()=>{
 assert.match(localizeError('Invalid development credentials','pt-BR'),/E-mail ou senha/);
 assert.match(localizeError({message:'Unauthorized'},'pt-BR'),/E-mail ou senha/);
 assert.match(localizeError(new Error('Session expired'),'pt-BR'),/sessão expirou/);
});
test('booking conflicts, bad requests, and network problems use clear Portuguese messages',()=>{
 assert.match(localizeError('Date already booked.','pt-BR'),/Já existe uma reserva/);
 assert.match(localizeError('overlap with existing booking','pt-BR'),/Já existe uma reserva/);
 assert.match(localizeError('Required field','pt-BR'),/Confira/);
 assert.match(localizeError('Failed to fetch','pt-BR'),/conectar/);
});
test('save, update, delete, login, logout and profile errors are localized',()=>{
 for(const [input,expected] of [
  ['No changes to save','Nenhuma alteração'],['Failed to update rental','atualizar a reserva'],
  ['Unable to delete booking. Please try again.','excluir a reserva'],
  ['Login failed','entrar'],['Logout failed','sair'],['Failed to complete profile','cadastro']
 ])assert.match(localizeError(input,'pt-BR'),new RegExp(expected));
});
test('unknown backend errors remain understandable in Portuguese but preserve English diagnostics in English',()=>{
 assert.equal(localizeError('Database column missing','pt-BR'),ptBR.genericError);
 assert.equal(localizeError({message:'Arbitrary exception'},'pt-BR','connectionError'),ptBR.connectionError);
 assert.equal(localizeError('Arbitrary exception','en'),'Arbitrary exception');
 assert.equal(localizeError(null,'en','loginFailed'),en.loginFailed);
 assert.equal(localizeError(null,'pt-BR','profileFailed'),ptBR.profileFailed);
});
test('app defaults to pt-BR and remembers validated English selection',()=>{
 delete global.window;assert.equal(initialLanguage(),'pt-BR');
 global.window={localStorage:{getItem:()=> 'en'}};assert.equal(initialLanguage(),'en');
 global.window={localStorage:{getItem:()=> 'pt-BR'}};assert.equal(initialLanguage(),'pt-BR');
 global.window={localStorage:{getItem:()=> 'fr'}};assert.equal(initialLanguage(),'pt-BR');
 global.window={localStorage:{getItem:()=>{throw Error('blocked')}}};assert.equal(initialLanguage(),'pt-BR');
});
test('provider changes html lang and persists language selections when storage exists',()=>{
 const data=new Map();global.document={documentElement:{lang:'en'}};
 global.window={localStorage:{setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)}};
 const view=mount(LanguageProvider,{children:'child',initialLocale:'pt-BR'});
 assert.equal(global.document.documentElement.lang,'pt-BR');
 assert.equal(data.get('rentalflow-language'),'pt-BR');
 view.tree.props.value.setLocale('en');view.render();
 assert.equal(global.document.documentElement.lang,'en');
 assert.equal(data.get('rentalflow-language'),'en');
});
test('provider renders without storage/document and still has a usable locale',()=>{
 delete global.window;delete global.document;
 const view=mount(LanguageProvider,{children:'x'});
 assert.equal(view.tree.props.value.t('signIn'),'Entrar');
});
test('language switcher has both options and uses the selected locale',()=>{
 const original=LanguageContext._currentValue;let selected='';
 try {
  LanguageContext._currentValue={locale:'pt-BR',setLocale:next=>selected=next,t:key=>translate('pt-BR',key)};
  const view=mount(LanguageSwitcher);const dropdown=find(view.tree,x=>x.type==='select');
  assert.equal(dropdown.props.value,'pt-BR');
  assert.equal(dropdown.props['aria-label'],'Idioma');
  assert.equal(dropdown.props.children.length,2);
  dropdown.props.onChange({target:{value:'en'}});
  assert.equal(selected,'en');
 } finally {LanguageContext._currentValue=original;}
});
test('pt-BR dashboard shows financial values, human greeting and translated sections',()=>{
 assert.match(ssr(Header,{username:{firstName:'Ana'}}),/Bem-vinda de volta, Ana/);
 const html=ssr(BalanceSection,{props:{yearly:{label:'2026',totalRevenue:10000,totalProfit:8000},monthly:{label:'Novembro',totalRevenue:1000,totalProfit:700}}});
 assert.match(html,/Receita anual/);assert.match(html,/Lucro mensal/);assert.match(html,/10\.000,00/);assert.doesNotMatch(html,/Yearly revenue/);
});
test('pt-BR reservations show plural/singular guests and active/inactive states',()=>{
 const html=ssr(NextRentals,{rentals:[booking,{...booking,id:'2',isActive:false,guests:1}],onOpenPopUp:noop,onSelectRental:noop,headerContent:'Upcoming rentals'});
 assert.match(html,/Próximas reservas/);assert.match(html,/hóspedes/);assert.match(html,/hóspede</);
 assert.match(html,/Reservada/);assert.match(html,/Inativa/);assert.match(html,/Ver calendário/);
});
test('pt-BR calendar shows Portuguese month, weekdays and booking nights',()=>{
 const header=ssr(CalendarHeader,{viewDate:new Date(2026,10,1),handleNext:noop,handlePrev:noop});
 assert.match(header,/novembro de 2026/);assert.match(header,/Mês anterior/);
 const main=ssr(CalendarMain,{viewDate:new Date(2026,10,1),rentals:[booking]});
 assert.match(main,/Domingo/);assert.match(main,/Sábado/);
 assert.match(main,/Ana \/ 3 noites/);
});
test('pt-BR booking and navigation actions have accessible Portuguese labels',()=>{
 assert.match(ssr(BookingHeader,{onOpenCreateRentalPopUp:noop}),/Calendário de reservas/);
 assert.match(ssr(DesktopNavBar),/Navegação principal/);
 assert.match(ssr(MobileNavBar,{onCreateClick:noop}),/Nova reserva/);
 assert.match(ssr(MobileNavBar,{onCreateClick:noop}),/Navegação móvel/);
});
test('pt-BR login and create/edit booking forms translate all field labels and validation errors',()=>{
 const login=ssr(AuthForm,{onSubmit:async()=>{},isLoading:false,error:'Invalid development credentials'});
 assert.match(login,/E-mail/);assert.match(login,/Senha/);assert.match(login,/E-mail ou senha incorretos/);
 const form=ssr(AddRentalForm,{handleSubmit:noop,handleChange:noop,error:'Date already booked.',isSaving:false});
 for(const field of ['Nome','Sobrenome','Entrada','Saída','Receita total','Custos totais','Hóspedes'])assert.ok(form.includes(field),field);
 assert.match(form,/Já existe uma reserva/);
 assert.match(ssr(EditRentalPopUp,{isOpen:true,onClose:noop,onSubmit:noop,isSaving:false,error:null,rental:booking}),/Editar reserva/);
});
test('pt-BR booking details and destructive-action confirmation remain meaningful',()=>{
 const html=ssr(RentalDetailPopUp,{isOpen:true,rental:booking,onClose:noop,onDelete:noop,onEditSubmit:noop,isSavingEdit:false,editError:null});
 assert.match(html,/Estadia confirmada/);assert.match(html,/3 noites/);assert.match(html,/Editar reserva/);
 assert.match(ssr(AddRentalPopUp,{isOpen:true,onClose:noop,onSubmit:noop,isSaving:false,error:null}),/Criar uma reserva/);
});
test('pt-BR loading and errors never surface raw English technical messages',()=>{
 assert.match(ssr(LoadingState),/Carregando/);
 const html=ssr(DashboardErrorState,{message:'Internal postgresql query failed',onRetry:noop});
 assert.match(html,/Ocorreu um problema/);assert.match(html,/Tentar novamente/);
 assert.doesNotMatch(html,/Internal postgresql query failed/);
});
test('English selection still works for dates, dashboards and booking actions',()=>{
 const header=ssr(CalendarHeader,{viewDate:new Date(2026,10,1),handlePrev:noop,handleNext:noop},'en');
 assert.match(header,/November 2026/);assert.match(header,/Previous month/);
 assert.match(ssr(Header,{username:{firstName:'Ana'}},'en'),/Welcome back, Ana/);
 assert.match(ssr(BookingHeader,{onOpenCreateRentalPopUp:noop},'en'),/Booking calendar/);
});
test('provider stays usable if saving selected language is blocked by browser settings',()=>{
 global.document={documentElement:{lang:'en'}};
 global.window={localStorage:{setItem:()=>{throw new Error('storage disabled')},getItem:()=>null}};
 const view=mount(LanguageProvider,{children:'x',initialLocale:'en'});
 assert.equal(global.document.documentElement.lang,'en');
 view.tree.props.value.setLocale('pt-BR');view.render();
 assert.equal(global.document.documentElement.lang,'pt-BR');
 assert.equal(view.tree.props.value.t('signIn'),'Entrar');
});
test('isolated context provides safe English translations before the app provider mounts',()=>{
 assert.equal(LanguageContext._currentValue.locale,'en');
 assert.equal(LanguageContext._currentValue.t('cancel'),'Cancel');
 assert.doesNotThrow(()=>LanguageContext._currentValue.setLocale('pt-BR'));
});

test('month keys from the backend render as readable pt-BR finance periods',()=>{
 assert.match(formatBalancePeriod('2026-11','pt-BR'),/novembro de 2026/);
 assert.match(formatBalancePeriod('2026-11','en'),/November 2026/);
 assert.equal(formatBalancePeriod('2026','pt-BR'),'2026');
 assert.equal(formatBalancePeriod('2026-13','pt-BR'),'2026-13');
 assert.equal(formatBalancePeriod(null,'pt-BR'),'Período atual');
 assert.equal(formatBalancePeriod('','en'),'Current period');
});

test('Portuguese sign-in and onboarding pages include the visible language selector',()=>{
 const {AuthPage}=require('../src/features/auth/index.tsx');
 const CompleteProfilePage=require('../src/features/complete-profile/index.tsx').default;
 const auth=ssr(AuthPage,{},'pt-BR');
 assert.match(auth,/Bem-vinda de volta/);assert.match(auth,/Idioma/);
 assert.match(auth,/Entrar/);assert.doesNotMatch(auth,/Welcome back/);
 const onboarding=ssr(CompleteProfilePage,{},'pt-BR');
 assert.match(onboarding,/Complete seu cadastro/);
 assert.match(onboarding,/Nome/);assert.match(onboarding,/Sobrenome/);
 assert.match(onboarding,/Continuar/);
 assert.match(onboarding,/Português \(Brasil\)/);
});
