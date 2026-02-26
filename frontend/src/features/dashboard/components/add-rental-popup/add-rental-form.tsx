import { AlertCircle, User } from "lucide-react";

export const AddRentalForm = ({handleSubmit, handleChange, error, isSaving}: any)=> (
    <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Client Name Group */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">First Name</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-3 text-sage-500" />
                <input type="text" name="clientFirstName" placeholder="first name" onChange={(e)=> handleChange(e)}  className="w-full pl-10 pr-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Last Name</label>
              <input type="text" name="clientLastName" placeholder="last name" onChange={(e)=> handleChange(e)} className="w-full px-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none" />
            </div>
          </div>

          {/* Dates Group */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Check In</label>
              <input type="date" name="startDate" onChange={(e)=> handleChange(e)} className="w-full px-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Check Out</label>
              <input type="date" name="endDate" onChange={(e)=> handleChange(e)} className="w-full px-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none text-sm" />
            </div>
          </div>

            {/* Revenue and fees */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Total Revenue</label>
              <div className="relative">
                <span className="absolute left-4 top-3 font-bold text-sage-600">R$</span>
                <input type="number" step="0.01" name="revenue" onChange={(e)=> handleChange(e)} className="w-full pl-10 pr-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Total Fees</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 font-bold text-sage-600">R$</span>
                  <input type="number" step="0.01" name="fee" onChange={(e)=> handleChange(e)} className="w-full pl-10 pr-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none" />
                </div>
            </div>
          </div>

            {/* Guests */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Guests</label>
              <div className="relative">
                <span className="absolute left-4 top-3 font-bold text-sage-600"></span>
                <input type="number" step="1" min="0" max="20" name="guests" onChange={(e)=> handleChange(e)} className="w-full pl-10 pr-4 py-3 bg-sage-50 border-none rounded-2xl focus:ring-2 focus:ring-sage-500 transition-all outline-none" />
              </div>
            </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={16} className="flex-shrink-0" />
              <p className="text-xs font-bold leading-tight">{error}</p>
            </div>
)}

          {/* Submit Button */}
            <button 
              type="submit"
              disabled={isSaving} // Prevents duplicate clicks
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all transform 
                ${isSaving 
                  ? 'bg-slate-400 cursor-wait scale-95' // 2. Visual "Pressed" or disabled state
                  : 'bg-sage-500 hover:bg-sage-600 active:scale-[0.98] shadow-xl text-white'
                }`}
            >
              {isSaving ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Rental...</span>
                </div>
              ) : (
                "Create Rental"
              )}
          </button>
        </form>
)