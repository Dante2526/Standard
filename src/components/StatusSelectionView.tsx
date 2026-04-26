import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Briefcase, ArrowLeft } from 'lucide-react';
import Footer from './Footer';

interface StatusSelectionViewProps {
  currentStatus: 'estagio' | 'efetivado' | null;
  onStatusChange: (status: 'estagio' | 'efetivado', hours?: number) => void;
  isAdmin: boolean;
  onBack?: () => void;
}

const StatusSelectionView: React.FC<StatusSelectionViewProps> = React.memo(({
  currentStatus,
  onStatusChange,
  isAdmin,
  onBack
}) => {
  const [step, setStep] = React.useState<'status' | 'hours'>('status');


  if (step === 'hours') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[60vh] flex flex-col items-center justify-center p-6 relative w-full"
      >
        <button 
          onClick={() => setStep('status')}
          className="absolute top-0 left-0 p-3 hover:bg-surface rounded-2xl transition-colors flex items-center gap-2 group"
        >
          <ArrowLeft className="w-5 h-5 text-content-muted group-hover:text-content transition-colors" />
          <span className="text-sm font-bold text-content-muted group-hover:text-content transition-colors">Voltar</span>
        </button>

        <div className="max-w-2xl w-full text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-content uppercase tracking-tight mb-4">
            Horas Previstas
          </h1>
          <p className="text-content-muted text-lg">
            Selecione a carga horária do estágio para este colaborador.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
          <button
            onClick={() => onStatusChange('estagio', 432)}
            className="flex-1 group relative p-8 rounded-[32px] border border-border-subtle hover:border-blue-500/30 transition-all text-center bg-surface shadow-lg hover:shadow-xl hover:shadow-blue-500/10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <h3 className="text-4xl font-black text-content uppercase tracking-tight mb-2">432h</h3>
              <p className="text-content-muted font-medium">Carga horária padrão.</p>
            </div>
          </button>

          <button
            onClick={() => onStatusChange('estagio', 240)}
            className="flex-1 group relative p-8 rounded-[32px] border border-border-subtle hover:border-blue-500/30 transition-all text-center bg-surface shadow-lg hover:shadow-xl hover:shadow-blue-500/10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <h3 className="text-4xl font-black text-content uppercase tracking-tight mb-2">240h</h3>
              <p className="text-content-muted font-medium">Carga horária reduzida.</p>
            </div>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[60vh] flex flex-col items-center justify-center p-6 relative w-full"
    >
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-0 left-0 p-3 hover:bg-surface rounded-2xl transition-colors flex items-center gap-2 group"
        >
          <ArrowLeft className="w-5 h-5 text-content-muted group-hover:text-content transition-colors" />
          <span className="text-sm font-bold text-content-muted group-hover:text-content transition-colors">Voltar</span>
        </button>
      )}

      <div className="max-w-2xl w-full text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-content uppercase tracking-tight mb-4">
          Definir Situação do Colaborador
        </h1>
        <p className="text-content-muted text-lg">
          Selecione o status atual para adequar os formulários e métricas do painel.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-2xl">
        {/* Estágio Card */}
        <button
          onClick={() => setStep('hours')}
          className="flex-1 group relative p-8 rounded-[32px] border border-border-subtle hover:border-blue-500/30 transition-all text-left bg-surface shadow-lg hover:shadow-xl hover:shadow-blue-500/10 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white flex items-center justify-center mb-6 shadow-xl shadow-black/40 group-hover:scale-110 transition-transform">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black text-content uppercase tracking-tight mb-2">Estágio</h3>
            <p className="text-content-muted font-medium">Período de treinamento prático e avaliação de competências do colaborador em campo.</p>
          </div>
        </button>

        {/* Efetivado Card */}
        <button
          onClick={() => onStatusChange('efetivado')}
          className="flex-1 group relative p-8 rounded-[32px] border border-border-subtle hover:border-emerald-500/30 transition-all text-left bg-surface shadow-lg hover:shadow-xl hover:shadow-emerald-500/10 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] text-white flex items-center justify-center mb-6 shadow-xl shadow-black/40 group-hover:scale-110 transition-transform">
            <Briefcase className="w-8 h-8" />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black text-content uppercase tracking-tight mb-2">Efetivado</h3>
            <p className="text-content-muted font-medium">O colaborador concluiu seu ciclo de treinamento e é oficialmente membro da equipe operacional.</p>
          </div>
        </button>
      </div>
      <div className="mt-20">
        <Footer />
      </div>
    </motion.div>
  );
});

export default StatusSelectionView;
