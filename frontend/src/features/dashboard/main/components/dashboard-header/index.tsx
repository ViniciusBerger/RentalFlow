interface IHeaderProps {
  username: {
    firstName?: string;
    lastName?: string;
  } | null;
}

export const Header = ({ username }: IHeaderProps) => {
  const firstName = username?.firstName?.trim() || "Host";
  const lastName = username?.lastName?.trim() || "";

  const formattedFirstName =
    firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const formattedLastName = lastName
    ? lastName.charAt(0).toUpperCase() + lastName.slice(1)
    : "";

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-black">
        Good morning, {formattedFirstName} {formattedLastName}! ☀️
      </h1>
      <p className="text-slate-500 text-sm">
        Here is what's happening today.
      </p>
    </div>
  );
};