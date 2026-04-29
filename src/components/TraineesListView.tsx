import { memo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User as UserIcon, Check, GraduationCap, LayoutGrid, Network, Trophy } from 'lucide-react';
import { Trainee } from '../types';
import Footer from './Footer';
import DelayedTrainingsColmeia from './DelayedTrainingsColmeia';
import KaizenRankingView from './KaizenRankingView';
import { useDelayedTrainings } from '../hooks/useDelayedTrainings';
import { useKaizenRanking } from '../hooks/useKaizenRanking';

interface TraineesListViewProps {
  selectedClass: string | null;
  isLoading: boolean;
  trainees: Trainee[];
  onBack: () => void;
  onSelectTrainee: (trainee: Trainee) => void;
}

const TraineeSkeleton = () => (
  <div className="bg-surface rounded-[24px] p-5 border border-border-subtle animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-alt" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-surface-alt rounded" />
          <div className="h-3 w-20 bg-surface-alt rounded" />
        </div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between">
        <div className="h-3 w-12 bg-surface-alt rounded" />
        <div className="h-3 w-8 bg-surface-alt rounded" />
      </div>
      <div className="h-1.5 w-full bg-surface-alt rounded-full" />
    </div>
  </div>
);

const TraineesListView = memo(({
  selectedClass,
  isLoading,
  trainees,
  onBack,
  onSelectTrainee
}: TraineesListViewProps) => {

  const scrollToLetter = (letter: string) => {
    const firstTrainee = trainees.find(t => t.name.toUpperCase().startsWith(letter));
    if (firstTrainee) {
      const element = document.getElementById(`trainee-card-${firstTrainee.id}`);
      if (element) {
        const yOffset = -100; 
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({top: y, behavior: 'smooth'});
      }
    }
  };

  const tabStorageKey = `trainees_active_tab_${selectedClass || ''}`;
  const [activeTab, setActiveTabState] = useState<'grid' | 'colmeia' | 'kaizen'>(() => {
    const saved = sessionStorage.getItem(tabStorageKey);
    if (saved === 'grid' || saved === 'colmeia' || saved === 'kaizen') return saved;
    return 'grid';
  });

  const setActiveTab = (tab: 'grid' | 'colmeia' | 'kaizen') => {
    setActiveTabState(tab);
    sessionStorage.setItem(tabStorageKey, tab);
  };
  const { delayedMap, isLoading: isLoadingDelayed } = useDelayedTrainings(activeTab === 'colmeia' ? trainees : []);
  const { ranking: kaizenRanking, isLoading: isLoadingKaizen } = useKaizenRanking(activeTab === 'kaizen' ? trainees : []);

  return (
    <motion.div 
      key="trainees"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pt-12"
    >
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-border-subtle rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-content-muted" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-content">
                {selectedClass === 'global-estagio' ? 'Controle de Colaboradores' : 'Colaboradores'}
              </h1>
              <p className="text-content-muted capitalize">
                {selectedClass === 'global-estagio' ? 'Todos os colaboradores cadastrados' : selectedClass}
              </p>
            </div>
          </div>
        </div>

        {/* --- Abas de Navegação --- */}
        {!isLoading && trainees.length > 0 && selectedClass !== 'global-estagio' && (
          <div className="grid grid-cols-2 md:flex md:flex-row gap-2 mb-8">
            <button
              onClick={() => setActiveTab('grid')}
              className={`col-span-1 px-2 md:px-6 py-2.5 rounded-[18px] text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                activeTab === 'grid' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-surface border border-border-subtle text-content-muted hover:bg-background'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('colmeia')}
              className={`col-span-1 px-2 md:px-6 py-2.5 rounded-[18px] text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                activeTab === 'colmeia' 
                  ? 'bg-red-600 text-white shadow-md shadow-red-500/20' 
                  : 'bg-surface border border-border-subtle text-content-muted hover:bg-background'
              }`}
            >
              <Network className="w-4 h-4" />
              Visão de Pendências
            </button>
            <div className="col-span-2 flex justify-center md:contents">
              <button
                onClick={() => setActiveTab('kaizen')}
                className={`w-full md:w-auto px-6 py-2.5 rounded-[18px] text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                  activeTab === 'kaizen' 
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' 
                    : 'bg-surface border border-border-subtle text-content-muted hover:bg-background'
                }`}
              >
                <Trophy className="w-4 h-4" />
                Ranking Kaizen
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="lg:order-2 w-full lg:w-8 h-[400px] bg-surface rounded-2xl border border-border-subtle animate-pulse hidden lg:block" />
            <div className="lg:order-1 flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {[1, 2, 3, 4, 5, 6].map(i => <TraineeSkeleton key={i} />)}
            </div>
          </div>
        ) : trainees.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-[32px] border border-border-subtle shadow-inner">
            <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-4">
               <UserIcon className="w-8 h-8 text-content-muted/30" />
            </div>
            <p className="text-content-muted font-bold uppercase tracking-widest text-xs opacity-50">Nenhum colaborador encontrado nesta turma</p>
          </div>
        ) : activeTab === 'colmeia' ? (
          <DelayedTrainingsColmeia 
            trainees={trainees} 
            delayedMap={delayedMap} 
            isLoading={isLoadingDelayed} 
            onSelectTrainee={onSelectTrainee} 
          />
        ) : activeTab === 'kaizen' ? (
          <KaizenRankingView
            ranking={kaizenRanking}
            isLoading={isLoadingKaizen}
            onSelectTrainee={onSelectTrainee}
          />
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 relative items-start">
            <div className="lg:order-2 lg:sticky lg:top-8 flex lg:flex-col flex-wrap justify-center gap-1 p-2 bg-surface rounded-2xl border border-border-subtle shadow-sm z-10 w-full lg:w-auto">
              {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(letter => {
                const hasTrainees = trainees.some(t => t.name.toUpperCase().startsWith(letter));
                return (
                  <button
                    key={letter}
                    onClick={() => scrollToLetter(letter)}
                    disabled={!hasTrainees}
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      hasTrainees 
                        ? 'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 cursor-pointer' 
                        : 'text-content-muted/30 cursor-not-allowed'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>

            <div className="lg:order-1 flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {trainees.map((trainee, index) => (
                <motion.div
                  key={trainee.id}
                  id={`trainee-card-${trainee.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelectTrainee(trainee)}
                  className="bg-surface rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-border-subtle"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-content">{trainee.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-content-muted">Mat: {trainee.matricula}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {trainee.status !== 'none' && (
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1 ${
                                trainee.status === 'active' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-emerald-500 text-white'
                              }`}>
                                {trainee.status === 'active' ? (
                                  <>ESTÁGIO</>
                                ) : (
                                  <>
                                    <Check className="w-3 h-3 stroke-[4px]" />
                                    EFETIVADO
                                  </>
                                )}
                              </span>
                            )}
                            {selectedClass === 'global-estagio' && trainee.turma && (
                              <span className="text-[9px] font-black px-2.5 py-1 rounded-full shadow-sm bg-surface-muted text-content-muted border border-border-subtle inline-flex items-center justify-center leading-none">
                                TURMA {trainee.turma}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-content-muted font-medium">Progresso</span>
                      <span className="text-content font-bold">{trainee.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-border-subtle rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          trainee.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${trainee.progress}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mt-12 mb-8">
        <Footer />
      </div>
    </motion.div>
  );
});

export default TraineesListView;
