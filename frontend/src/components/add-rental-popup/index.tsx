import { useRef, useState } from 'react'
import { AddRentalForm } from './add-rental-form';
import { CloseButton } from '../buttons/close-button';
import { useProperties } from '../../features/properties/property-store';
import { useLanguage } from "../../i18n/context";

const contractBookingEnabled=import.meta.env.VITE_CONTRACT_BOOKING_DRAFTS_ENABLED==='true';
const initialContract={cpf:'',rg:'',nationality:'BR',maritalStatus:'',address:'',phone:'',email:'',feeMode:'AUTOMATIC',feeReason:'',feeAdjustment:'',paymentMethod:'PIX',paymentDueEvent:'KEY_HANDOVER'};
export default function AddRentalPopUp({ onSubmit,isOpen, onClose, isSaving, error }: { onSubmit: any,isSaving: boolean, error: any, isOpen: boolean, onClose: () => void }) {
  const {t}=useLanguage();
  const {properties}=useProperties();
  const [contractForm,setContractForm]=useState(initialContract);
  const requestKey=useRef<string|null>(null);
  const handleContractChange=(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>{
    requestKey.current=null;
    setContractForm(prev=>({...prev,[e.target.name]:e.target.value}));
  };

  const [formData, setFormData] = useState({
    clientFirstName: '',
    clientLastName: '',
    startDate: '',
    endDate: '',
    revenue: '',
    fee: '',
    guests: '',
    propertyId: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    requestKey.current=null;
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
    
    const active=properties.filter(p=>p.isActive);
    const propertyId=formData.propertyId || (active.length===1?active[0].id:'');
    if(!propertyId)return;
    const payload:Record<string,unknown>={...formData,propertyId};
    if(contractBookingEnabled){
      if(!requestKey.current)requestKey.current=crypto.randomUUID();
      const guest:Record<string,string>={};
      for(const key of ['cpf','rg','nationality','maritalStatus','address','phone','email'] as const){
        if(contractForm[key].trim())guest[key]=contractForm[key].trim();
      }
      const guestFee=contractForm.feeMode==='ADJUSTED'
        ?{mode:'ADJUSTED',cents:Math.round(Number(contractForm.feeAdjustment)*100),reason:contractForm.feeReason}
        :contractForm.feeMode==='WAIVED'
        ?{mode:'WAIVED',reason:contractForm.feeReason}
        :{mode:'AUTOMATIC'};
      payload.bookingDraft={
        requestKey:requestKey.current,
        baseRevenueCents:Math.round(Number(formData.revenue)*100),
        guest,guestFee,paymentMethod:contractForm.paymentMethod,
        paymentDueEvent:contractForm.paymentDueEvent
      };
    }
    const success=await onSubmit(payload);
    if (!success) return;
    requestKey.current=null;
    setContractForm(initialContract);
    setFormData({clientFirstName:'',clientLastName:'',startDate:'',endDate:'',revenue:'',fee:'',guests:'',propertyId:''});
    onClose();
  };


  return (
    <div translate="no" className=" fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-t-[28px] md:rounded-[28px] p-6 md:p-9 rf-dialog shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-800">{t("createBooking")}</h2>
          <CloseButton onClose={onClose}/>
        </div>

        <AddRentalForm handleSubmit={handleSubmit} handleChange={handleChange} handleContractChange={handleContractChange} contractForm={contractForm} contractBookingEnabled={contractBookingEnabled} error={error} isSaving={isSaving} formData={formData} />
      </div>
    </div>
  );
}