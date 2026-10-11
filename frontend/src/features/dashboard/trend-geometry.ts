import type { MonthPoint } from './monthly-insights';

export type TrendMetric = 'bookingCount' | 'totalRevenue' | 'totalProfit';
export interface PlotPoint { x: number; y: number; label: string; value: number; bookingCount: number; }
export interface TrendGeometry {
  points: PlotPoint[];
  line: string;
  area: string;
  ticks: number[];
  bars: Array<{x:number;y:number;height:number;value:number}>;
  rightMax: number;
  zeroY: number;
}

export const TREND_PLOT = { left: 86, right: 954, top: 26, bottom: 282, width: 1040, height: 335 } as const;

/** Return human-readable evenly spaced axis intervals, including zero for nonnegative values. */
export function niceTickStep(range: number): number {
  if (!Number.isFinite(range) || range <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(range));
  return [1, 2, 2.5, 5, 10].find(v => v * magnitude >= range)! * magnitude;
}

/** Smooth Bezier interpolation with no overshoot past adjacent data points. */
export function smoothLine(points: ReadonlyArray<Pick<PlotPoint,'x'|'y'>>): string {
  if (!points.length) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]; const b = points[i];
    const middle = (a.x + b.x) / 2;
    path += ` C ${middle} ${a.y} ${middle} ${b.y} ${b.x} ${b.y}`;
  }
  return path;
}

/** Booking-count columns and a currency/count line have separate, correctly labelled scales. */
export function trendGeometry(months: readonly MonthPoint[], metric: TrendMetric): TrendGeometry {
  const {left,right,top,bottom} = TREND_PLOT;
  const values = months.map(m => {
    const numeric = Number(m[metric] ?? 0);
    return Number.isFinite(numeric) ? numeric : 0;
  });
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const step = niceTickStep((max - min) / 4);
  const axisMin = Math.floor(min / step) * step;
  const axisMax = Math.max(axisMin + step, Math.ceil(max / step) * step);
  const ticks = Array.from({length:Math.round((axisMax-axisMin)/step)+1},(_,i)=>axisMin+i*step);
  const toY = (v:number) => bottom - ((v-axisMin)/(axisMax-axisMin))*(bottom-top);
  const zeroY = toY(0);
  const countMax = Math.max(0,...months.map(m => Number(m.bookingCount) || 0));
  // Allow room on the independent right axis, so the secondary bars stay visually subtle.
  const rightMax = Math.max(1,Math.ceil(countMax*2));
  const xAt = (i:number) => left + (months.length <= 1 ? (right-left)/2 : i*(right-left)/(months.length-1));
  const points:PlotPoint[] = months.map((m,i)=>({
    x:xAt(i),y:toY(values[i]),label:m.label,value:values[i],bookingCount:m.bookingCount??0,
  }));
  const line = smoothLine(points);
  const area = points.length ? `${line} L ${points[points.length-1].x} ${zeroY} L ${points[0].x} ${zeroY} Z` : '';
  const bars = months.map((m,i)=>{
    const value=Math.max(0,Number(m.bookingCount)||0);
    const height=(value/rightMax)*(bottom-top);
    return {x:xAt(i)-13,y:bottom-height,height,value};
  });
  return {points,line,area,ticks,bars,rightMax,zeroY};
}
