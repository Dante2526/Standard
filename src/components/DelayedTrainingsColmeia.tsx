import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, AlertCircle, CalendarClock, ChevronRight, ChevronDown, Check } from 'lucide-react';
import { Trainee } from '../types';

interface DelayedTrainingsColmeiaProps {
  trainees: Trainee[];
  delayedMap: Record<string, any[]>;
  isLoading: boolean;
  onSelectTrainee: (trainee: Trainee) => void;
  onToggleManualStatus?: (matricula: string, title: string, completed: boolean) => void;
}

const DelayedTrainingsColmeia = memo(({
  trainees,
  delayedMap,
  isLoading,
  onSelectTrainee,
  onToggleManualStatus
}: DelayedTrainingsColmeiaProps) => {
  const [locallyCompleted, setLocallyCompleted] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleExpand = (traineeId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(traineeId)) {
        next.delete(traineeId);
      } else {
        next.add(traineeId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
        <p className="text-content-muted font-bold tracking-widest uppercase text-xs animate-pulse">Analisando pendências da turma...</p>
      </div>
    );
  }

  // Filtrar apenas colaboradores que POSSUEM treinamentos pendentes, excluindo os marcados localmente
  const traineesWithDelays = trainees.filter(t => {
    const delays = delayedMap[t.matricula] || [];
    const remaining = delays.filter(d => !locallyCompleted.has(`${t.matricula}::${d.title}`));
    return remaining.length > 0;
  });

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
      const element = document.getElementById(`trainee-colmeia-inner-${firstTrainee.id}`);
      if (element) {
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

      <div className="lg:order-1 flex-1 space-y-6 w-full">
        {traineesWithDelays.map((trainee, index) => {
          const allDelays = delayedMap[trainee.matricula];
          const delays = allDelays.filter(d => !locallyCompleted.has(`${trainee.matricula}::${d.title}`));
          const isExpanded = expandedCards.has(trainee.id);
          
          return (
            <motion.div 
              key={trainee.id}
              id={`trainee-colmeia-${trainee.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.5) }}
              className="relative"
            >
              {/* Mindmap Layout Container */}
              <div className="flex flex-col md:flex-row items-stretch gap-0">
                
                {/* Parent Node (Trainee) */}
                <div className={`relative z-10 flex-shrink-0 flex items-center transition-all duration-300 ${isExpanded ? 'md:w-1/3' : 'md:w-full'}`}>
                  <div 
                    id={`trainee-colmeia-inner-${trainee.id}`}
                    className={`w-full bg-surface p-5 rounded-[24px] border-2 ${isExpanded ? 'border-red-500/40 shadow-xl' : 'border-red-500/20 shadow-lg'} hover:border-red-500/50 hover:shadow-xl transition-all group`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Ícone do usuário - clica para ir ao perfil */}
                      <div 
                        onClick={() => onSelectTrainee(trainee)}
                        className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform cursor-pointer"
                        title="Ver perfil do colaborador"
                      >
                        <UserIcon className="w-7 h-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Nome - clica para ir ao perfil */}
                        <h3 
                          onClick={() => onSelectTrainee(trainee)}
                          className="font-black text-content text-lg leading-tight hover:text-red-600 transition-colors cursor-pointer truncate"
                        >
                          {trainee.name}
                        </h3>
                        <p className="text-xs font-bold text-content-muted mt-1 uppercase tracking-widest">{trainee.matricula}</p>
                        {/* Badge de pendências - clica para expandir a teia */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(trainee.id);
                          }}
                          className={`mt-3 flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-lg w-max transition-all ${
                            isExpanded 
                              ? 'bg-red-600 text-white shadow-md shadow-red-500/30' 
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          {delays.length} PENDÊNCIAS
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 hidden md:block ${isExpanded ? 'rotate-0' : ''}`} />
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 md:hidden ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connectors & Children Nodes (Delays) - Condicional à expansão */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ opacity: 0, scaleX: 0, originX: 0 }}
                      animate={{ opacity: 1, scaleX: 1, originX: 0 }}
                      exit={{ opacity: 0, scaleX: 0, originX: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="relative mt-6 md:mt-0 md:ml-12 flex-1 flex flex-col justify-center gap-4"
                    >
                      
                      {/* SVG Connections (Desktop Only) */}
                      <div className="hidden md:block absolute left-[-48px] top-0 bottom-0 w-12 pointer-events-none">
                         <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
                           {delays.map((_, i) => {
                             const total = delays.length;
                             const spacing = 100 / total;
                             const yPos = (spacing / 2) + (i * spacing);
                             
                             return (
                               <motion.path 
                                 key={i}
                                 d={`M 0 50 C 50 50, 50 ${yPos}, 100 ${yPos}`} 
                                 fill="none" 
                                 stroke="rgba(239, 68, 68, 0.4)" 
                                 strokeWidth="2"
                                 strokeDasharray="4 4"
                                 vectorEffect="non-scaling-stroke"
                                 initial={{ pathLength: 0 }}
                                 animate={{ pathLength: 1 }}
                                 transition={{ duration: 0.4, delay: i * 0.05 }}
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
                            transition={{ delay: dIndex * 0.05 }}
                            className="relative md:ml-0 ml-16"
                          >
                            {/* Mobile Horizontal Connector */}
                            <div className="md:hidden absolute left-[-32px] top-1/2 w-8 border-t-2 border-dashed border-red-500/30" />

                            <div className={`bg-surface p-4 rounded-2xl border ${isAtrasado ? 'border-red-200' : 'border-border-subtle'} shadow-sm hover:shadow-md hover:border-red-500/30 transition-all`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className="font-bold text-content text-sm leading-snug">{delay.title}</h4>
                                  {delay.code && (
                                    <span className="inline-block mt-1 text-[9px] bg-background border border-border-subtle text-content-muted font-black uppercase tracking-widest px-1.5 py-0.5 rounded font-mono">
                                      Cód: {delay.code}
                                    </span>
                                  )}
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
                                {onToggleManualStatus && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Remove imediatamente da lista (otimista)
                                      setLocallyCompleted(prev => new Set(prev).add(`${trainee.matricula}::${delay.title}`));
                                      // Salva no Firestore
                                      onToggleManualStatus(trainee.matricula, delay.title, true);
                                    }}
                                    className="shrink-0 w-8 h-8 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-content-muted hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-sm group/btn"
                                    title="Marcar como concluído"
                                  >
                                    <Check className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

export default DelayedTrainingsColmeia;
