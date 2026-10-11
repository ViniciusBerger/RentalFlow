import type { JSX } from "react";
import { translate, type Locale } from "../../../i18n/messages";

// Helper: normalize a date to local midnight
const toLocalMidnight = (d: Date | string) => {
    
    if (typeof d === "string") {
        const parts = d.split('-').map(Number); // Split "2026-03-02" into [2026, 3, 2]
        return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0) // monthIndex is 0-based, so subtract 1;
    }
    
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
}

// Difference in days (endDate - startDate) ignoring timezone 
const diffDays = (a: Date, b: Date) => {
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((utcB - utcA) / (1000 * 60 * 60 * 24));
}

// Helper: ensure rental dates are local-midnight
export const normalizeRentalDates = (rental: any) => ({
    ...rental,
    startDate: toLocalMidnight(rental.startDate),
    endDate: toLocalMidnight(rental.endDate),
})

export const buildRentalDiff = (original: any, updated: any) => {
  const diff: Record<string, any> = {};

  for (const key of Object.keys(updated)) {
    if (updated[key] !== original?.[key]) {
      diff[key] = updated[key];
    }
  }

  return diff;
};



// Render simultaneous bookings in property-specific lanes instead of covering one another.
// A single lane can contain multiple non-overlapping bookings at the same property.
export const calendarDisplay = (rentals: any[], viewDate: Date, locale: Locale = 'en') => {
  const first=new Date(viewDate.getFullYear(),viewDate.getMonth(),1);
  const calendarStart=new Date(viewDate.getFullYear(),viewDate.getMonth(),1-first.getDay());
  const toDay=(date:Date)=>Math.round(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
  const offset=(date:Date)=>toDay(date)-toDay(calendarStart);
  const events=rentals.map(r=>({r,start:offset(new Date(r.startDate)),end:offset(new Date(r.endDate))}));
  const lanes=Array.from({length:6},(_,week)=>[...new Set(events.filter(e=>e.start<=week*7+6&&e.end>=week*7)
    .map(e=>e.r.propertyId||e.r.id))].sort());
  const elements:JSX.Element[]=[];
  for(const event of events){
    const {r,start,end}=event;
    const nights=diffDays(new Date(r.startDate),new Date(r.endDate));
    if(end<0||start>41||end<start)continue;
    for(let week=Math.max(0,Math.floor(start/7));week<=Math.min(5,Math.floor(end/7));week++){
      const firstDay=Math.max(start,week*7), lastDay=Math.min(end,week*7+6);
      const lane=lanes[week].indexOf(r.propertyId||r.id);
      elements.push(<div key={`${r.id}-${week}`} className="rf-calendar-event pointer-events-auto"
        style={{gridColumn:`${firstDay%7+1} / span ${lastDay-firstDay+1}`,gridRow:week+1,
          marginTop:`${24+lane*25}px`,alignSelf:'start',height:22,
          backgroundColor:r.propertyColor||'#0D8A57',borderColor:r.propertyColor||'#0D8A57'}}>
        <span>{`${r.clientFirstName} / ${nights} ${translate(locale,nights===1?'nightSingular':'nightPlural')}`}</span>
      </div>);
    }
  }
  return elements;
};

export const calendarRowHeight=(rentals:any[],viewDate:Date)=>{
  const first=new Date(viewDate.getFullYear(),viewDate.getMonth(),1);
  const start=new Date(viewDate.getFullYear(),viewDate.getMonth(),1-first.getDay());
  const toDay=(d:Date)=>Math.round(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);
  const offset=(d:Date)=>toDay(d)-toDay(start);
  const maximum=Math.max(1,...Array.from({length:6},(_,week)=>new Set(rentals.filter(r=>offset(new Date(r.startDate))<=week*7+6&&offset(new Date(r.endDate))>=week*7)
    .map(r=>r.propertyId||r.id)).size));
  return Math.max(90,30+maximum*25);
};
