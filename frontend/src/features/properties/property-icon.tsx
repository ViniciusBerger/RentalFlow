import { Building2, House, Waves, Sun, TreePine, Mountain, KeyRound, Building } from 'lucide-react';
const icons:Record<string,typeof House>={building:Building2,house:House,apartment:Building,waves:Waves,sun:Sun,tree:TreePine,mountain:Mountain,key:KeyRound};
export const PropertyIcon=({icon='building',color='#0D8A57',size=21}:{icon?:string;color?:string;size?:number})=>{
 const Component=icons[icon]??Building2;
 return <span className="rf-property-symbol" style={{color,backgroundColor:`${color}18`}}><Component size={size}/></span>;
};
