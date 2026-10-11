import { CalendarDays, History, KeyRound } from 'lucide-react';
import { NextRentals } from './next-rentals';
import { useLanguage } from '../i18n/context';
import { splitBookings, type BookingSummary } from '../features/booking/service/booking-timeline';

export const BookingGroups = ({rentals,onSelectRental,onOpenPopUp,today}:{
 rentals:BookingSummary[];onSelectRental:(booking:BookingSummary)=>void;onOpenPopUp:()=>void;today?:string
}) => {
  const {t}=useLanguage();
  const {upcoming,current,past}=splitBookings(rentals,today);
  return <div className="rf-booking-groups">
    <NextRentals rentals={upcoming} onSelectRental={onSelectRental} onOpenPopUp={onOpenPopUp} headerContent={t('upcomingGroup')} icon={CalendarDays} emptyMessage={t('noRentals')}/>
    <NextRentals rentals={current} onSelectRental={onSelectRental} onOpenPopUp={onOpenPopUp} headerContent={t('inProgressGroup')} icon={KeyRound} emptyMessage={t('noCurrentBookings')}/>
    <NextRentals rentals={past} onSelectRental={onSelectRental} onOpenPopUp={onOpenPopUp} headerContent={t('pastGroup')} icon={History} emptyMessage={t('noPastBookings')}/>
  </div>;
};
