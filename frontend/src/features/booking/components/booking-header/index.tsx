import { Plus } from "lucide-react";
import { GenericButton } from "../../../../components/buttons/generic-button"

interface IBookingHeaderProps {
    onOpenCreateRentalPopUp: ()=> void;
}

export const BookingHeader = ({onOpenCreateRentalPopUp}: IBookingHeaderProps)=> {
    return (
       <div className="mb-8 p-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
                    Your Bookings
                </h1>
                <p className="text-slate-500 font-medium mt-2 text-sm sm:text-base">
                    What's next?
                </p>
                </div>

                <div className="hidden md:block md:flex-shrink-0">
                <GenericButton
                    onClick={onOpenCreateRentalPopUp}
                    content="Add a rental"
                    icon={<Plus size={20} />}
                />
                </div>
            </div>
        </div>
    )
}