import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { MilestoneEvaluations } from '../types';

interface MilestoneEvaluationModalProps {
  milestone: number | null;
  onClose: () => void;
  evaluations: MilestoneEvaluations;
  onUpdate: (milestone: number, comment: string) => void;
}

const MilestoneEvaluationModal: React.FC<MilestoneEvaluationModalProps> = ({
  milestone,
  onClose,
  evaluations,
  onUpdate
}) => {
  if (milestone === null) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-surface w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-border-subtle relative z-10"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-content">Avaliação do Inspetor</h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-border-subtle rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-content-muted" />
            </button>
          </div>
          
          <p className="text-sm text-content-muted mb-4 font-medium">
            {milestone === 432 ? 'Conclusão do Treinamento' : `Marco de ${milestone} horas`}
          </p>
          
          <textarea
            autoFocus
            className="w-full bg-background border border-border-subtle rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm leading-relaxed mb-6"
            placeholder="Digite aqui a avaliação técnica..."
            value={evaluations[milestone]?.comment || ''}
            onChange={(e) => onUpdate(milestone, e.target.value)}
          />
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-content-muted hover:bg-border-subtle transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Salvar Avaliação
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MilestoneEvaluationModal;
