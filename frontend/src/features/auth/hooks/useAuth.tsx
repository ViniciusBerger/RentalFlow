import { useState } from "react";
import { login, logout } from "../service/auth-service";
import { useNavigate } from "react-router-dom";



export const useAuth = () => {

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate()
  const resetError = () => setError(null);
  
  
  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await login(email, password); // delegate login to auth-service
      navigate('/dashboard'); 
    }
    catch (err: any) {
      setError(err.message);
    } 
    finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async()=> {
  try {
    setIsLoading(true)
    await logout() 
  } 
  catch (err: any) {
    setError(err.message ?? "logout failed")
    throw err
  }
  finally {
    setIsLoading(false)
  }
}

  return { isLoading, error, handleLogin, resetError, handleLogout };
};

