import { Footer } from "../footer";
import { LoadingMain } from "./components/main";

export const LoadingState = () => {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-[#E0F2E9] overflow-hidden font-sans">
      
      {/* --- Background Illustration Section --- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Sun Graphic */}
        <div className="absolute top-10 right-10 md:top-20 md:right-40 w-32 h-32 md:w-48 md:h-48 bg-[#FEF3C7] rounded-full shadow-[0_0_60px_rgba(254,243,199,0.8)] border-4 border-[#FFEDD5]" />
        
        {/* Swirling Light Beams (Using SVG for clarity) */}
        <svg className="absolute w-full h-full opacity-40" viewBox="0 0 800 600">
          <path d="M0,400 Q200,300 400,450 T800,350" fill="none" stroke="#FFEDD5" strokeWidth="80" />
          <path d="M0,200 Q300,400 500,200 T800,400" fill="none" stroke="#FEF3C7" strokeWidth="60" />
        </svg>
      </div>

      <LoadingMain/>
      <Footer/>
    </div>
  );
};