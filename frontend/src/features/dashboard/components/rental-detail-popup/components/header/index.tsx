import { CheckCircle2 } from "lucide-react";
import { AvatarInitials } from "../../../../../../components/avatar-initials";

export const RentalDetailHeader = ({rental}: any)=> (
    <div className="bg-sage-50 p-8 pt-12">
          <div className="flex items-center gap-5">
              <AvatarInitials firstName={rental.clientFirstName} lastName={rental.clientLastName}/>
              
              <div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white w-fit shadow-sm border border-sage-100">
                      <CheckCircle2 size={12} className={rental.isActive ? 'text-sage-500' : 'text-amber-500'} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${rental.isActive ? 'text-sage-600' : 'text-amber-600'}`}>
                        {rental.isActive ? 'Confirmed Stay' : 'Await Confirmation'}
                      </span>
                  </div>
                  
                  <h2 className="text-3xl font-black text-slate-800 mt-2">
                    {rental.clientFirstName} {rental.clientLastName}
                  </h2>
              </div>
          </div>
      </div>
)