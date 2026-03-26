import React, { useState } from "react";
import { User, ArrowRight, Home } from "lucide-react";
import { useAuth } from "../../hooks/auth/useAuth";
import { Footer } from "../../components/footer";
import { SubmitButton } from "../../components/buttons/submit-button";

export default function CompleteProfilePage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
  });

  const { handleCompleteProfile, isLoading, error, resetError } = useAuth();

  const handleChange =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (error) resetError();
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCompleteProfile(form.firstName, form.lastName);
  };

  return (
    <div className="min-h-screen w-full bg-[#EEF2F1] flex items-center justify-center px-6 py-10 font-sans">
      <div className="w-full max-w-[540px]">
        <div className="mb-10 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white shadow-[0_4px_14px_rgba(15,23,42,0.12)] border border-slate-100 flex items-center justify-center">
            <Home className="h-6 w-6 text-[#5DA88A] fill-[#5DA88A]" />
          </div>
          <h1 className="text-[2.2rem] font-extrabold tracking-[-0.03em] text-[#09183F]">
            RentalFlow
          </h1>
        </div>

        <div className="mb-8">
          <h2 className="text-[3rem] leading-none font-extrabold tracking-[-0.04em] text-[#09183F]">
            Complete profile
          </h2>
          <p className="mt-3 text-[1.1rem] font-semibold text-[#94A3C4]">
            Finish setting up your account to manage your stays.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-[22px] bg-white border border-slate-200 shadow-[0_4px_12px_rgba(15,23,42,0.08)] px-5 h-[72px] flex items-center gap-3">
            <User className="h-5 w-5 text-[#B7C5D8]" />
            <input
              type="text"
              placeholder="First name"
              value={form.firstName}
              onChange={handleChange("firstName")}
              className="w-full bg-transparent outline-none text-[#09183F] placeholder:text-[#B7C5D8] text-lg font-medium"
            />
          </div>

          <div className="rounded-[22px] bg-white border border-slate-200 shadow-[0_4px_12px_rgba(15,23,42,0.08)] px-5 h-[72px] flex items-center gap-3">
            <User className="h-5 w-5 text-[#B7C5D8]" />
            <input
              type="text"
              placeholder="Last name"
              value={form.lastName}
              onChange={handleChange("lastName")}
              className="w-full bg-transparent outline-none text-[#09183F] placeholder:text-[#B7C5D8] text-lg font-medium"
            />
          </div>

          {error && (
            <p className="px-1 text-sm font-medium text-red-500">{error}</p>
          )}

            {/* Submit Button */}
            <SubmitButton type={"submit"} isLoading={isLoading} context={">"}/>
        </form>

        <Footer/>
      </div>
    </div>
  );
}