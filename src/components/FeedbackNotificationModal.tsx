import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ArrowRight } from 'lucide-react';
import { MilestoneEvaluation } from '../types';

export interface UnreadEvaluation extends MilestoneEvaluation {
  milestone: number;
}

interface FeedbackNotificationModalProps {
  unreadEvaluations: UnreadEvaluation[];
  onViewFeedback: () => void;
}

const FeedbackNotificationModal: React.FC<FeedbackNotificationModalProps> = ({
  unreadEvaluations,
  onViewFeedback
}) => {
  if (unreadEvaluations.length === 0) return null;

  const inspectors = Array.from(new Set(unreadEvaluations.map(ev => ev.inspector).filter(Boolean)));
  const count = unreadEvaluations.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-surface w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-border-subtle relative z-10 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

          <div className="flex justify-center mb-6 relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white flex items-center justify-center shadow-xl shadow-blue-500/30">
              <Bell className="w-8 h-8" />
            </div>
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center border-2 border-surface shadow-md">
              {count}
            </div>
          </div>
          
          <div className="text-center mb-8 relative z-10">
            <h3 className="text-2xl font-black text-content uppercase tracking-tight mb-2">
              Novo Feedback
            </h3>
            <p className="text-content-muted text-sm leading-relaxed">
              Você recebeu {count > 1 ? `${count} novas avaliações` : 'uma nova avaliação'} no seu treinamento prático.
              {inspectors.length > 0 && (
                <>
                  {' '}O inspetor <strong>{inspectors.join(', ')}</strong> deixou um comentário para você.
                </>
              )}
            </p>
          </div>
          
          <div className="flex gap-3 relative z-10">
            <button
              onClick={onViewFeedback}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black uppercase text-sm tracking-wider bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20 border border-white/10"
            >
              Ir para a Linha do Tempo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FeedbackNotificationModal;
