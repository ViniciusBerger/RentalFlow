import { Footer } from "../footer";
import { useLanguage } from "../../i18n/context";

export const LoadingState = () => {
  const {t}=useLanguage();
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden font-sans">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-[#A7CDBD] border-t-[#2F5D50] animate-spin" />
        <p className="text-[#2F5D50] text-lg md:text-xl font-medium tracking-wide">
          {t("loading")}
        </p>
      </div>

      <Footer />
    </div>
  );
};