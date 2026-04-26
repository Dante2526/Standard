import { memo } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Lightbulb, CheckCircle2, User as UserIcon } from 'lucide-react';
import { Trainee } from '../types';
import { KaizenRankingItem } from '../hooks/useKaizenRanking';

interface KaizenRankingViewProps {
  ranking: KaizenRankingItem[];
  isLoading: boolean;
  onSelectTrainee: (trainee: Trainee) => void;
}

const KaizenRankingView = memo(({
  ranking,
  isLoading,
  onSelectTrainee
}: KaizenRankingViewProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-content-muted font-bold tracking-widest uppercase text-xs animate-pulse">Calculando ranking de Kaizen...</p>
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-20 bg-blue-500/5 rounded-[32px] border border-blue-500/20 shadow-inner"
      >
        <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lightbulb className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-black text-content uppercase tracking-tight mb-2">Sem Inovações</h3>
        <p className="text-content-muted font-medium max-w-md mx-auto">
          Nenhum colaborador desta turma possui Kaizens registrados na base global ainda.
        </p>
      </motion.div>
    );
  }

  const top3 = ranking.slice(0, 3);
  const others = ranking.slice(3);

  return (
    <div className="space-y-12">
      {/* Top 3 Podium Style */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          {top3.map((item, index) => {
            const isFirst = index === 0;
            const isSecond = index === 1;
            const isThird = index === 2;

            let bgColor = 'bg-surface';
            let borderColor = 'border-border-subtle';
            let iconColor = 'text-content-muted';
            let shadow = 'shadow-md';

            if (isFirst) {
              bgColor = 'bg-gradient-to-b from-yellow-500/10 to-surface';
              borderColor = 'border-yellow-500/40';
              iconColor = 'text-yellow-500';
              shadow = 'shadow-yellow-500/10 shadow-xl';
            } else if (isSecond) {
              bgColor = 'bg-gradient-to-b from-gray-300/10 to-surface';
              borderColor = 'border-gray-400/30';
              iconColor = 'text-gray-400';
            } else if (isThird) {
              bgColor = 'bg-gradient-to-b from-amber-700/10 to-surface';
              borderColor = 'border-amber-700/30';
              iconColor = 'text-amber-700';
            }

            return (
              <motion.div
                key={item.trainee.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onSelectTrainee(item.trainee)}
                className={`relative flex flex-col items-center text-center p-6 rounded-[32px] border-2 cursor-pointer transition-all hover:-translate-y-2 ${bgColor} ${borderColor} ${shadow} ${isFirst ? 'md:-mt-8' : ''}`}
              >
                {/* Badge */}
                <div className={`absolute -top-6 w-12 h-12 rounded-full flex items-center justify-center bg-background border-2 ${borderColor} ${iconColor}`}>
                  {isFirst ? <Trophy className="w-6 h-6" /> : <Medal className="w-6 h-6" />}
                </div>

                <div className="w-20 h-20 rounded-full bg-background/50 border border-border-subtle text-content-muted flex items-center justify-center mb-4 mt-4 overflow-hidden">
                  {item.trainee.avatar && /^https?:\/\//i.test(item.trainee.avatar) ? (
                    <img src={item.trainee.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-10 h-10" />
                  )}
                </div>

                <h3 className="font-black text-content text-lg leading-tight mb-1">{item.trainee.name}</h3>
                <p className="text-xs font-bold text-content-muted uppercase tracking-widest mb-6">{item.trainee.matricula}</p>

                <div className="w-full space-y-3 mt-auto">
                  <div className="flex justify-between items-center bg-background p-3 rounded-2xl border border-border-subtle">
                    <span className="text-[10px] uppercase font-bold text-content-muted tracking-widest">Total</span>
                    <span className="text-xl font-black text-content">{item.total}</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col items-center bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1" />
                      <span className="text-[10px] font-black text-emerald-600">{item.implementados}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
                      <Lightbulb className="w-4 h-4 text-blue-500 mb-1" />
                      <span className="text-[10px] font-black text-blue-600">{item.submetidos}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Others List */}
      {others.length > 0 && (
        <div className="bg-surface rounded-[32px] border border-border-subtle overflow-hidden">
          {others.map((item, index) => (
            <motion.div
              key={item.trainee.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + (index * 0.05) }}
              onClick={() => onSelectTrainee(item.trainee)}
              className="flex items-center gap-4 p-4 border-b border-border-subtle last:border-b-0 hover:bg-background/50 transition-colors cursor-pointer group"
            >
              <div className="w-8 text-center text-sm font-black text-content-muted group-hover:text-content transition-colors">
                {index + 4}º
              </div>
              
              <div className="w-12 h-12 rounded-full bg-background border border-border-subtle text-content-muted flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-content truncate group-hover:text-blue-500 transition-colors">{item.trainee.name}</h4>
                <p className="text-xs font-bold text-content-muted uppercase tracking-widest">{item.trainee.matricula}</p>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {item.implementados} imp.</span>
                  <span className="text-[10px] uppercase font-bold text-blue-600 flex items-center gap-1"><Lightbulb className="w-3 h-3"/> {item.submetidos} sub.</span>
                </div>
                <div className="bg-blue-50 text-blue-600 font-black text-lg px-4 py-2 rounded-xl">
                  {item.total}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
});

export default KaizenRankingView;
