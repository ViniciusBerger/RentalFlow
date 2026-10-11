import { useState } from 'react';
import { BarChart3, CalendarRange } from 'lucide-react';
import { useLanguage } from '../../i18n/context';
import { formatBRL } from '../../i18n/messages';
import { brazilToday } from '../booking/service/booking-timeline';
import { buildRentalInsights, type MonthlyBalance } from './monthly-insights';

type Metric = 'bookingCount' | 'totalRevenue' | 'totalProfit';
export const MonthlyChart = ({rows, today = brazilToday()}:{rows:MonthlyBalance[],today?:string}) => {
  const {t,locale} = useLanguage();
  const [metric,setMetric] = useState<Metric>('bookingCount');
  const {months,strongest,weakest} = buildRentalInsights(rows,today);
  const max = Math.max(1,...months.map(m=>m[metric] ?? 0));
  const monthName = (m:number)=>new Intl.DateTimeFormat(locale,{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2020,m-1,1)));
  const metricValue = (value:number)=>metric === 'bookingCount' ? String(value) : formatBRL(value);
  const metricLabels:Record<Metric,string> = {bookingCount:t('rentalCount'),totalRevenue:t('revenueChart'),totalProfit:t('profitChart')};
  return <section className="rf-panel rf-trend-panel" aria-label={t('monthlyInsights')}>
    <div className="rf-panel-header rf-chart-header"><div><span className="rf-eyebrow">{t('financialSummary')}</span><h2><BarChart3 size={20}/>{t('monthlyInsights')}</h2><p className="rf-chart-hint">{t('monthlyInsightsDescription')}</p></div><CalendarRange size={22} className="rf-muted"/></div>
    <div className="rf-chart-toolbar" role="group" aria-label={t('monthlyInsights')}>
      {(['bookingCount','totalRevenue','totalProfit'] as const).map(key=><button type="button" key={key} className={`rf-chart-toggle${metric===key?' active':''}`} aria-pressed={metric===key} onClick={()=>setMetric(key)}>{metricLabels[key]}</button>)}
    </div>
    <div className="rf-chart-bars" role="img" aria-label={`${t('monthlyInsights')}: ${metricLabels[metric]}`}>
      {months.map(month=><div key={month.label} className={`rf-chart-month${month.isComplete?'':' rf-chart-unfinished'}`}>
        <span className="rf-chart-amount">{metricValue(month[metric]??0)}</span>
        <div className="rf-chart-track"><span className="rf-chart-bar" style={{height:`${Math.max(0,(month[metric]??0)/max)*100}%`}}/></div>
        <span className="rf-chart-month-name">{monthName(month.month)}</span>
      </div>)}
    </div>
    <div className="rf-chart-insights" aria-live="polite">
      {strongest&&weakest?<><p><strong>{t('strongestMonth')}:</strong> {monthName(strongest.month)} ({strongest.bookingCount})</p><p><strong>{t('slowestMonth')}:</strong> {monthName(weakest.month)} ({weakest.bookingCount})</p></>:<p>{t('noHistoryForInsights')}</p>}
    </div>
    <p className="rf-chart-footnote">{t('completedMonthsNote')} {t('bookedNightsNotPayments')}</p>
  </section>;
};
