import { ArrowUpRight, Banknote, CalendarRange, TrendingUp, Wallet } from "lucide-react";
import { useLanguage } from "../../../../../i18n/context";
import { formatBRL, formatBalancePeriod } from "../../../../../i18n/messages";
interface IncomeProps { props: {yearly?: {label:string,totalRevenue:number,totalProfit:number}|null;monthly?:{label:string,totalRevenue:number,totalProfit:number}|null} }

export const BalanceSection=({props}:IncomeProps)=>{const {t,locale}=useLanguage();return (<section className="rf-metrics" aria-label={t("financialSummary")}>
{[
{title:t("yearlyRevenue"),value:props.yearly?.totalRevenue,period:props.yearly?.label,icon:TrendingUp},
{title:t("yearlyProfit"),value:props.yearly?.totalProfit,period:props.yearly?.label,icon:Wallet},
{title:t("monthlyRevenue"),value:props.monthly?.totalRevenue,period:props.monthly?.label,icon:Banknote},
{title:t("monthlyProfit"),value:props.monthly?.totalProfit,period:props.monthly?.label,icon:CalendarRange}
].map(item=><article className="rf-metric rf-panel" key={item.title}><div className="rf-metric-top"><span className="rf-icon"><item.icon size={22}/></span><ArrowUpRight size={17} className="rf-muted"/></div><p className="rf-metric-label">{item.title}</p><strong className="rf-metric-value">{formatBRL(item.value)}</strong><span className="rf-metric-period">{formatBalancePeriod(item.period,locale)}</span></article>)}
</section>);};
