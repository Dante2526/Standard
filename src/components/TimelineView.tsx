import { motion } from 'motion/react';
import { Plus } from 'lucide-react';

interface TimelineViewProps {
  progressHours: number;
  totalHours: number;
  milestoneEvaluations: Record<number, { comment: string, inspector: string }>;
  isAdmin: boolean;
  setEditingMilestone: (v: number | null) => void;
}

export default function TimelineView({
  progressHours,
  totalHours,
  milestoneEvaluations,
  isAdmin,
  setEditingMilestone
}: TimelineViewProps) {
  const milestones = [
    { hours: 0, color: '#3b82f6', label: 'Início' },
    { hours: 100, color: '#22c55e', label: 'Marco 1', comment: milestoneEvaluations[100]?.comment || '', inspector: milestoneEvaluations[100]?.inspector || '' },
    { hours: 200, color: '#f97316', label: 'Marco 2', comment: milestoneEvaluations[200]?.comment || '', inspector: milestoneEvaluations[200]?.inspector || '' },
    { hours: 300, color: '#a855f7', label: 'Marco 3', comment: milestoneEvaluations[300]?.comment || '', inspector: milestoneEvaluations[300]?.inspector || '' },
    { hours: 432, color: '#10b981', label: 'Conclusão', comment: milestoneEvaluations[432]?.comment || '', inspector: milestoneEvaluations[432]?.inspector || '' }
  ];

  const currentMilestone = [...milestones].reverse().find(m => progressHours >= m.hours);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-[28px] p-6 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.04)] max-w-7xl mx-auto overflow-hidden"
    >
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <h2 className="text-lg font-semibold text-content max-md:text-center">Progresso do Treinamento</h2>
        <div className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-medium max-md:h-[35px] max-md:w-[105px] max-md:px-0 max-md:py-0 max-md:flex max-md:items-center max-md:justify-center max-md:text-center">
          {progressHours}h / {totalHours}h
        </div>
      </div>

      <div className="relative h-[800px] md:h-[350px] mt-8 mb-16 max-w-2xl md:max-w-full mx-auto w-full overflow-visible">
        <div className="absolute inset-0 md:left-[70px] md:right-[70px]">
          <style>{`
            .progress-line-anim {
              height: ${Math.min((progressHours / totalHours) * 100, 100)}%;
              width: 0.375rem;
            }
            .progress-tip-anim {
              top: calc(${Math.min((progressHours / totalHours) * 100, 100)}% - 6px);
              left: 50%;
              transform: translateX(-50%);
            }
            @media (min-width: 768px) {
              .progress-line-anim {
                height: 0.375rem;
                width: ${Math.min((progressHours / totalHours) * 100, 100)}%;
              }
              .progress-tip-anim {
                top: 50%;
                left: calc(${Math.min((progressHours / totalHours) * 100, 100)}% - 6px);
                transform: translateY(-50%);
              }
            }
          `}</style>

          {/* Background Line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1.5 bg-border-subtle rounded-full md:top-1/2 md:-translate-y-1/2 md:left-0 md:right-0 md:h-1.5 md:w-full md:translate-x-0"></div>
          
          {/* Progress Line */}
          <div 
            className="progress-line-anim absolute left-1/2 -translate-x-1/2 top-0 bg-blue-500 rounded-full origin-top md:top-1/2 md:-translate-y-1/2 md:left-0 md:origin-left md:translate-x-0 transition-all duration-[2000ms] ease-in-out"
          ></div>

          {/* Glowing Tip */}
          <div
            className="progress-tip-anim absolute w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_12px_4px_rgba(59,130,246,0.6)] z-20 transition-all duration-[2000ms] ease-in-out flex items-center justify-center"
            style={{ opacity: progressHours > 0 && progressHours < totalHours ? 1 : 0 }}
          >
            {/* Percentage Label */}
            <div className="absolute top-1/2 left-full -translate-y-1/2 ml-3 md:left-1/2 md:-translate-x-1/2 md:top-full md:mt-3 md:ml-0 whitespace-nowrap">
              <div className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xl border border-white/20">
                {Math.round((progressHours / totalHours) * 100)}%
              </div>
            </div>
          </div>

          {/* Milestones */}
          {milestones.map((milestone, index) => {
            const isReached = progressHours >= milestone.hours;
            const percentage = (milestone.hours / totalHours) * 100;
            const reachTime = progressHours > 0 ? (milestone.hours / progressHours) * 2 : 0;
            const shouldAnimate = isReached && progressHours > 0 && milestone.hours > 0;
            const isActive = currentMilestone?.hours === milestone.hours && progressHours < totalHours;
            
            return (
              <div key={milestone.hours}>
                <style>{`
                  .milestone-${index} {
                    top: ${percentage}%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                  }
                  @media (min-width: 768px) {
                    .milestone-${index} {
                      top: 50%;
                      left: ${percentage}%;
                    }
                  }
                `}</style>
                <div className={`milestone-${index} absolute flex items-center justify-center z-10`}>
                  
                  {/* Center: Dot */}
                  <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                    <div className="absolute inset-0 rounded-full border-4 border-surface bg-border-subtle shadow-sm"></div>
                    
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-surface shadow-sm"
                      initial={{ backgroundColor: '#e5e7eb', scale: 0.5, opacity: 0 }}
                      animate={{
                        backgroundColor: isReached ? milestone.color : '#e5e7eb',
                        scale: isReached ? 1 : 0.5,
                        opacity: isReached ? 1 : 0
                      }}
                      transition={{
                        duration: 0.4,
                        delay: shouldAnimate ? reachTime : 0,
                        ease: "easeOut"
                      }}
                    />

                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: milestone.color }}
                        initial={{ scale: 1, opacity: 0.8 }}
                        animate={{ scale: 1.8, opacity: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                  </div>

                  {/* Comment Box */}
                  {(milestone.comment || (isAdmin && milestone.hours > 0)) && (
                    <div className="absolute right-full top-1/2 -translate-y-1/2 pr-4 w-[140px] sm:w-[180px] md:right-auto md:left-1/2 md:-translate-x-1/2 md:translate-y-0 md:top-full md:pt-6 md:pr-0 md:w-[140px] z-20">
                      <motion.div 
                        onClick={() => isAdmin && setEditingMilestone(milestone.hours)}
                        className={`bg-background border border-border-subtle p-3 rounded-2xl text-center relative shadow-sm ${isAdmin ? 'cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group/card' : ''}`}
                        initial={{ opacity: 0.5, scale: 0.9 }}
                        animate={{
                          opacity: isReached ? 1 : 0.4,
                          scale: isReached ? 1 : 0.9
                        }}
                        transition={{
                          duration: 0.4,
                          delay: shouldAnimate ? reachTime : 0,
                          ease: "easeOut"
                        }}
                      >
                        {isAdmin && (
                          <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-1 rounded-full opacity-0 group-hover/card:opacity-100 transition-opacity shadow-sm">
                            <Plus className="w-3 h-3" />
                          </div>
                        )}
                        
                        <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-gray-50 md:hidden"></div>
                        <div className="hidden md:block absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent -top-2 border-b-[8px] border-b-gray-50"></div>
                        
                        <p className="text-[10px] text-content-muted font-bold mb-1 uppercase tracking-wider">Avaliação do Inspetor</p>
                        <p className={`text-xs leading-relaxed ${isReached ? 'text-content' : 'text-content-muted'} mb-2`}>
                          {milestone.comment || (isAdmin ? "Adicionar avaliação..." : "")}
                        </p>
                        {milestone.comment && milestone.inspector && (
                          <div className="flex justify-center">
                            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-100 uppercase tracking-tight">
                              {milestone.inspector}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  )}

                  {/* Label */}
                  <div className="absolute left-full top-1/2 -translate-y-1/2 pl-4 md:left-1/2 md:-translate-x-1/2 md:translate-y-0 md:bottom-full md:pb-6 md:top-auto md:pl-0 text-left md:text-center w-[100px] sm:w-max z-20">
                    <motion.div 
                      className="bg-surface/80 backdrop-blur-sm py-1 px-2 rounded-md"
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: isReached ? 1 : 0.5 }}
                      transition={{
                        duration: 0.4,
                        delay: shouldAnimate ? reachTime : 0,
                        ease: "easeOut"
                      }}
                    >
                      <div className="flex flex-col items-start md:items-center">
                        <p className="text-sm font-bold transition-colors duration-300 whitespace-nowrap" style={{ color: isReached ? '#ffffff' : '#9ca3af' }}>
                          {milestone.label}
                        </p>
                        <p className="text-xs text-content-muted whitespace-nowrap">{milestone.hours} horas</p>
                      </div>
                    </motion.div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
