import { useLanguage } from "../../../../../i18n/context";
interface IHeaderProps {username:{firstName?:string;lastName?:string}|null}
export const Header=({username}:IHeaderProps)=>{const { t }=useLanguage(); return <div className="rf-greeting"><div><p className="rf-eyebrow">{t("dashboardHeading")}</p><h2>{t("welcomeBack")} {username?.firstName?.trim()||t("host")}<span className="rf-greeting-dot">.</span></h2><p>{t("dashboardDescription")}</p></div><span className="rf-greeting-tag">{t("liveOverview")}</span></div>; };
