import { ArrowRight, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { TextInputFormDiv } from "../../../../components/text-input-form";
import { SubmitButton } from "../../../../components/buttons/submit-button";

type LoginFormProps = {
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
};

export const AuthForm = ({ onSubmit, isLoading, error }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-10">
      
      {/* Email */}
      <TextInputFormDiv value={email} type={"email"} placeholder={"host@rentals.com"} onChange={(e)=>setEmail(e.target.value)} icon={<Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sage-500 transition-colors" size={18}/> }/>

      {/* Password */}
      <TextInputFormDiv value={password} type={'password'} placeholder={"••••••••"} onChange={(e)=> setPassword(e.target.value)} icon={<Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sage-500 transition-colors" size={18} />}/>

      {/* Error message */}
      {error && <p className="text-red-500 text-sm font-bold">{error}</p>}

      {/* Submit button */}
      <SubmitButton type={"submit"} isLoading={isLoading} icon={<ArrowRight
          size={18}
          className="group-hover:translate-x-1 transition-transform"
        />}/>
    </form>
  );
};