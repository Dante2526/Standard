import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, ArrowLeft, User as UserIcon, GraduationCap,
  X, Eraser, FileText, UserPlus, ListOrdered, Hourglass, 
  Clock, PauseCircle, HelpCircle, LogOut, Users, ExternalLink 
} from 'lucide-react';
import { collection, getDocs, getDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db, newDb } from '../firebase';
import DarkModeToggle from './DarkModeToggle';
import { Trainee } from '../types';
import Footer from './Footer';

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
  { id: 'turma a', name: 'TURMA A', letter: 'A', gradient: 'from-[#3b82f6] to-[#2563eb]', shadow: 'shadow-blue-500/30', iconColor: 'text-blue-500' },
  { id: 'turma b', name: 'TURMA B', letter: 'B', gradient: 'from-[#10b981] to-[#059669]', shadow: 'shadow-emerald-500/30', iconColor: 'text-emerald-500' },
  { id: 'turma c', name: 'TURMA C', letter: 'C', gradient: 'from-[#f97316] to-[#ea580c]', shadow: 'shadow-orange-500/30', iconColor: 'text-orange-500' },
  { id: 'turma d', name: 'TURMA D', letter: 'D', gradient: 'from-[#ef4444] to-[#dc2626]', shadow: 'shadow-red-500/30', iconColor: 'text-red-500' },
];

const BentoClassCard = memo(({ cls, idx, onClick }: { cls: any, idx: number, onClick: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ y: -8, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-surface relative overflow-hidden rounded-[40px] p-7 sm:p-9 flex flex-col shadow-[0_12px_40px_rgba(0,0,0,0.03)] dark:shadow-none border border-border-subtle hover:border-blue-500/40 transition-all cursor-pointer group"
    >
      {/* Background Decorator */}
      <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${cls.gradient} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rounded-full blur-2xl`} />

      <div className="flex items-start justify-between mb-10 relative z-10">
        <div className="relative">
          {/* Outer Glow */}
          <div className={`absolute inset-0 bg-gradient-to-br ${cls.gradient} blur-xl opacity-40 group-hover:opacity-60 transition-opacity`} />
          
          <div className={`relative w-16 h-16 rounded-[24px] bg-gradient-to-br ${cls.gradient} flex items-center justify-center text-white shadow-xl ${cls.shadow} border border-white/20 shrink-0`}>
             <div className="flex flex-col items-center leading-none">
                <span className="text-2xl font-black">{cls.letter}</span>
                <Users className="w-3.5 h-3.5 mt-0.5 opacity-80" />
             </div>
          </div>
        </div>

        <div className="flex -space-x-3.5 pt-2">
          {[1, 2, 3].map((i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -4, zIndex: 10 }}
              className="w-10 h-10 rounded-full bg-background border-[3px] border-surface flex items-center justify-center overflow-hidden shadow-sm transition-transform"
            >
              <UserIcon className={`w-4.5 h-4.5 ${cls.iconColor} opacity-80`} />
            </motion.div>
          ))}
          <div className="w-10 h-10 rounded-full bg-background border-[3px] border-surface flex items-center justify-center text-[10px] font-black text-content-muted shadow-sm">
            +{Math.max(0, cls.students - 3)}
          </div>
        </div>
      </div>

      <div className="mt-auto relative z-10">
        <h3 className="text-xl font-extrabold text-content tracking-tight mb-1 group-hover:text-blue-600 transition-colors uppercase">{cls.name}</h3>
        <p className="text-sm font-bold text-content-muted leading-none">
          {cls.students} <span className="font-medium opacity-70">colaboradores ativos</span>
        </p>
      </div>
    </motion.div>
  );
});

const AdminClassesView = memo(({
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
}: AdminClassesViewProps) => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [webLinks, setWebLinks] = useState<{ kaizen?: string; treinamento?: string }>({});
  const [webLinksError, setWebLinksError] = useState<string | null>(null);

  useEffect(() => {
    // Busca os links da coleção 'web' em tempo real no banco NOVO
    const unsubLinks = onSnapshot(collection(newDb, 'web'), (snap) => {
      if (snap.empty) return;
      const links: { kaizen?: string; treinamento?: string } = {};
      snap.docs.forEach(d => {
        const data = d.data();
        const id = d.id.toLowerCase();
        if (data.kaizen) links.kaizen = data.kaizen;
        if (data.treinamento) links.treinamento = data.treinamento;
        if (id === 'kaizen' && typeof data.link === 'string') links.kaizen = data.link;
        if (id === 'treinamento' && typeof data.link === 'string') links.treinamento = data.link;
        Object.keys(data).forEach(key => {
          const k = key.toLowerCase();
          if (k.includes('kaizen') && !links.kaizen) links.kaizen = data[key];
          if (k.includes('treinamento') && !links.treinamento) links.treinamento = data[key];
        });
      });
      setWebLinks(links);
    }, (err) => {
      console.error("Erro no newDb:", err);
      setWebLinksError(err.message);
    });

    // Busca também no banco ANTIGO
    const unsubLinksOld = onSnapshot(collection(db, 'web'), (snap) => {
      if (snap.empty) return;
      const links: { kaizen?: string; treinamento?: string } = {};
      snap.docs.forEach(d => {
        const data = d.data();
        const id = d.id.toLowerCase();
        if (data.kaizen) links.kaizen = data.kaizen;
        if (data.treinamento) links.treinamento = data.treinamento;
        if (id === 'kaizen' && typeof data.link === 'string') links.kaizen = data.link;
        if (id === 'treinamento' && typeof data.link === 'string') links.treinamento = data.link;
        Object.keys(data).forEach(key => {
          const k = key.toLowerCase();
          if (k.includes('kaizen') && !links.kaizen) links.kaizen = data[key];
          if (k.includes('treinamento') && !links.treinamento) links.treinamento = data[key];
        });
      });
      setWebLinks(prev => ({ ...prev, ...links }));
    }, (err) => {
      console.error("Erro no db antigo:", err);
      setWebLinksError(err.message);
    });

    const q = query(collection(newDb, 'estagios'), where('status', '==', 'estagio'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const newCounts: Record<string, number> = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
      snap.docs.forEach(d => {
        const data = d.data();
        const turma = (data.turma || '').toUpperCase().trim();
        const letter = turma.includes('TURMA') ? turma.split(' ').pop() : turma;
        if (letter && newCounts[letter] !== undefined) {
          newCounts[letter]++;
        }
      });
      setCounts(newCounts);
    }, (error) => {
      console.error("Erro na sincronização de contagens:", error);
    });

    return () => {
      unsubLinks();
      unsubLinksOld();
      unsubscribe();
    };
  }, []);

  const handleSelectGlobalStorage = () => {
    setSelectedClass('global-estagio');
  };

  const handleSelectClass = (clsId: string) => {
    setSelectedClass(clsId);
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
              <BentoClassCard 
                key={cls.id} 
                cls={{ ...cls, students: counts[cls.letter] || 0 }} 
                idx={idx} 
                onClick={() => handleSelectClass(cls.id)} 
              />
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

              <div className="flex flex-col gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-content-muted uppercase tracking-widest ml-1 opacity-50">Ferramentas</p>
                  <button 
                    onClick={() => { handleOpenGlobalRepo(); handleToggleProfileMenu(); }}
                    className="w-full py-4 bg-gradient-to-br from-[#14b8a6] to-[#0d9488] hover:from-[#0d9488] hover:to-[#0f766e] rounded-2xl flex items-center justify-center gap-3 text-white font-black text-sm uppercase transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-teal-500/30 border border-white/10"
                  >
                    <Upload className="w-6 h-6"/> Atualizar Dados
                  </button>
                </div>

                {(webLinks.treinamento || webLinks.kaizen) ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-content-muted uppercase tracking-widest ml-1 opacity-50">Links Externos</p>
                    <div className="grid grid-cols-1 gap-3">
                      {webLinks.treinamento && (
                        <button 
                          onClick={() => window.open(webLinks.treinamento, '_blank')}
                          className="w-full py-4 bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] rounded-2xl flex items-center justify-center gap-3 text-white font-black text-sm uppercase transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/30 border border-white/10"
                        >
                          <GraduationCap className="w-6 h-6"/> Treinamento
                          <ExternalLink className="w-4 h-4 opacity-50" />
                        </button>
                      )}

                      {webLinks.kaizen && (
                        <button 
                          onClick={() => window.open(webLinks.kaizen, '_blank')}
                          className="w-full py-4 bg-gradient-to-br from-[#f59e0b] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] rounded-2xl flex items-center justify-center gap-3 text-white font-black text-sm uppercase transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-amber-500/30 border border-white/10"
                        >
                          <FileText className="w-6 h-6"/> Kaizen
                          <ExternalLink className="w-4 h-4 opacity-50" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 px-4 bg-background/50 rounded-2xl border border-dashed border-border-subtle flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-content-muted uppercase text-center opacity-40">
                      Buscando links na coleção 'web'...
                    </p>
                    {webLinksError && (
                      <p className="text-[9px] text-red-500 text-center font-bold">
                        ERRO: {webLinksError}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="pt-4 border-t border-border-subtle">
                  <button 
                    onClick={handleLogout} 
                    className="w-full py-4 bg-gradient-to-br from-[#ef4444] to-[#dc2626] hover:from-[#dc2626] hover:to-[#991b1b] rounded-2xl flex items-center justify-center gap-3 text-white font-black text-sm uppercase transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-red-500/30 border border-white/10"
                  >
                    <LogOut className="w-6 h-6"/> Encerrar Sessão
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-12">
        <Footer />
      </div>
    </motion.div>
  );
});
export default AdminClassesView;


