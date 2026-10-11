import { X } from "lucide-react";
import { useLanguage } from "../../../i18n/context";


export const CloseButton= ({onClose}: {onClose:()=> void})=> {const {t}=useLanguage();return (
    <div>
        <button type="button" aria-label={t("close")}
          onClick={onClose} 
          className="absolute top-6 right-6 z-10 p-2 bg-white/80 backdrop-blur-md hover:bg-white rounded-full shadow-sm transition-all active:scale-90"
        >
          <X size={20} className="text-slate-600" />
        </button>
    </div>
);}