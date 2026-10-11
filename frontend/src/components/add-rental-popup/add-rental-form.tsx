import { AlertCircle, User } from "lucide-react";
import { SubmitButton } from "../buttons/submit-button";
import { TextInputFormDiv } from "../text-input-form";
import { useLanguage } from "../../i18n/context";
import { useProperties } from '../../features/properties/property-store';
import { localizeError } from "../../i18n/messages";
import { BookingContractFields } from "./booking-contract-fields";

const emptyFormData = {
  clientFirstName: '',
  clientLastName: '',
  startDate: '',
  endDate: '',
  revenue: ' ',
  fee: ' ',
  guests: ' ',
  propertyId: '',
};

export const AddRentalForm = ({
  handleSubmit,
  handleChange,
  handleContractChange,
  contractForm,
  contractBookingEnabled,
  onQuote,
  quote,
  quoteBusy,
  quoteError,
  error,
  isSaving,
  formData = emptyFormData,
}: any) => { const {t,locale}=useLanguage();const {properties}=useProperties();const active=properties.filter(p=>p.isActive);return (
  <form className="rf-booking-form space-y-6" onSubmit={handleSubmit}>
    <label className="rf-property-select">{t('property')}
      <select required name="propertyId" aria-label={t('property')} value={formData.propertyId || (active.length===1?active[0].id:'')} onChange={handleChange}>
        <option value="">{t('chooseProperty')}</option>
        {active.map(property=><option key={property.id} value={property.id}>{property.name}</option>)}
      </select>
    </label>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <TextInputFormDiv
          type="text"
          name="clientFirstName"
          placeholder={t("firstName")}
          onChange={handleChange}
          value={formData.clientFirstName}
          label={t("firstName")}
          icon={<User size={18} />}
        />
      </div>

      <div className="space-y-2">
        <TextInputFormDiv
          type="text"
          name="clientLastName"
          placeholder={t("lastName")}
          onChange={handleChange}
          value={formData.clientLastName}
          label={t("lastName")}
          icon={<User size={18} />}
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
          {t("checkIn")}
        </label>
        <input
          type="date"
          aria-label={t("checkIn")}
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
          {t("checkOut")}
        </label>
        <input
          type="date"
          aria-label={t("checkOut")}
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
          {contractBookingEnabled?(locale==='pt-BR'?'Preço base da estadia':'Base rental price'):t("totalRevenue")}
        </label>
        <div className="relative">
          <span className="absolute left-4 top-3 font-bold text-sage-600">R$</span>
          <input
            type="number"
            step="0.01"
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
          {t("totalFees")}
        </label>
        <div className="relative">
          <span className="absolute left-4 top-3 font-bold text-sage-600">R$</span>
          <input
            type="number"
            step="0.01"
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
        {t("guests")}
      </label>
      <div className="relative">
        <input
          type="number"
          step="1"
          min="0"
          max="999"
          name="guests"
          value={formData.guests ?? 0}
          onChange={handleChange}
          className="w-full pl-10 pr-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none"
        />
      </div>
    </div>

    {contractBookingEnabled&&<BookingContractFields data={contractForm} onChange={handleContractChange} locale={locale}/>}
    {contractBookingEnabled&&<div className="space-y-3">
      <button type="button" onClick={onQuote} disabled={quoteBusy||isSaving}
       className="w-full border-2 border-sage-600 rounded-xl px-4 py-3 font-semibold">
       {quoteBusy?(locale==='pt-BR'?'Calculando no servidor...':'Calculating on server...'):
        (locale==='pt-BR'?'Conferir valor total antes de reservar':'Review total before booking')}
      </button>
      {quote&&<div role="status" className="rounded-xl bg-sage-50 border border-sage-200 px-4 py-3 text-sm space-y-1">
       <p className="font-semibold">{locale==='pt-BR'?'Cálculo confirmado pelo servidor':'Price calculated by server'}</p>
       <p>{locale==='pt-BR'?'Valor base':'Base price'}: {new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(quote.baseCents/100)}</p>
       <p>{locale==='pt-BR'?'Taxa de hóspedes calculada':'Calculated extra-guest fee'}: {new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(quote.calculatedExtraCents/100)}</p>
       <p>{locale==='pt-BR'?'Taxa aplicada':'Applied extra-guest fee'}: {new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(quote.chargedExtraCents/100)}</p>
       <p className="font-bold">{locale==='pt-BR'?'Total da reserva':'Booking total'}: {new Intl.NumberFormat(locale,{style:'currency',currency:'BRL'}).format(quote.totalCents/100)}</p>
       <p className="text-xs">{locale==='pt-BR'?'O backend recalcula o total ao salvar e rejeita valores desatualizados.':'The backend recalculates on save and rejects stale totals.'}</p>
      </div>}
      {quoteError&&<p role="alert" className="text-sm text-red-700">{localizeError(quoteError,locale)}</p>}
    </div>}
    {error && (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 animate-in fade-in slide-in-from-top-1">
        <AlertCircle size={16} className="flex-shrink-0" />
        <p className="text-xs font-bold leading-tight">{localizeError(error,locale)}</p>
      </div>
    )}

    <SubmitButton type="submit" isLoading={isSaving} disabled={contractBookingEnabled&&(!quote||quoteBusy)} context={t("createBookingShort")} />
  </form>
);};