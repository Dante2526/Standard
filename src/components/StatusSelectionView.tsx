import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Briefcase } from 'lucide-react';

interface StatusSelectionViewProps {
  currentStatus: 'estagio' | 'efetivado' | null;
  onStatusChange: (status: 'estagio' | 'efetivado') => void;
  isAdmin: boolean;
}

const StatusSelectionView: React.FC<StatusSelectionViewProps> = ({
  currentStatus,
  onStatusChange,
  isAdmin
}) => {
  if (!isAdmin) return null;

  return (
    <div className="mb-8">
      <h2 className="text-sm font-bold text-content-muted uppercase tracking-[0.15em] mb-4 pl-1">Situação do Colaborador</h2>
      <div className="flex gap-4">
        <button
          onClick={() => onStatusChange('estagio')}
          className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border transition-all ${
            currentStatus === 'estagio' 
              ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
              : 'bg-surface border-border-subtle text-content-muted hover:border-blue-100 hover:bg-blue-50/30'
          }`}
        >
          <div className={`p-2 rounded-xl ${currentStatus === 'estagio' ? 'bg-blue-600 text-white' : 'bg-background'}`}>
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold">Estágio</p>
            <p className="text-[10px] opacity-70">Período de treinamento</p>
          </div>
        </button>

        <button
          onClick={() => onStatusChange('efetivado')}
          className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border transition-all ${
            currentStatus === 'efetivado' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
              : 'bg-surface border-border-subtle text-content-muted hover:border-emerald-100 hover:bg-emerald-50/30'
          }`}
        >
          <div className={`p-2 rounded-xl ${currentStatus === 'efetivado' ? 'bg-emerald-600 text-white' : 'bg-background'}`}>
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold">Efetivado</p>
            <p className="text-[10px] opacity-70">Colaborador oficial</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default StatusSelectionView;
