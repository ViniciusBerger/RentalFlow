interface IncomeProps {
  props: {
    yearly?: {label:string , totalRevenue: number, totalProfit:number}  | null
    monthly?: {label:string , totalRevenue: number, totalProfit:number} | null
  }
}
export const IncomeSection = ({props}: IncomeProps)=> (
    <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-white p-5 text-center rounded-2xl border border-sage-100 shadow-sm shadow-sage-100/50">
            <p className="text-[10px] uppercase tracking-widest text-sage-600 font-black mb-1">Yearly Income</p>
            <h2 className="text-2xl font-bold tracking-tight">R$ {props.yearly?.totalRevenue ?? 0}</h2>
            <p className="text-xs font-bold mt-0.5 text-sage-500">{props.yearly?.label ?? ""}</p>
          </div>

          <div className="bg-white p-5 text-center rounded-2xl border border-sky-100 shadow-sm shadow-sky-100/50">
            <p className="text-[10px] uppercase tracking-widest text-sky-600 font-black mb-1">Yearly Profit</p>
            <h2 className="text-2xl font-bold tracking-tight">R$ {props.yearly?.totalProfit ?? 0}</h2>
            <p className="text-xs font-bold mt-0.5 text-sage-500">{props.yearly?.label ?? ""}</p>
          </div>


          <div className="bg-white p-5 text-center rounded-2xl border border-sage-100 shadow-sm shadow-sage-100/50">
            <p className="text-[10px] uppercase tracking-widest text-sage-600 font-black mb-1">Monthly Income</p>
            <h2 className="text-2xl font-bold  tracking-tight">R$ {props.monthly?.totalRevenue ?? 0}</h2>
            <p className="text-xs font-bold mt-0.5 text-sage-500">{props.monthly?.label ?? ""}</p>
            
          </div>
          
          <div className="bg-white p-5 text-center rounded-2xl border border-sky-100 shadow-sm shadow-sky-100/50">
            <p className="text-[10px] uppercase tracking-widest text-sky-600 font-black mb-1">Monthly Profit</p>
            <h2 className="text-2xl font-bold tracking-tight">R$ {props.monthly?.totalProfit ?? 0}</h2>
            <p className="text-xs font-bold mt-0.5 text-sage-500">{props.monthly?.label ?? ""}</p>
          </div>
      </div>
)