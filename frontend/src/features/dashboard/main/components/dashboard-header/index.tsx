interface IHeaderProps {
    username: any
}
export const Header = ({username}: IHeaderProps)=> (
    

    <div className="mb-8">
        <h1 className="text-2xl font-black">
            Good morning, {((username.firstName).charAt(0).toUpperCase() + (username.firstName ?? "Host").slice(1)) + " " + ((username.lastName).charAt(0).toUpperCase() + (username.lastName ?? "Host").slice(1))}! ☀️
        </h1>
        <p className="text-slate-500 text-sm">Here is what's happening today.</p>
    </div>
)