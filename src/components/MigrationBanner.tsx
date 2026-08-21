import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, MapPin } from 'lucide-react';

const NEW_URL = 'https://standard-n.pages.dev';
const COUNTDOWN_SECONDS = 5;

export default function MigrationBanner() {
  const [count, setCount] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.replace(NEW_URL);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden">
      {/* Efeitos de fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[140px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[140px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 bg-surface border border-border-subtle rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center"
      >
        {/* Ícone */}
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/50 rounded-[24px] flex items-center justify-center mx-auto mb-8">
          <MapPin className="w-10 h-10 text-blue-600" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-black text-content uppercase tracking-tight mb-3">
          Mudamos de Endereço!
        </h1>

        {/* Descrição */}
        <p className="text-sm font-medium text-content-muted leading-relaxed mb-2">
          O Standard agora vive em um novo endereço, mais rápido e estável.
          Atualize seu favorito para continuar sem interrupções.
        </p>
        <p className="text-xs font-bold text-blue-600 mb-8 tracking-wider">
          standard-n.pages.dev
        </p>

        {/* Contador */}
        <p className="text-sm font-bold text-content-muted uppercase tracking-widest mb-6">
          Redirecionando em{' '}
          <motion.span
            key={count}
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-blue-600 tabular-nums"
          >
            {count}
          </motion.span>
          {' '}segundo{count !== 1 ? 's' : ''}...
        </p>

        {/* Botão manual */}
        <button
          onClick={() => window.location.replace(NEW_URL)}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Ir agora
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}
