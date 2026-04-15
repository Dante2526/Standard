import { motion } from 'motion/react';
import { ArrowLeft, User as UserIcon } from 'lucide-react';
import { Trainee } from '../types';

interface TraineesListViewProps {
  selectedClass: string | null;
  isLoading: boolean;
  trainees: Trainee[];
  onBack: () => void;
  onSelectTrainee: (trainee: Trainee) => void;
}

export default function TraineesListView({
  selectedClass,
  isLoading,
  trainees,
  onBack,
  onSelectTrainee
}: TraineesListViewProps) {

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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : trainees.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-[24px] border border-border-subtle">
            <p className="text-content-muted">Nenhum colaborador encontrado.</p>
          </div>
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
                          {trainee.status !== 'none' && (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm ${
                              trainee.status === 'active' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-emerald-600 text-white'
                            }`}>
                              {trainee.status === 'active' ? 'ESTÁGIO' : 'EFETIVADO'}
                            </span>
                          )}
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
    </motion.div>
  );
}
