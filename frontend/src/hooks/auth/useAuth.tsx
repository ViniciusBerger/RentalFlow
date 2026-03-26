import { useState } from "react";
import { login, logout, getMe } from "./auth-service";
import { useNavigate } from "react-router-dom";
import { completeProfile } from "./auth-service";

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const resetError = () => setError(null);

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await login(email, password);

      const me = await getMe();
      console.log(me)

      if (!me.isRegistered) {
        navigate("/complete-profile");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setIsLoading(false);
    }
  };


  const handleCompleteProfile = async (firstName: string, lastName: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await completeProfile({firstName, lastName});

      const me = await getMe();

      if (me.isRegistered) {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to complete profile");
    } finally {
      setIsLoading(false);
    }
  };


  const handleLogout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await logout();
      navigate("/auth");
    } catch (err: any) {
      setError(err.message ?? "Logout failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    handleLogin,
    resetError,
    handleCompleteProfile,
    handleLogout,
  };
};