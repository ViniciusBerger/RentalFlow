import { useEffect, useState } from 'react';
import { AddRentalForm } from '../add-rental-popup/add-rental-form';
import { CloseButton } from '../buttons/close-button';

type RentalData = {
  clientFirstName: string;
  clientLastName: string;
  startDate: string;
  endDate: string;
  revenue: number;
  fee: number;
  profit: number;
  guests: number;
};

export default function EditRentalPopUp({
  onSubmit,
  isOpen,
  onClose,
  isSaving,
  error,
  rental,
}: {
  onSubmit: any;
  isSaving: boolean;
  error: any;
  isOpen: boolean;
  onClose: () => void;
  rental: Partial<RentalData> | null;
}) {
  const [formData, setFormData] = useState<RentalData>({
  clientFirstName: '',
  clientLastName: '',
  startDate: '',
  endDate: '',
  revenue: 0,
  fee: 0,
  profit: 0,
  guests: 0,
});

  useEffect(() => {
    if (rental && isOpen) {
      setFormData({
        clientFirstName: rental.clientFirstName ?? '',
        clientLastName: rental.clientLastName ?? '',
        startDate: rental.startDate ?? '',
        endDate: rental.endDate ?? '',
        revenue: rental.revenue ?? 0,
        fee: rental.fee ?? 0,
        profit: rental.profit ?? 0,
        guests: rental.guests ?? 0
      });
    }
  }, [rental, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      let finalValue: string | number = value;

      if (name === 'revenue' || name === 'profit' || name === 'fee') {
        finalValue = parseFloat(value) || 0;
      } else if (name === 'clientFirstName' || name === 'clientLastName') {
        finalValue = value.charAt(0).toUpperCase() + value.slice(1);
      }

      return {
        ...prev,
        [name]: finalValue,
      };
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();

    const success = await onSubmit(formData);
    if (!success) return;

    onClose();
  };

  return (
    <div
      translate="no"
      className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-4"
    >
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-t-[32px] bg-white p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 md:rounded-[32px] md:zoom-in-95">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-800">Edit Rental</h2>
          <CloseButton onClose={onClose} />
        </div>

        <AddRentalForm
          handleSubmit={handleSubmit}
          handleChange={handleChange}
          error={error}
          isSaving={isSaving}
          formData={formData}
        />
      </div>
    </div>
  );
}