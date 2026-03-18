interface ISubmitButton {
    type: "submit" | "reset" | "button";
    isLoading: boolean | undefined;
    context?: string;
    icon?: React.ReactNode;
    
}

export const SubmitButton = ({type, isLoading, context, icon}: ISubmitButton)=> (
    <button
        type={type}
        disabled={isLoading}
        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 mt-8 hover:bg-sage-600 transition-all shadow-xl shadow-slate-200 active:scale-95 group"
      >
        {submitLoading(isLoading, context ?? "")}
        {icon}
    </button>
)

const submitLoading = (isLoading: any, context: string)=> (
    isLoading? (
        <div className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>loading...</span>
            </div>
    ) : context
)