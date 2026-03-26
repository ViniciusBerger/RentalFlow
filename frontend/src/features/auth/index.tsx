import { Header } from './components/auth-header';
import { AuthForm } from './components/auth-form';
import { useAuth } from '../../hooks/auth/useAuth';
import { Footer } from '../../components/footer';
import { LoadingState } from '../../components/loading-state';




export const AuthPage = () => {
  const { isLoading, error, handleLogin } = useAuth()
  
  if(isLoading) return <LoadingState/>
  const onSubmit = async(email:string, password:string)=> {
      await handleLogin(email,password)
      
  }

  return (
    <div className="min-h-screen bg-sage-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <div className="w-full max-w-[440px] z-10">
        <Header/>
        <AuthForm onSubmit={onSubmit} isLoading={isLoading} error={error}/>
      </div>

      <Footer/>
    </div>
  );
};