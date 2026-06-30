import React, { memo, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Briefcase } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, newDb } from '../firebase';
import DarkModeToggle from './DarkModeToggle';
import { Trainee } from '../types';
import Footer from './Footer';

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

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30000;

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
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const failedAttemptsRef = useRef(0);
  const cooldownTimerRef = useRef<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = loginEmail.trim().toLowerCase();
    if (!input) return;

    // Rate limiting
    if (failedAttemptsRef.current >= MAX_ATTEMPTS) {
      setLoginError(`Muitas tentativas. Aguarde ${Math.ceil(cooldownRemaining / 1000)}s.`);
      return;
    }
    
    setIsLoadingLogin(true);
    setLoginError('');
    
    try {
      const isEmail = input.includes('@');
      
      if (isEmail) {
        // 1. Acesso ADM: Verifica na coleção de administradores
        const adminQ = query(collection(db, 'administrators'), where('email', '==', input));
        const adminSnap = await getDocs(adminQ);
        
        if (!adminSnap.empty) {
          const adminData = adminSnap.docs[0].data();
          const rawName = adminData.nome || adminData.name || input.split('.')[0] || 'Admin';
          setUserName(rawName.split(' ')[0].toUpperCase());
          setIsAdmin(true);
          setIsLoggedIn(true);
          failedAttemptsRef.current = 0; // Reset on success
          return;
        }
        setLoginError('E-mail administrativo não encontrado.');
        failedAttemptsRef.current++;
      } else {
        // 2. Acesso Colaborador: Verifica se é matrícula em alguma turma
        const turmas = ['turma a', 'turma b', 'turma c', 'turma d', 'estagio'];
        let found = false;

        for (const turma of turmas) {
          const turmaQ = query(collection(db, turma), where('matricula', '==', input));
          const turmaSnap = await getDocs(turmaQ);
          
          if (!turmaSnap.empty) {
            found = true;
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
        if (!found) {
          setLoginError('Matrícula não encontrada.');
          failedAttemptsRef.current++;
        }
      }
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);
      setLoginError(error.message || 'Erro de conexão com o banco de dados.');
    } finally {
      setIsLoadingLogin(false);
      // Se atingiu o limite, inicia cooldown
      if (failedAttemptsRef.current >= MAX_ATTEMPTS && !cooldownTimerRef.current) {
        let remaining = COOLDOWN_MS;
        setCooldownRemaining(remaining);
        cooldownTimerRef.current = setInterval(() => {
          remaining -= 1000;
          setCooldownRemaining(remaining);
          if (remaining <= 0) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
            failedAttemptsRef.current = 0;
            setCooldownRemaining(0);
            setLoginError('');
          }
        }, 1000);
      }
    }
  };

  return (
    <motion.div 
      key="login"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="min-h-screen flex flex-col items-center p-4 relative"
    >
      <div className="absolute top-6 right-6 z-10">
        <DarkModeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
      </div>
      
      <div className="flex-1 flex items-center justify-center w-full py-4">
        <div className="bg-surface rounded-[32px] p-8 shadow-xl max-w-md w-full border border-border-subtle flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-content mb-2 tracking-tight">Bem-vindo</h1>
          <p className="text-content-muted mb-8">Faça login para acessar o painel</p>
          
          <form onSubmit={handleLogin} className="space-y-4 w-full text-left">
            <div className="space-y-2">
              <div className="flex flex-col gap-0.5 pl-1">
                <span className="text-[13px] text-yellow-600 font-black uppercase tracking-wide">* Digite tudo em minúsculo</span>
                <span className="text-[11px] text-yellow-600/80 font-bold leading-tight">• Colaborador loga com matrícula</span>
                <span className="text-[11px] text-yellow-600/80 font-bold leading-tight">• Acesso ADM com e-mail corporativo</span>
              </div>
              <input
                type="text"
                id="loginInput"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Matrícula ou E-mail"
                className="w-full px-4 py-3.5 rounded-2xl border border-border-subtle focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background focus:bg-surface font-medium"
                required
                disabled={isLoadingLogin}
                autoComplete="off"
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
      </div>
      <Footer />
    </motion.div>
  );
});

export default LoginView;
