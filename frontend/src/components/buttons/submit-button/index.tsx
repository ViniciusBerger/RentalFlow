import { useLanguage } from "../../../i18n/context";
interface ISubmitButton {
    type: "submit" | "reset" | "button";
    isLoading: boolean | undefined;
    context?: string;
    icon?: React.ReactNode;
    
}

export const SubmitButton = ({type, isLoading, context, icon}: ISubmitButton)=> { const {t}=useLanguage();return (
    <button
        type={type}
        disabled={isLoading}
        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 mt-8 hover:bg-sage-600 transition-all shadow-xl shadow-slate-200 active:scale-95 group"
      >
        {isLoading ? <span className="flex items-center gap-2"><span aria-hidden="true" className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>{t("loading")}</span> : (context ?? t("signIn"))}
        {icon}
    </button>
);}

