const {test}=require('node:test');
const assert=require('node:assert/strict');
require('./register-typescript.cjs');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const {mount}=require('./test-dispatcher.cjs');
const {dateKey,brazilToday,splitBookings}=require('../src/features/booking/service/booking-timeline.ts');
const {buildRentalInsights}=require('../src/features/dashboard/monthly-insights.ts');
const {MonthlyChart}=require('../src/features/dashboard/monthly-chart.tsx');
const {niceTickStep,smoothLine,trendGeometry,TREND_PLOT}=require('../src/features/dashboard/trend-geometry.ts');
const {BookingGroups}=require('../src/components/booking-groups.tsx');
const {LanguageProvider}=require('../src/i18n/language.tsx');
const booking=(id,startDate,endDate,extra={})=>({id,startDate,endDate,clientFirstName:'Ana',clientLastName:'Silva',isActive:true,...extra});
const render=(Component,props,locale='pt-BR')=>renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(LanguageProvider,{initialLocale:locale},React.createElement(Component,props))));
const find=(node,fn)=>{if(!node||typeof node!=='object')return null;if(Array.isArray(node))return node.map(n=>find(n,fn)).find(Boolean)||null;if(fn(node))return node;return find(node.props?.children,fn)};

test('DATE values are kept in calendar-day order even with UTC timestamp input',()=>{
 assert.equal(dateKey('2026-10-11'),'2026-10-11');
 assert.equal(dateKey('2026-10-11T00:00:00Z'),'2026-10-11');
 assert.equal(dateKey('bad value'),'');
 assert.equal(dateKey(''),'');
});
test('Brazil today uses Sao Paulo date even when UTC is a different day',()=>{
 assert.equal(brazilToday(new Date('2026-10-12T01:30:00Z')),'2026-10-11');
 assert.equal(brazilToday(new Date('2026-10-12T03:00:00Z')),'2026-10-12');
});
test('booking history, currently occupied and incoming are mutually exclusive and ordered',()=>{
 const b=[booking('later','2026-10-20','2026-10-23'),booking('pastOld','2026-09-01','2026-09-05'),booking('today','2026-10-11','2026-10-14'),booking('current','2026-10-10','2026-10-18'),booking('soon','2026-10-12','2026-10-17'),booking('pastRecent','2026-10-09','2026-10-11')];
 const result=splitBookings(b,'2026-10-11');
 assert.deepEqual(result.upcoming.map(x=>x.id),['today','soon','later']);
 assert.deepEqual(result.current.map(x=>x.id),['current']);
 assert.deepEqual(result.past.map(x=>x.id),['pastRecent','pastOld']);
});
test('check-out today belongs to history, while arrivals today are upcoming',()=>{
 const x=splitBookings([booking('left','2026-10-01','2026-10-11'),booking('arrived','2026-10-11','2026-10-15')],'2026-10-11');
 assert.deepEqual(x.past.map(x=>x.id),['left']);
 assert.deepEqual(x.upcoming.map(x=>x.id),['arrived']);
});
test('upcoming tie breaks use departure; current stays sort by nearest departure',()=>{
 const x=splitBookings([booking('b','2026-11-01','2026-11-10'),booking('a','2026-11-01','2026-11-03'),booking('in-late','2026-10-01','2026-10-22'),booking('in-soon','2026-10-01','2026-10-14')],'2026-10-11');
 assert.deepEqual(x.upcoming.map(y=>y.id),['a','b']);
 assert.deepEqual(x.current.map(y=>y.id),['in-soon','in-late']);
});
test('inactive and invalid-date records do not pollute active timeline',()=>{
 const x=splitBookings([booking('cancelled','2026-11-01','2026-11-04',{isActive:false}),booking('broken','bad','2026-11-05'),booking('missing','2026-11-01','bad')],'2026-10-11');
 assert.deepEqual(x,{past:[],current:[],upcoming:[]});
});
test('empty bookings are represented honestly',()=>assert.deepEqual(splitBookings([],'2026-10-11'),{past:[],current:[],upcoming:[]}));
test('monthly insights fill all 12 months and keep backend booked values intact',()=>{
 const x=buildRentalInsights([{label:'2026-02',totalRevenue:900,totalProfit:670,bookingCount:5},{label:'2026-01',totalRevenue:300,totalProfit:200,bookingCount:1}],'2026-10-11');
 assert.equal(x.months.length,12);assert.equal(x.months[1].bookingCount,5);assert.equal(x.months[1].totalRevenue,900);assert.equal(x.months[1].totalProfit,670);
 assert.equal(x.months[5].bookingCount,0); assert.equal(x.months[11].isComplete,false);
 assert.equal(x.strongest.month,2);assert.equal(x.weakest.month,3);
});
test('future months and incomplete current month are never ranked as strong or weak',()=>{
 const x=buildRentalInsights([{label:'2026-09',bookingCount:2,totalRevenue:10,totalProfit:8},{label:'2026-10',bookingCount:90,totalRevenue:1000,totalProfit:900},{label:'2026-12',bookingCount:150,totalRevenue:2000,totalProfit:1900}],'2026-10-11');
 assert.equal(x.strongest.month,9);assert.equal(x.weakest.month,1);assert.equal(x.months[9].bookingCount,90);
});
test('ties choose chronological completed month; no history means no peak/slow assertion',()=>{
 const x=buildRentalInsights([{label:'2026-02',bookingCount:3,totalRevenue:6,totalProfit:3},{label:'2026-03',bookingCount:3,totalRevenue:7,totalProfit:4}],'2026-04-01');
 assert.equal(x.strongest.month,2);assert.equal(x.weakest.month,1);
 const zero=buildRentalInsights([],'2026-01-15');assert.equal(zero.strongest,null);assert.equal(zero.weakest,null);
});
test('invalid reference date is not misclassified as complete',()=>{
 const x=buildRentalInsights([],'invalid');assert.equal(x.strongest,null);assert.equal(x.months.filter(x=>x.isComplete).length,0);
});
test('chart renders 12 real months, peak and slow month and clear financial disclaimer in Portuguese',()=>{
 const html=render(MonthlyChart,{rows:[{label:'2026-02',bookingCount:4,totalRevenue:900,totalProfit:750}],today:'2026-10-11'});
 assert.match(html,/Tendência de receita/);assert.match(html,/Mês completo com mais reservas/);
 assert.match(html,/pagamentos recebidos/);assert.equal((html.match(/rf-trend-month/g)||[]).length,12);
 assert.match(html,/rf-trend-line/);assert.match(html,/rf-trend-area/);
 assert.match(html,/rf-trend-reservation-bars/);assert.match(html,/eixo direito/);
});
test('chart metric buttons switch between reservations, revenue and profit values',()=>{
 const ui=mount(MonthlyChart,{rows:[{label:'2026-02',bookingCount:2,totalRevenue:500,totalProfit:310}],today:'2026-10-11'});
 let buttons=[];const collect=x=>{if(!x||typeof x!=='object')return;if(Array.isArray(x))return x.forEach(collect);if(x.type==='button')buttons.push(x);collect(x.props?.children)};
 collect(ui.tree);assert.equal(buttons.length,3);assert.equal(buttons[0].props['aria-pressed'],true);
 buttons[1].props.onClick();ui.render();buttons=[];collect(ui.tree);assert.equal(buttons[1].props['aria-pressed'],true);
 buttons[2].props.onClick();ui.render();buttons=[];collect(ui.tree);assert.equal(buttons[2].props['aria-pressed'],true);
 assert.ok(!find(ui.tree,n=>n.props?.className==='rf-trend-reservation-bars'));
});
test('no historical data displays explicit empty insights in English',()=>{
 const html=render(MonthlyChart,{rows:[],today:'2026-01-03'},'en');assert.match(html,/Not enough completed-month booking history yet/);
});
test('booking page groups visually list all past, active and future bookings',()=>{
 const rentals=[booking('past','2026-10-01','2026-10-03'),booking('current','2026-10-09','2026-10-15'),booking('future','2026-10-12','2026-10-16')];
 const html=render(BookingGroups,{rentals,onOpenPopUp:()=>{},onSelectRental:()=>{},today:'2026-10-11'});
 assert.match(html,/Próximas reservas/);assert.match(html,/Estadias em andamento/);assert.match(html,/Reservas anteriores/);
 assert.equal((html.match(/rf-rental-row/g)||[]).length,3);
});
test('group callbacks deliver selected booking without changing it',()=>{
 const x=booking('a','2026-10-12','2026-10-15');let opened=false,selected;
 const node=mount(BookingGroups,{rentals:[x],today:'2026-10-11',onOpenPopUp:()=>opened=true,onSelectRental:(value)=>selected=value}).tree;
 const list=find(node,n=>n.type?.name==='NextRentals');assert.ok(list);assert.equal(list.props.rentals[0],x);
 list.props.onOpenPopUp();list.props.onSelectRental(x);assert.equal(opened,true);assert.equal(selected,x);
});

// Task 2b: revenue line chart regression tests. These assert the geometry and real callbacks,
// not just that the component contains SVG or CSS class names.
test('trend axis always has finite, rounded intervals including zero',()=>{
 assert.equal(niceTickStep(0),1); assert.equal(niceTickStep(Number.NaN),1);
 assert.equal(niceTickStep(4300),5000);assert.equal(niceTickStep(700),1000);
 const series=buildRentalInsights([{label:'2026-03',totalRevenue:26450,bookingCount:24,totalProfit:20000}],'2026-10-11').months;
 const g=trendGeometry(series,'totalRevenue');
 assert.equal(g.points.length,12);assert.equal(g.bars.length,12);
 assert.ok(g.ticks[0]===0 && g.ticks[g.ticks.length-1]>=26450);
 assert.ok(g.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 assert.ok(!g.line.includes('NaN')&&!g.area.includes('NaN'));
 assert.ok(g.area.endsWith(' Z'));assert.equal(g.bars[2].value,24);
 assert.ok(g.bars[2].height>g.bars[1].height);
 assert.equal(g.rightMax,48); // secondary count axis accommodates bars at half plot height
 assert.equal(g.points[0].x,TREND_PLOT.left);
 assert.equal(g.points[11].x,TREND_PLOT.right);
});
test('trend geometry stays within the plot bounds for positive/negative profit',()=>{
 const months=buildRentalInsights([{label:'2026-01',totalProfit:-100},{label:'2026-02',totalProfit:300}], '2026-10-11').months;
 const graph=trendGeometry(months,'totalProfit');
 assert.ok(graph.ticks[0]<=-100);
 assert.ok(graph.ticks.at(-1)>=300);
 assert.ok(graph.points.every(p=>p.y>=TREND_PLOT.top&&p.y<=TREND_PLOT.bottom));
 assert.ok(graph.zeroY>TREND_PLOT.top&&graph.zeroY<TREND_PLOT.bottom);
 assert.ok(graph.area.includes(String(graph.zeroY)));
});
test('empty, zero and bad numeric values never break revenue chart geometry',()=>{
 const zero=trendGeometry([], 'totalRevenue');
 assert.deepEqual(zero.points,[]);assert.equal(zero.line,'');assert.equal(zero.area,'');
 assert.equal(smoothLine([]),'');assert.match(smoothLine([{x:5,y:9}]),/^M 5 9$/);
 const months=buildRentalInsights([{label:'2026-02',totalRevenue:Number.NaN,bookingCount:0}], '2026-10-11').months;
 const chart=trendGeometry(months,'totalRevenue');
 assert.equal(chart.rightMax,1); assert.ok(chart.points.every(p=>p.value===0));
 assert.ok(chart.bars.every(b=>b.height===0));
 assert.ok(chart.ticks.length>=2);
});
test('dashboard chart shows reais line, an independent bookings axis and both Portuguese/English labels',()=>{
 const rows=[{label:'2026-08',bookingCount:24,totalRevenue:26450,totalProfit:18000}];
 const pt=render(MonthlyChart,{rows,today:'2026-10-11'});
 assert.match(pt,/Tendência de receita/);assert.match(pt,/Ano atual/);
 assert.match(pt,/Reservas \(eixo direito\)/);assert.match(pt,/R\$\s*0/);
 assert.ok(!pt.includes('R$ 124.560'));
 const en=render(MonthlyChart,{rows,today:'2026-10-11'},'en');
 assert.match(en,/Revenue trend/);assert.match(en,/right axis/);
});
test('month dots are keyboard-operable and show real revenue plus booking values',()=>{
 const ui=mount(MonthlyChart,{rows:[{label:'2026-08',bookingCount:24,totalRevenue:26450,totalProfit:18000}],today:'2026-10-11'});
 const locate=(node,pred,acc=[])=>{if(!node||typeof node!=='object')return acc;if(Array.isArray(node)){node.forEach(v=>locate(v,pred,acc));return acc;}if(pred(node))acc.push(node);locate(node.props?.children,pred,acc);return acc;};
 const dots=locate(ui.tree,n=>n.type==='circle'&&n.props?.role==='button');
 assert.equal(dots.length,12);assert.match(dots[7].props['aria-label'],/24/);
 dots[7].props.onFocus();ui.render();
 const tip=locate(ui.tree,n=>n.props?.className==='rf-trend-tooltip');assert.equal(tip.length,1);
 assert.match(JSON.stringify(tip[0]),/24/);
 assert.match(JSON.stringify(tip[0]),/26.450/);
 let prevented=false;dots[7].props.onKeyDown({key:' ',preventDefault:()=>prevented=true});assert.equal(prevented,true);
 dots[7].props.onKeyDown({key:'Escape',preventDefault:()=>{throw Error('Unexpected preventDefault')}});
 const chart=locate(ui.tree,n=>n.props?.className==='rf-trend-viewport')[0];chart.props.onMouseLeave();ui.render();
 assert.equal(locate(ui.tree,n=>n.props?.className==='rf-trend-tooltip').length,0);
});
test('single-month plot is centered; negative/missing booking counts never create negative bars',()=>{
 const rows=[{label:'2026-01',month:1,isComplete:true,totalRevenue:200,totalProfit:100,bookingCount:-7}];
 const plot=trendGeometry(rows,'totalRevenue');
 assert.equal(plot.points.length,1);
 assert.equal(plot.points[0].x,(TREND_PLOT.left+TREND_PLOT.right)/2);
 assert.equal(plot.bars[0].height,0);
 assert.ok(plot.line.startsWith('M '));
 assert.ok(plot.area.endsWith(' Z'));
 const unspecified=[{label:'2026-01',month:1,isComplete:true,totalRevenue:0,totalProfit:0}];
 const second=trendGeometry(unspecified,'bookingCount');
 assert.equal(second.points[0].value,0); assert.equal(second.points[0].bookingCount,0);
 assert.equal(second.bars[0].value,0);
});
test('profit/count toggles change primary line scale without inventing secondary bars',()=>{
 const ui=mount(MonthlyChart,{rows:[{label:'2026-08',bookingCount:24,totalRevenue:26450,totalProfit:-500}],today:'2026-10-11'});
 const locate=(node,pred,acc=[])=>{if(!node||typeof node!=='object')return acc;if(Array.isArray(node)){node.forEach(v=>locate(v,pred,acc));return acc;}if(pred(node))acc.push(node);locate(node.props?.children,pred,acc);return acc;};
 let buttons=locate(ui.tree,n=>n.type==='button'&&n.props?.['aria-pressed']!==undefined);
 buttons[1].props.onClick();ui.render();buttons=locate(ui.tree,n=>n.type==='button'&&n.props?.['aria-pressed']!==undefined);
 assert.equal(buttons[1].props['aria-pressed'],true);
 const plot=locate(ui.tree,n=>n.props?.className==='rf-trend-line')[0];assert.ok(plot.props.d.startsWith('M '));
 buttons[2].props.onClick();ui.render();
 assert.equal(locate(ui.tree,n=>n.props?.className==='rf-trend-reservation-bars').length,0);
 assert.match(locate(ui.tree,n=>n.type==='svg')[0].props['aria-label'],/Bookings/);
});
