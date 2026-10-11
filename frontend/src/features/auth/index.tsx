import { Header } from './components/auth-header';
import { AuthForm } from './components/auth-form';
import { useAuth } from '../../hooks/auth/useAuth';
import { Footer } from '../../components/footer';
import { LoadingState } from '../../components/loading-state';
import { LanguageSwitcher } from "../../i18n/language";




export const AuthPage = () => {
  const { isLoading, error, handleLogin } = useAuth()
  
  if(isLoading) return <LoadingState/>
  const onSubmit = async(email:string, password:string)=> {
      await handleLogin(email,password)
      
  }

  return (
    <div className="rf-auth-page min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <div className="w-full max-w-[460px] z-10 rf-auth-card">
        <div className="flex justify-end mb-4"><LanguageSwitcher /></div>
        <Header/>
        <AuthForm onSubmit={onSubmit} isLoading={isLoading} error={error}/>
      </div>

      <Footer/>
    </div>
  );
};