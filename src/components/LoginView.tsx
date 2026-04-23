import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Briefcase } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, newDb } from '../firebase';
import DarkModeToggle from './DarkModeToggle';
import { Trainee } from '../types';

interface LoginViewProps {
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  isLoadingLogin: boolean;
  setIsLoadingLogin: (v: boolean) => void;
  loginError: string;
  setLoginError: (v: string) => void;
  setUserName: (v: string) => void;
  setIsAdmin: (v: boolean) => void;
  setIsLoggedIn: (v: boolean) => void;
  setSelectedTrainee: (v: Trainee | null) => void;
  setFormData: (v: any | ((prev: any) => any)) => void;
}

const LoginView = memo(({
  isDarkMode,
  setIsDarkMode,
  loginEmail,
  setLoginEmail,
  isLoadingLogin,
  setIsLoadingLogin,
  loginError,
  setLoginError,
  setUserName,
  setIsAdmin,
  setIsLoggedIn,
  setSelectedTrainee,
  setFormData
}: LoginViewProps) => {
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = loginEmail.trim().toLowerCase();
    if (!trimmedEmail) return;
    
    setIsLoadingLogin(true);
    setLoginError('');
    
    try {
      const emailLower = trimmedEmail;
      
      // 1. Verifica se é administrador
      const adminQ = query(collection(db, 'administrators'), where('email', '==', emailLower));
      const adminSnap = await getDocs(adminQ);
      
      if (!adminSnap.empty) {
        const adminData = adminSnap.docs[0].data();
        const rawName = adminData.nome || adminData.name || trimmedEmail.split('.')[0] || 'Admin';
        setUserName(rawName.split(' ')[0].toUpperCase());
        setIsAdmin(true);
        setIsLoggedIn(true);
        return;
      }

      // 2. Verifica se é aluno em alguma turma
      const turmas = ['turma a', 'turma b', 'turma c', 'turma d'];
      for (const turma of turmas) {
        const turmaQ = query(collection(db, turma), where('email', '==', emailLower));
        const turmaSnap = await getDocs(turmaQ);
        
        if (!turmaSnap.empty) {
          const traineeDoc = turmaSnap.docs[0];
          const t = traineeDoc.data();
          setIsAdmin(false);
          setIsLoggedIn(true);
          
          // Buscar progresso no novo banco de dados
          const stageSnap = await getDoc(doc(newDb, 'estagios', t.matricula || ''));
          const stageData = stageSnap.exists() ? stageSnap.data() as any : null;

          const traineeObj: Trainee = {
            id: traineeDoc.id,
            name: t.nome || t.name || 'Usuário',
            matricula: t.matricula || '',
            funcao: t.funcao || '',
            progress: stageData?.status === 'efetivado' ? 100 : (stageData ? Math.round((stageData.horasAcumuladas / 432) * 100) : 0),
            status: stageData?.status === 'efetivado' ? 'completed' : 'active'
          };
          
          setUserName(traineeObj.name.split(' ')[0].toUpperCase());
          setSelectedTrainee(traineeObj);
          setFormData((prev: any) => ({
            ...prev,
            nome: traineeObj.name,
            matricula: traineeObj.matricula,
            funcao: traineeObj.funcao
          }));
          return;
        }
      }

      setLoginError('Email não encontrado no sistema.');
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);
      setLoginError(error.message || 'Erro de conexão com o banco de dados.');
    } finally {
      setIsLoadingLogin(false);
    }
  };

  return (
    <motion.div 
      key="login"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-screen flex items-center justify-center p-4 relative"
    >
      <div className="absolute top-6 right-6">
        <DarkModeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
      </div>
      <div className="bg-surface rounded-[32px] p-8 shadow-xl max-w-md w-full border border-border-subtle flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
          <Briefcase className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-content mb-2 tracking-tight">Bem-vindo</h1>
        <p className="text-content-muted mb-8">Faça login com seu email corporativo</p>
        
        <form onSubmit={handleLogin} className="space-y-4 w-full text-left">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-content mb-1.5 pl-1">
              <span className="text-yellow-600 font-bold">*Digite tudo em minúsculo</span>
            </label>
            <input
              type="email"
              id="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="nome@empresa.com.br"
              className="w-full px-4 py-3 rounded-2xl border border-border-subtle focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background focus:bg-surface"
              required
              disabled={isLoadingLogin}
            />
            {loginError && (
              <p className="text-red-500 text-sm mt-2 pl-1 font-medium">{loginError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoadingLogin}
            className="w-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-black/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
          >
            {isLoadingLogin ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verificando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
});

export default LoginView;
