import { X } from 'lucide-react';
import { useState, } from 'react'
import { AddRentalForm } from './add-rental-form';
import { CloseButton } from '../../../../components/buttons/close-button';

export default function AddRentalPopUp({ onSubmit,isOpen, onClose, isSaving, error }: { onSubmit: any,isSaving: boolean, error: any, isOpen: boolean, onClose: () => void }) {

  const [formData, setFormData] = useState({
    clientFirstName: '',
    clientLastName: '',
    startDate: '',
    endDate: '',
    revenue: 0,
    fee: 0,
    profit: 0
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData(prev => {
      let finalValue: string | number = value;

      // Convert revenue to number
      if (name === 'revenue' || name === 'profit' || name==='fee') {
        finalValue = parseFloat(value) || 0;
      } 
      // 2. Handle Names (Capitalize first letter)
      else if (name === 'clientFirstName' || name === 'clientLastName') {
        finalValue = value.charAt(0).toUpperCase() + value.slice(1);
      }

      return {
        ...prev,
        [name]: finalValue
      };
    });
};

  if (!isOpen) return null;

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault(); 
    
    await onSubmit(formData); // Send the actual data!
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-lg rounded-t-[32px] md:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800">New Rental</h2>
          <CloseButton onClose={onClose}/>
        </div>

        <AddRentalForm handleSubmit={handleSubmit} handleChange={handleChange} error={error} isSaving={isSaving}   />
      </div>
    </div>
  );
}