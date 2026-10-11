import { useState } from 'react';
import { Activity, CalendarRange } from 'lucide-react';
import { useLanguage } from '../../i18n/context';
import { formatBRL, formatBalancePeriod } from '../../i18n/messages';
import { brazilToday } from '../booking/service/booking-timeline';
import { buildRentalInsights, type MonthlyBalance } from './monthly-insights';
import { TREND_PLOT, trendGeometry, type TrendMetric } from './trend-geometry';

const metricKeys = ['totalRevenue', 'totalProfit', 'bookingCount'] as const;

/** Revenue is a smooth line/area; bookings are faint bars with an independent right-hand scale. */
export const MonthlyChart = ({rows, today = brazilToday()}:{rows:MonthlyBalance[],today?:string}) => {
  const {t,locale} = useLanguage();
  const [metric,setMetric] = useState<TrendMetric>('totalRevenue');
  const [activeMonth,setActiveMonth] = useState<number|null>(null);
  const {months,strongest,weakest} = buildRentalInsights(rows,today);
  const geometry = trendGeometry(months,metric);
  const {left,right,top,bottom,width,height}=TREND_PLOT;
  const monthName = (month:number)=>new Intl.DateTimeFormat(locale,{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2020,month-1,1)));
  const metricLabels:Record<TrendMetric,string> = {bookingCount:t('rentalCount'),totalRevenue:t('revenueChart'),totalProfit:t('profitChart')};
  const showBookings = metric !== 'bookingCount';
  const selected = activeMonth===null?null:months[activeMonth];
  const formatValue=(amount:number)=>metric==='bookingCount'?String(amount):formatBRL(amount);
  const axisLabel=(amount:number)=>metric==='bookingCount'?String(amount): Math.abs(amount)<1000 ? formatBRL(amount) :
    locale==='pt-BR' ? `R$ ${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(amount/1000)} mil` :
      `R$ ${new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(amount/1000)}k`;

  return <section className="rf-panel rf-trend-panel" aria-label={t('monthlyInsights')}>
    <header className="rf-panel-header rf-chart-header">
      <div><span className="rf-eyebrow">{t('financialSummary')}</span>
        <h2><Activity size={20}/>{t('revenueTrendTitle')}</h2>
        <p className="rf-chart-hint">{t('revenueTrendDescription')}</p>
      </div>
      <span className="rf-chart-period"><CalendarRange size={16}/>{t('currentYearLabel')} · {months[0]?.label.slice(0,4)}</span>
    </header>
    <div className="rf-chart-toolbar" role="group" aria-label={t('monthlyInsights')}>
      {metricKeys.map(key=><button type="button" key={key}
        className={`rf-chart-toggle${metric===key?' active':''}`}
        aria-pressed={metric===key}
        onClick={()=>{setMetric(key);setActiveMonth(null);}}>{metricLabels[key]}</button>)}
    </div>
    <div className="rf-trend-scroll">
      <div className="rf-trend-viewport" onMouseLeave={()=>setActiveMonth(null)}>
        <svg className="rf-trend-svg" viewBox={`0 0 ${width} ${height}`} role="group"
          aria-label={`${t('revenueTrendTitle')}: ${metricLabels[metric]} · ${t('rentalCount')}`}>
          <defs><linearGradient id="rf-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#27a56b" stopOpacity=".24"/>
            <stop offset="100%" stopColor="#27a56b" stopOpacity=".025"/>
          </linearGradient></defs>
          {geometry.ticks.map(tick=>{
            const y=bottom-(tick-geometry.ticks[0])/(geometry.ticks[geometry.ticks.length-1]-geometry.ticks[0])*(bottom-top);
            return <g key={tick}><line className="rf-trend-grid" x1={left} x2={right} y1={y} y2={y}/>
              <text className="rf-trend-axis" x={left-14} y={y+4} textAnchor="end">{axisLabel(tick)}</text></g>;
          })}
          {showBookings&&<g className="rf-trend-reservation-bars" aria-hidden="true">
            {geometry.bars.map((bar,i)=><rect key={months[i].label} x={bar.x} y={bar.y} width="26" height={bar.height} rx="4"/>)}
            <text className="rf-trend-axis" x={right+10} y={top+4}>{geometry.rightMax}</text>
            <text className="rf-trend-axis" x={right+10} y={bottom+4}>0</text>
            <text className="rf-trend-right-label" x={right+10} y={top-12}>{t('rentalCount')}</text>
          </g>}
          <path className="rf-trend-area" d={geometry.area} />
          <path className="rf-trend-line" d={geometry.line}/>
          {activeMonth!==null&&geometry.points[activeMonth]&&<line className="rf-trend-guide"
            x1={geometry.points[activeMonth].x} x2={geometry.points[activeMonth].x}
            y1={top} y2={bottom}/>}
          {geometry.points.map((point,i)=><g key={point.label}>
            <circle className={`rf-trend-dot${activeMonth===i?' active':''}`}
              cx={point.x} cy={point.y} r={activeMonth===i?7:5}
              role="button" tabIndex={0}
              aria-label={`${formatBalancePeriod(point.label,locale)}: ${metricLabels[metric]} ${formatValue(point.value)}, ${t('rentalCount')} ${point.bookingCount}`}
              onMouseEnter={()=>setActiveMonth(i)} onFocus={()=>setActiveMonth(i)}
              onClick={()=>setActiveMonth(i)}
              onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setActiveMonth(i);}}}/>
            <text className="rf-trend-month" x={point.x} y={bottom+25} textAnchor="middle">{monthName(months[i].month)}</text>
          </g>)}
        </svg>
        {selected&&<div className="rf-trend-tooltip" role="status" aria-live="polite">
          <strong>{formatBalancePeriod(selected.label,locale)}</strong>
          <span><i className="rf-trend-legend-line"/>{metricLabels[metric]} <b>{formatValue(Number(selected[metric]??0))}</b></span>
          {showBookings&&<span><i className="rf-trend-legend-bar"/>{t('rentalCount')} <b>{selected.bookingCount??0}</b></span>}
        </div>}
      </div>
    </div>
    <div className="rf-trend-legend">
      <span><i className="rf-trend-legend-line"/>{metricLabels[metric]}</span>
      {showBookings&&<span><i className="rf-trend-legend-bar"/>{t('rentalCount')} ({t('secondaryAxis')})</span>}
    </div>
    <div className="rf-chart-insights" aria-live="polite">
      {strongest&&weakest?<><p><strong>{t('strongestMonth')}:</strong> {monthName(strongest.month)} ({strongest.bookingCount})</p>
        <p><strong>{t('slowestMonth')}:</strong> {monthName(weakest.month)} ({weakest.bookingCount})</p></>:<p>{t('noHistoryForInsights')}</p>}
    </div>
    <p className="rf-chart-footnote">{t('completedMonthsNote')} {t('bookedNightsNotPayments')}</p>
  </section>;
};
