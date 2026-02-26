import { Calendar, DollarSign, Clock, Trash2, Edit3,} from 'lucide-react';
import { CloseButton } from '../../../../components/buttons/close-button';
import { RentalDetailHeader } from './components/header';
import { DetailGrid } from './components/detail-grid';

interface Rental {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  startDate: string;
  endDate: string;
  revenue: number;
  fee: number;
  profit: number;
  isActive: boolean
  createdAt?: string;
}

interface ModalProps {
  isOpen: boolean;
  rental: Rental | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}



export default function RentalDetailPopUp({ isOpen, rental, onClose, onDelete }: ModalProps) {
  if (!isOpen || !rental) return null;

  

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-t-[40px] md:rounded-[40px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
        
        <CloseButton onClose={onClose}/>

        {/* 1. Header Section */}
        <RentalDetailHeader rental={rental}/>

        {/* 2. Details Grid */}
        <div className="p-8 space-y-8">
          <DetailGrid rental={rental}/>

          {/* 3. Footer Metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock size={14} />
              <span className="text-[10px] font-bold uppercase tracking-tight">
                Ref ID: {rental.id.slice(0, 8)}
              </span>
            </div>
          </div>

          {/* 4. Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button className="flex-1 py-4 bg-slate-900 text-white rounded-[24px] font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200">
              <Edit3 size={18} />
              Edit Booking
            </button>
            <button 
              onClick={() => onDelete?.(rental.id)}
              className="w-16 h-14 bg-red-50 text-red-500 rounded-[24px] flex items-center justify-center hover:bg-red-100 transition-all active:scale-95 border border-red-100"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}