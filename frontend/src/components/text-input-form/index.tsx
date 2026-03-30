
interface inputDivProps {
    type: string,
    placeholder: string,
    onChange: (e: any)=> void,
    icon?: React.ReactNode
    value?: string,
    name?:string
    label?:string
}

export const TextInputFormDiv = ({value, onChange, type, placeholder, icon, name, label}: inputDivProps)=> {
    return (
        <div className="space-y-2">
            {/* The Label (Only shows if you provide it) */}
            {label && <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">{label}</label>}
            
            <div className="relative group">
                {/* The Icon (Placed inside the glassmorphic box) */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-500">{icon}</div>
                
                <input
                    name={name}
                    type={type}
                    value={value ?? ''}
                    placeholder={placeholder}
                    onChange={onChange} 
                    className="w-full pl-14 pr-6 py-4 bg-white/50 border border-sage-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-sage-500/10 focus:border-sage-300 transition-all placeholder:text-slate-300 shadow-sm"
                />
            </div>
        </div>
    )
}