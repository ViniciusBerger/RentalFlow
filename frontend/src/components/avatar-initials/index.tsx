
export const AvatarInitials = ({firstName, lastName}: {firstName: string, lastName: string}) => (
    <div className="w-20 h-20 bg-sage-500 rounded-[24px] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-sage-200">
        {firstName.charAt(0)}{lastName.charAt(0)}
    </div>
)