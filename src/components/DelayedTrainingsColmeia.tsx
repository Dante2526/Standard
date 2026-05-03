import { memo } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, AlertCircle, CalendarClock, ChevronRight } from 'lucide-react';
import { Trainee } from '../types';

interface DelayedTrainingsColmeiaProps {
  trainees: Trainee[];
  delayedMap: Record<string, any[]>;
  isLoading: boolean;
  onSelectTrainee: (trainee: Trainee) => void;
}

const DelayedTrainingsColmeia = memo(({
  trainees,
  delayedMap,
  isLoading,
  onSelectTrainee
}: DelayedTrainingsColmeiaProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        <p className="text-content-muted font-bold tracking-widest uppercase text-xs animate-pulse">Analisando pendências da turma...</p>
      </div>
    );
  }

  // Filtrar apenas colaboradores que POSSUEM treinamentos pendentes
  const traineesWithDelays = trainees.filter(t => delayedMap[t.matricula] && delayedMap[t.matricula].length > 0);

  if (traineesWithDelays.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-20 bg-emerald-500/5 rounded-[32px] border border-emerald-500/20 shadow-inner"
      >
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-black text-content uppercase tracking-tight mb-2">Turma em Dia!</h3>
        <p className="text-content-muted font-medium max-w-md mx-auto">
          Nenhum colaborador desta turma possui pendências na base global.
        </p>
      </motion.div>
    );
  }

  const scrollToLetter = (letter: string) => {
    const firstTrainee = traineesWithDelays.find(t => t.name.toUpperCase().startsWith(letter));
    if (firstTrainee) {
      // Procura o ID do cartão interno do usuário para rolar exatamente até o nome
      const element = document.getElementById(`trainee-colmeia-inner-${firstTrainee.id}`);
      if (element) {
        // Reduz o offset para centralizar melhor a visualização
        const yOffset = -150; 
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({top: y, behavior: 'smooth'});
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative items-start">
      {/* Alphabetical Sidebar */}
      <div className="lg:order-2 lg:sticky lg:top-8 flex lg:flex-col flex-wrap justify-center gap-1 p-2 bg-surface rounded-2xl border border-border-subtle shadow-sm z-10 w-full lg:w-auto">
        {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(letter => {
          const hasTrainees = traineesWithDelays.some(t => t.name.toUpperCase().startsWith(letter));
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

      <div className="lg:order-1 flex-1 space-y-12 w-full">
        {traineesWithDelays.map((trainee, index) => {
          const delays = delayedMap[trainee.matricula];
          
          return (
            <motion.div 
              key={trainee.id}
              id={`trainee-colmeia-${trainee.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
            {/* Mindmap Layout Container */}
            <div className="flex flex-col md:flex-row items-stretch gap-0">
              
              {/* Parent Node (Trainee) */}
              <div className="relative z-10 md:w-1/3 flex-shrink-0 flex items-center">
                <div 
                  id={`trainee-colmeia-inner-${trainee.id}`}
                  onClick={() => onSelectTrainee(trainee)}
                  className="w-full bg-surface p-6 rounded-[24px] border-2 border-red-500/20 hover:border-red-500/50 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <UserIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-content text-lg leading-tight group-hover:text-red-600 transition-colors">{trainee.name}</h3>
                      <p className="text-xs font-bold text-content-muted mt-1 uppercase tracking-widest">{trainee.matricula}</p>
                      <div className="mt-3 flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-black px-2.5 py-1 rounded-lg w-max">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {delays.length} PENDÊNCIAS
                      </div>
                    </div>
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity md:hidden">
                    <ChevronRight className="w-5 h-5 text-red-500" />
                  </div>
                </div>
              </div>

              {/* Connectors & Children Nodes (Delays) */}
              <div className="relative mt-6 md:mt-0 md:ml-12 flex-1 flex flex-col justify-center gap-4">
                
                {/* SVG Connections (Desktop Only) */}
                <div className="hidden md:block absolute left-[-48px] top-0 bottom-0 w-12 pointer-events-none">
                   <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
                     {delays.map((_, i) => {
                       const total = delays.length;
                       const spacing = 100 / total;
                       const yPos = (spacing / 2) + (i * spacing);
                       
                       return (
                         <path 
                           key={i}
                           d={`M 0 50 C 50 50, 50 ${yPos}, 100 ${yPos}`} 
                           fill="none" 
                           stroke="rgba(239, 68, 68, 0.4)" 
                           strokeWidth="2"
                           strokeDasharray="4 4"
                           vectorEffect="non-scaling-stroke"
                         />
                       );
                     })}
                   </svg>
                </div>

                {/* Mobile Connection Line */}
                <div className="md:hidden absolute left-8 top-[-24px] bottom-8 w-0.5 bg-red-500/20 border-l-2 border-dashed border-red-500/30" />

                {delays.map((delay, dIndex) => {
                  const isAtrasado = delay.daysRemaining < 0;
                  
                  return (
                    <motion.div 
                      key={dIndex}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (index * 0.1) + (dIndex * 0.05) }}
                      className="relative md:ml-0 ml-16"
                    >
                      {/* Mobile Horizontal Connector */}
                      <div className="md:hidden absolute left-[-32px] top-1/2 w-8 border-t-2 border-dashed border-red-500/30" />

                      <div className={`bg-surface p-4 rounded-2xl border ${isAtrasado ? 'border-red-200' : 'border-border-subtle'} shadow-sm hover:shadow-md hover:border-red-500/30 transition-all`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-content text-sm leading-snug">{delay.title}</h4>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                              {isAtrasado ? (
                                <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">
                                  <CalendarClock className="w-3.5 h-3.5" />
                                  {Math.abs(delay.daysRemaining)} dias em atraso
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  Vence em {delay.daysRemaining} dias
                                </span>
                              )}
                              
                              {delay.date && delay.date !== 'Sem data' && (
                                <span className="text-xs text-content-muted font-medium">
                                  Prazo: {delay.date}
                                </span>
                              )}
                              {delay.modality && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                                  delay.modality === 'Online' ? 'bg-blue-50 text-blue-600' : 
                                  delay.modality === 'OJT' ? 'bg-purple-50 text-purple-600' :
                                  'bg-indigo-50 text-indigo-600'
                                }`}>
                                  {delay.modality}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

              </div>
            </div>
          </motion.div>
        );
      })}
      </div>
    </div>
  );
});

export default DelayedTrainingsColmeia;
