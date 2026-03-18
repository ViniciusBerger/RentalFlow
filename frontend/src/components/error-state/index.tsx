import { AlertCircle, RefreshCw, } from "lucide-react";

export const DashboardErrorState = ({ message, onRetry }: { message: string, onRetry: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-sage-50 p-6 text-center">
      {/* Soft Icon Backdrop */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-red-200 rounded-full blur-2xl opacity-20 animate-pulse" />
        <div className="relative w-20 h-20 bg-white rounded-[24px] shadow-xl shadow-red-100 flex items-center justify-center text-red-500 border border-red-50">
          <AlertCircle size={40} strokeWidth={2.5} />
        </div>
      </div>

      {/* Error Content */}
      <h2 className="text-2xl font-black text-slate-800 mb-2">Something went wrong</h2>
      <p className="text-slate-500 text-sm max-w-xs mb-8 leading-relaxed">
        We couldn't load your dashboard data. This might be a temporary connection issue.
      </p>

      {/* Technical Detail (The "Ugly" Error) */}
      <div className="bg-white/50 backdrop-blur-sm border border-red-100 p-4 rounded-2xl mb-8 max-w-md w-full">
        <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Technical Detail</p>
        <p className="text-xs font-mono text-red-600 break-words">{message}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col w-full max-w-xs gap-3">
        <button 
          onClick={onRetry}
          className="flex items-center justify-center gap-2 py-4 bg-sage-500 hover:bg-sage-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-sage-200 active:scale-95"
        >
          <RefreshCw size={18} />
          Try Again
        </button>
        
        <button 
          onClick={() => window.location.href = '/'}
          className="py-4 bg-white text-slate-400 hover:text-slate-600 rounded-2xl font-bold transition-all"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};