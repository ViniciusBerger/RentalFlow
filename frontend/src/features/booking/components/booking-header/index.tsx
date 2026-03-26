import { Plus } from "lucide-react";
import { GenericButton } from "../../../../components/buttons/generic-button"

interface IBookingHeaderProps {
    onOpenCreateRentalPopUp: ()=> void;
}

export const BookingHeader = ({onOpenCreateRentalPopUp}: IBookingHeaderProps)=> {
    return (
       <div>
            <div className="flex justify-between items-start mb-8">
                <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Your Bookings</h1>
                <p className="text-slate-500 font-medium mt-1">What's next?</p>
                </div>
            <GenericButton onClick={onOpenCreateRentalPopUp} content={"Add a rental"} icon={<Plus size={20} />}/>
            </div>
       </div>
    )
}