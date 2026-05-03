import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, Clock, AlertCircle, CheckCircle2, Download, Search } from 'lucide-react';

interface PendingTrainingsViewProps {
  trainee: any;
  realTrainings: any[];
  isLoading: boolean;
  isAdmin: boolean;
  onToggleManualStatus?: (title: string, completed: boolean) => void;
}

const PendingTrainingsView = memo(({
  trainee,
  realTrainings,
  isLoading,
  isAdmin,
  onToggleManualStatus
}: PendingTrainingsViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'pending' | 'completed'>('all');
  const filteredTrainings = realTrainings.filter(t => {
    const titleStr = t.title ? String(t.title).toLowerCase() : '';
    const qStr = searchQuery ? String(searchQuery).toLowerCase() : '';
    const matchesSearch = titleStr.includes(qStr);
    if (viewMode === 'all') return matchesSearch;
    if (viewMode === 'pending') return matchesSearch && t.status === 'pending';
    if (viewMode === 'completed') return matchesSearch && t.status === 'completed';
    return matchesSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-surface rounded-[28px] p-6 shadow-sm border border-border-subtle">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div className="flex flex-col items-center md:items-start md:flex-row gap-4 w-full md:w-auto">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-xl font-black text-content uppercase tracking-tight">Meus Treinamentos</h2>
              <p className="text-[10px] font-bold text-content-muted uppercase tracking-widest opacity-60">Gestão de Capacitação</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full max-w-[320px] md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
              <input 
                type="text"
                placeholder="Buscar treinamento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-background border border-border-subtle rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-center md:text-left"
              />
            </div>
            <div className="flex bg-background p-1 rounded-xl border border-border-subtle shadow-sm">
              <button 
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-content-muted hover:text-content'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setViewMode('pending')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'pending' ? 'bg-blue-600 text-white shadow-sm' : 'text-content-muted hover:text-content'}`}
              >
                Pendentes
              </button>
              <button 
                onClick={() => setViewMode('completed')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'completed' ? 'bg-blue-600 text-white shadow-sm' : 'text-content-muted hover:text-content'}`}
              >
                Concluídos
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-sm text-content-muted font-medium">Buscando documentos reais no banco de dados...</p>
              </div>
            ) : filteredTrainings.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-background/50 rounded-2xl border border-dashed border-border-subtle"
              >
                <AlertCircle className="w-12 h-12 text-content-muted mb-4 opacity-20" />
                <p className="text-content-muted font-medium">Nenhum treinamento encontrado.</p>
              </motion.div>
            ) : (
              filteredTrainings.map((item, idx) => (
                <motion.div
                  key={idx}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-background rounded-2xl p-4 border border-border-subtle hover:border-blue-200 transition-all group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-content text-sm mb-1 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {item.code && (
                          <span className="text-[9px] bg-surface border border-border-subtle text-content-muted font-black uppercase tracking-widest px-1.5 py-0.5 rounded font-mono">
                            Cód: {item.code}
                          </span>
                        )}
                        <span className="text-[10px] text-content-muted font-medium uppercase tracking-wider">{item.category}</span>
                        {item.modality && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                            item.modality === 'Online' ? 'bg-blue-50 text-blue-600' : 
                            item.modality === 'OJT' ? 'bg-purple-50 text-purple-600' :
                            'bg-indigo-50 text-indigo-600'
                          }`}>
                            {item.modality}
                          </span>
                        )}
                        {item.status === 'completed' && (
                          <span className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Concluído
                          </span>
                        )}
                      </div>
                    </div>
                    {item.status === 'completed' && (
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}
                    {item.status === 'pending' && (
                      <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border-subtle/50">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-content-muted uppercase font-bold tracking-widest">Validade</span>
                        <span className={`text-[11px] font-black ${item.isExpired ? 'text-red-600' : 'text-content'}`}>
                          {item.date || item.expiryDate || 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    {item.status === 'completed' ? (
                      <button 
                        onClick={() => onToggleManualStatus?.(item.title, false)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-tight hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Concluído
                      </button>
                    ) : (
                      <button 
                        onClick={() => onToggleManualStatus?.(item.title, true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-tight hover:bg-orange-100 transition-colors"
                      >
                        <Clock className="w-3 h-3" /> Concluir
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface rounded-[28px] p-6 shadow-sm border border-emerald-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-content">Certificações Ativas</h3>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-content tracking-tighter">
              {realTrainings.filter(t => t.status === 'completed').length}
            </span>
            <span className="text-xs text-content-muted font-bold uppercase tracking-widest mb-1">Concluídas</span>
          </div>
        </div>

        <div className="bg-surface rounded-[28px] p-6 shadow-sm border border-orange-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-content">Pendências</h3>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-content tracking-tighter">
              {realTrainings.filter(t => t.status === 'pending').length}
            </span>
            <span className="text-xs text-content-muted font-bold uppercase tracking-widest mb-1">A realizar</span>
          </div>
        </div>

        <div className="bg-surface rounded-[28px] p-6 shadow-sm border border-blue-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-content">Próximos Vencimentos</h3>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-xs text-content-muted text-center py-4">Calculando prazos...</p>
            ) : realTrainings.filter(t => t.daysRemaining !== null && t.daysRemaining < 365).length === 0 ? (
              <p className="text-xs text-content-muted text-center py-4">Tudo em dia!</p>
            ) : (
              realTrainings
                .filter(t => t.daysRemaining !== null && t.daysRemaining < 365)
                .sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0))
                .slice(0, 3)
                .map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm p-2 hover:bg-background rounded-lg transition-colors">
                    <span className="text-content-muted max-w-[70%] truncate">{item.title}</span>
                    <span className={`font-bold ${item.daysRemaining < 30 ? 'text-red-500' : 'text-orange-500'}`}>
                      {item.daysRemaining} dias
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default PendingTrainingsView;
