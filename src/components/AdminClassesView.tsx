import { motion, AnimatePresence } from 'motion/react';
import { Upload, ArrowLeft, User as UserIcon, GraduationCap } from 'lucide-react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
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
      const snap = await getDocs(collection(newDb, 'estagios'));
      const traineesData = snap.docs.map(docSnapshot => {
        const data = docSnapshot.data() as any;
        return {
          id: docSnapshot.id,
          name: data.nome || 'Sem Nome',
          matricula: data.matricula || '',
          funcao: data.funcao || 'Colaborador',
          progress: Math.round((data.horasAcumuladas / 432) * 100),
          status: data.status === 'efetivado' ? 'completed' : data.status === 'estagio' ? 'active' : 'none'
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
          progress: stageData ? Math.round((stageData.horasAcumuladas / 432) * 100) : 0,
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pt-12"
    >
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-content">Colaboradores</h1>
            <p className="text-content-muted">Selecione uma turma para visualizar os colaboradores</p>
          </div>
          <div className="flex items-center gap-4 relative">
            <DarkModeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
            <button 
              className="aspect-square w-10 h-10 rounded-[12px] bg-blue-50/80 dark:bg-surface border border-blue-200 dark:border-border-subtle flex items-center justify-center shadow-sm hover:shadow hover:bg-blue-100 dark:hover:bg-border-subtle/50 transition-all text-blue-600 dark:text-blue-400 font-bold text-sm" 
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
                  className="absolute top-12 right-0 w-56 bg-surface border border-border-subtle rounded-2xl shadow-xl overflow-hidden z-50 p-2"
                >
                  <div className="px-3 pb-3 pt-1 border-b border-border-subtle mb-2">
                    <p className="text-sm font-semibold text-content truncate">{loginEmail}</p>
                    <p className="text-xs text-content-muted mt-0.5">Administrador</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={handleOpenGlobalRepo}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-content bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-800/50"
                    >
                      <Upload className="w-4 h-4 text-emerald-500" />
                      Repositório Global
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Sair
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 0.98 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSelectGlobalStorage}
            className="bg-surface rounded-[32px] p-8 flex flex-col items-center justify-center shadow-sm border border-blue-100 bg-blue-50/30 hover:shadow-md transition-all cursor-pointer md:col-span-2"
          >
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white mb-4 shadow-sm">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-content tracking-wide mb-1 text-center">Controle de Colaboradores</h3>
            <p className="text-sm text-content-muted mb-2 text-center max-w-md">
              Visualize o progresso de todos os colaboradores cadastrados no novo banco de dados.
            </p>
          </motion.div>

          {CLASSES_LIST.map((cls, index) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              whileHover={{ scale: 0.98 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectClass(cls.id)}
              className="bg-surface rounded-[32px] p-8 flex flex-col items-center justify-center shadow-sm border border-border-subtle hover:shadow-md transition-all cursor-pointer"
            >
              <div className={`w-16 h-16 rounded-full ${cls.color} flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-sm`}>
                {cls.letter}
              </div>
              <h3 className="text-lg font-bold text-content tracking-wide mb-1">{cls.name}</h3>
              <p className="text-sm text-content-muted mb-6">{cls.students} alunos</p>
              
              <div className="flex items-center justify-center -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-background border-2 border-surface flex items-center justify-center z-10">
                    <UserIcon className="w-4 h-4 text-green-500" />
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full bg-background border-2 border-surface flex items-center justify-center z-0 text-[10px] font-medium text-content-muted">
                  +{cls.students - 3}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
