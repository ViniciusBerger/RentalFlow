import { AlertCircle, User } from "lucide-react";
import { SubmitButton } from "../buttons/submit-button";
import { TextInputFormDiv } from "../text-input-form";

const emptyFormData = {
  clientFirstName: '',
  clientLastName: '',
  startDate: '',
  endDate: '',
  revenue: ' ',
  fee: ' ',
  profit: ' ',
  guests: ' ',
};

export const AddRentalForm = ({
  handleSubmit,
  handleChange,
  error,
  isSaving,
  formData = emptyFormData,
}: any) => (
  <form className="space-y-6" onSubmit={handleSubmit}>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <TextInputFormDiv
          type="text"
          name="clientFirstName"
          placeholder="first name"
          onChange={handleChange}
          value={formData.clientFirstName}
          label="first name"
          icon={<User size={18} />}
        />
      </div>

      <div className="space-y-2">
        <TextInputFormDiv
          type="text"
          name="clientLastName"
          placeholder="Last name"
          onChange={handleChange}
          value={formData.clientLastName}
          label="last name"
          icon={<User size={18} />}
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
          Check In
        </label>
        <input
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
          Check Out
        </label>
        <input
          type="date"
          name="endDate"
          value={formData.endDate}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none text-sm"
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
          Total Revenue
        </label>
        <div className="relative">
          <span className="absolute left-4 top-3 font-bold text-sage-600">R$</span>
          <input
            type="number"
            step="1"
            min="0"
            name="revenue"
            value={formData.revenue}
            onChange={handleChange}
            className="w-full pl-10 pr-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
          Total Fees
        </label>
        <div className="relative">
          <span className="absolute left-4 top-3 font-bold text-sage-600">R$</span>
          <input
            type="number"
            step="1"
            min="0"
            name="fee"
            value={formData.fee}
            onChange={handleChange}
            className="w-full pl-10 pr-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none"
          />
        </div>
      </div>
    </div>

    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
        Guests
      </label>
      <div className="relative">
        <input
          type="number"
          step="1"
          min="0"
          max="20"
          name="guests"
          value={formData.guests ?? 0}
          onChange={handleChange}
          className="w-full pl-10 pr-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none"
        />
      </div>
    </div>

    {error && (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 animate-in fade-in slide-in-from-top-1">
        <AlertCircle size={16} className="flex-shrink-0" />
        <p className="text-xs font-bold leading-tight">{error}</p>
      </div>
    )}

    <SubmitButton type="submit" isLoading={isSaving} context="Save" />
  </form>
);