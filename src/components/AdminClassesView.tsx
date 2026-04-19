import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, ArrowLeft, User as UserIcon, GraduationCap,
  X, Eraser, FileText, UserPlus, ListOrdered, Hourglass, 
  Clock, PauseCircle, HelpCircle, LogOut 
} from 'lucide-react';
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
      // Carrega as turmas em paralelo para montar o mapa matrícula -> turma
      const turmaIds = ['turma a', 'turma b', 'turma c', 'turma d'];
      const turmaSnaps = await Promise.all(turmaIds.map(id => getDocs(collection(db, id))));
      const turmaMap: Record<string, string> = {};
      turmaSnaps.forEach((snap, idx) => {
        const letra = turmaIds[idx].split(' ').pop()!.toUpperCase();
        snap.docs.forEach(d => {
          const mat = d.data().matricula;
          if (mat) turmaMap[mat] = letra;
        });
      });

      const q = query(collection(newDb, 'estagios'), where('status', '==', 'estagio'));
      const snap = await getDocs(q);
      const traineesData = snap.docs.map(docSnapshot => {
        const data = docSnapshot.data() as any;
        const progressHours = (data.tableRows || []).reduce((acc: number, row: any) => acc + (parseFloat(row.duracao) || 0), 0);
        const calcProgress = data.status === 'efetivado' 
          ? 100 
          : Math.round((progressHours / 432) * 100);

        return {
          id: docSnapshot.id,
          name: data.nome || 'Sem Nome',
          matricula: data.matricula || '',
          funcao: data.funcao || 'Colaborador',
          progress: calcProgress,
          status: data.status === 'efetivado' ? 'completed' : 'active',
          turma: data.turma || turmaMap[data.matricula] || ''
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
        
        const progressHours = (stageData?.tableRows || []).reduce((acc: number, row: any) => acc + (parseFloat(row.duracao) || 0), 0);
        const calcProgress = stageData?.status === 'efetivado'
          ? 100
          : stageData
            ? Math.round((progressHours / 432) * 100)
            : 0;

        return {
          id: docSnapshot.id,
          name: data.nome || data.name || 'Sem Nome',
          matricula: data.matricula || '',
          funcao: data.funcao || '',
          email: data.email || '',
          progress: calcProgress,
          status: stageData?.status === 'efetivado' ? 'completed' : stageData?.status === 'estagio' ? 'active' : 'none',
          turma: clsId.split(' ').pop()?.toUpperCase() || ''
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

          <div className="flex items-center gap-2 relative z-50 bg-surface/50 backdrop-blur-md p-1.5 rounded-[22px] border border-border-subtle shadow-sm self-end md:self-auto">
            <DarkModeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
            <div className="h-6 w-px bg-border-subtle mx-0.5" />
            <button 
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform shrink-0"
              onClick={handleToggleProfileMenu}
            >
              {loginEmail.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main Global Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={handleSelectGlobalStorage}
            className="md:col-span-12 bg-blue-600 dark:bg-blue-600 rounded-[38px] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-blue-500/20 cursor-pointer overflow-hidden relative group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 dark:bg-black/20 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-white/20 transition-colors" />
            
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-[32px] bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              <GraduationCap className="w-10 h-10 md:w-12 md:h-12" />
            </div>
            
            <div className="flex-1 text-center md:text-left z-10">
              <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">Controle Geral</h3>
              <p className="text-blue-100 text-sm md:text-base font-medium leading-relaxed max-w-2xl mb-0">
                Dashboard unificado de evolução técnica e horas de treinamento.
              </p>
            </div>
            
            <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-white text-blue-600 self-end md:self-center">
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </div>
          </motion.div>



          {/* Combined Classes Grid - All classes normalized */}
          <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {CLASSES_LIST.map((cls, idx) => (
              <BentoClassCard key={cls.id} cls={cls} idx={idx} onClick={() => handleSelectClass(cls.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* Profile Modal - FORA do container para cobrir tela inteira */}
      <AnimatePresence>
        {isProfileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={handleToggleProfileMenu}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface rounded-[32px] shadow-2xl w-full max-w-[380px] p-8 relative flex flex-col border border-border-subtle mx-auto"
            >
              <button onClick={handleToggleProfileMenu} className="absolute top-6 right-6 text-content/20 hover:text-content transition-colors">
                <X className="w-6 h-6"/>
              </button>
              
              <h2 className="text-center text-lg font-black text-content uppercase tracking-wider mb-8 mt-2">
                Painel do Administrador
              </h2>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => { handleOpenGlobalRepo(); handleToggleProfileMenu(); }}
                  className="w-full py-4 bg-gradient-to-br from-[#14b8a6] to-[#0d9488] hover:from-[#0d9488] hover:to-[#0f766e] rounded-2xl flex items-center justify-center gap-3 text-white font-black text-sm uppercase transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-teal-500/30 border border-white/10"
                >
                  <Upload className="w-6 h-6"/> Atualizar Dados
                </button>
                
                <button 
                  onClick={handleLogout} 
                  className="w-full py-4 bg-gradient-to-br from-[#ef4444] to-[#dc2626] hover:from-[#dc2626] hover:to-[#991b1b] rounded-2xl flex items-center justify-center gap-3 text-white font-black text-sm uppercase transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-red-500/30 border border-white/10"
                >
                  <LogOut className="w-6 h-6"/> Encerrar Sessão
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
        <div className={`w-14 h-14 rounded-[22px] ${cls.color} flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-black/20 shrink-0`}>
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
