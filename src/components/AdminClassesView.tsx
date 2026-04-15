import { motion, AnimatePresence } from 'motion/react';
import { Upload, ArrowLeft, User as UserIcon, GraduationCap } from 'lucide-react';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { db, newDb } from '../firebase';
import DarkModeToggle from './DarkModeToggle';
import { Trainee } from '../types';

interface AdminClassesViewProps {
  isDarkMode: boolean;
  setIsDarkMode: (v: boolean) => void;
  loginEmail: string;
  isProfileMenuOpen: boolean;
  handleToggleProfileMenu: () => void;
  handleOpenGlobalRepo: () => void;
  handleLogout: () => void;
  setSelectedClass: (v: string | null) => void;
  setIsLoadingTrainees: (v: boolean) => void;
  setTrainees: (v: Trainee[]) => void;
}

const CLASSES_LIST = [
  { id: 'turma a', name: 'TURMA A', letter: 'A', color: 'bg-[#3b82f6]', students: 32 },
  { id: 'turma b', name: 'TURMA B', letter: 'B', color: 'bg-[#10b981]', students: 28 },
  { id: 'turma c', name: 'TURMA C', letter: 'C', color: 'bg-[#f97316]', students: 35 },
  { id: 'turma d', name: 'TURMA D', letter: 'D', color: 'bg-[#ef4444]', students: 25 },
];

export default function AdminClassesView({
  isDarkMode,
  setIsDarkMode,
  loginEmail,
  isProfileMenuOpen,
  handleToggleProfileMenu,
  handleOpenGlobalRepo,
  handleLogout,
  setSelectedClass,
  setIsLoadingTrainees,
  setTrainees
}: AdminClassesViewProps) {

  const handleSelectGlobalStorage = async () => {
    setSelectedClass('global-estagio');
    setIsLoadingTrainees(true);
    try {
      const q = query(collection(newDb, 'estagios'), where('status', '==', 'estagio'));
      const snap = await getDocs(q);
      const traineesData = snap.docs.map(docSnapshot => {
        const data = docSnapshot.data() as any;
        return {
          id: docSnapshot.id,
          name: data.nome || 'Sem Nome',
          matricula: data.matricula || '',
          funcao: data.funcao || 'Colaborador',
          progress: Math.round((data.horasAcumuladas / 432) * 100),
          status: 'active'
        } as Trainee;
      }).sort((a, b) => a.name.localeCompare(b.name));
      setTrainees(traineesData);
    } catch (e) {
      console.error("Erro ao buscar controle de estágio:", e);
    } finally {
      setIsLoadingTrainees(false);
    }
  };

  const handleSelectClass = async (clsId: string) => {
    setSelectedClass(clsId);
    setIsLoadingTrainees(true);
    try {
      const snap = await getDocs(collection(db, clsId));
      const traineesData = (await Promise.all(snap.docs.map(async docSnapshot => {
        const data = docSnapshot.data() as any;
        const stageSnap = await getDoc(doc(newDb, 'estagios', data.matricula || ''));
        const stageData = stageSnap.exists() ? stageSnap.data() as any : null;
        
        return {
          id: docSnapshot.id,
          name: data.nome || data.name || 'Sem Nome',
          matricula: data.matricula || '',
          funcao: data.funcao || '',
          email: data.email || '',
          progress: (stageData?.status === 'efetivado') ? 100 : (stageData ? Math.round((stageData.horasAcumuladas / 432) * 100) : 0),
          status: stageData?.status === 'efetivado' ? 'completed' : stageData?.status === 'estagio' ? 'active' : 'none'
        } as Trainee;
      }))).sort((a, b) => a.name.localeCompare(b.name));
      setTrainees(traineesData);
    } catch (e) {
      console.error("Erro ao buscar alunos:", e);
    } finally {
      setIsLoadingTrainees(false);
    }
  };

  return (
    <motion.div 
      key="classes"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="pt-16 pb-24"
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Header Section - Asymmetric Design */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-xl">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl md:text-5xl font-extrabold tracking-tight text-content mb-4"
            >
              Gestão de <span className="text-blue-600 dark:text-blue-500">Talentos</span>
            </motion.h1>
            <p className="text-lg text-content-muted leading-relaxed">
              Monitore o desenvolvimento e progresso técnico de todas as turmas em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-2 relative bg-surface/50 backdrop-blur-md p-1.5 rounded-[22px] border border-border-subtle shadow-sm self-end md:self-auto">
            <DarkModeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
            <div className="h-6 w-px bg-border-subtle mx-0.5" />
            <button 
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform shrink-0"
              onClick={handleToggleProfileMenu}
            >
              {loginEmail.charAt(0).toUpperCase()}
            </button>
            
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full mt-4 right-0 w-64 liquid-glass rounded-[28px] shadow-2xl overflow-hidden z-50 p-3"
                >
                  <div className="px-4 py-4 border-b border-white/5 mb-2">
                    <p className="text-xs font-bold text-content-muted uppercase tracking-widest mb-1">Logado como</p>
                    <p className="text-sm font-bold text-content truncate">{loginEmail}</p>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={handleOpenGlobalRepo}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-content hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <Upload className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                      Repositório Global
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-2xl transition-all group"
                    >
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      Encerrar Sessão
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main Global Card - Feature Bento Item */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={handleSelectGlobalStorage}
            className="md:col-span-8 bg-blue-600 dark:bg-blue-600 rounded-[38px] p-10 flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-blue-500/20 cursor-pointer overflow-hidden relative group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-white/20 transition-colors" />
            
            <div className="w-24 h-24 rounded-[32px] bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              <GraduationCap className="w-12 h-12" />
            </div>
            
            <div className="flex-1 text-center md:text-left z-10">
              <h3 className="text-3xl font-black text-white tracking-tight mb-3">Controle de Colaboradores</h3>
              <p className="text-blue-100 text-lg font-medium leading-relaxed max-w-lg mb-0">
                Acesse o dashboard unificado para monitorar a evolução técnica e horas de treinamento de toda a companhia.
              </p>
            </div>
            
            <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-white text-blue-600 self-end md:self-center">
              <ArrowLeft className="w-6 h-6 rotate-180" />
            </div>
          </motion.div>

          {/* Individual Classes Bento Grid */}
          <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-6">
            {CLASSES_LIST.slice(0, 2).map((cls, idx) => (
              <BentoClassCard key={cls.id} cls={cls} idx={idx} onClick={() => handleSelectClass(cls.id)} />
            ))}
          </div>

          <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
             {CLASSES_LIST.slice(2).map((cls, idx) => (
              <BentoClassCard key={cls.id} cls={cls} idx={idx + 2} onClick={() => handleSelectClass(cls.id)} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BentoClassCard({ cls, idx, onClick }: { cls: any, idx: number, onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 + idx * 0.05, type: 'spring' }}
      whileHover={{ y: -8, scale: 1.02 }}
      onClick={onClick}
      className="bg-surface rounded-[38px] p-6 sm:p-8 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-border-subtle hover:border-blue-500/50 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className={`w-14 h-14 rounded-[22px] ${cls.color} flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-current/20 shrink-0`}>
          {cls.letter}
        </div>
        <div className="flex -space-x-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-9 h-9 rounded-full bg-background border-4 border-surface flex items-center justify-center overflow-hidden ring-1 ring-black/5">
              <UserIcon className="w-4 h-4 text-emerald-500" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <h3 className="text-xl font-extrabold text-content tracking-tight mb-1 group-hover:text-blue-600 transition-colors uppercase">{cls.name}</h3>
        <p className="text-sm font-bold text-content-muted leading-none">
          {cls.students} <span className="font-medium opacity-70">colaboradores ativos</span>
        </p>
      </div>
    </motion.div>
  );
}
