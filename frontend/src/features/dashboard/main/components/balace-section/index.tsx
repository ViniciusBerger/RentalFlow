import { ArrowUpRight, Banknote, CalendarRange, TrendingUp, Wallet } from "lucide-react";
interface IncomeProps { props: {yearly?: {label:string,totalRevenue:number,totalProfit:number}|null;monthly?:{label:string,totalRevenue:number,totalProfit:number}|null} }
const format = (value:number|undefined) => (value??0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export const BalanceSection=({props}:IncomeProps)=>(<section className="rf-metrics" aria-label="Financial summary">
{[
{title:"Yearly revenue",value:props.yearly?.totalRevenue,period:props.yearly?.label,icon:TrendingUp},
{title:"Yearly profit",value:props.yearly?.totalProfit,period:props.yearly?.label,icon:Wallet},
{title:"Monthly revenue",value:props.monthly?.totalRevenue,period:props.monthly?.label,icon:Banknote},
{title:"Monthly profit",value:props.monthly?.totalProfit,period:props.monthly?.label,icon:CalendarRange}
].map(item=><article className="rf-metric rf-panel" key={item.title}><div className="rf-metric-top"><span className="rf-icon"><item.icon size={22}/></span><ArrowUpRight size={17} className="rf-muted"/></div><p className="rf-metric-label">{item.title}</p><strong className="rf-metric-value">{format(item.value)}</strong><span className="rf-metric-period">{item.period||"Current period"}</span></article>)}
</section>);
