import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Plus, Calendar, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TrainingRow, LOCAL_OPTIONS, Trainee } from '../types';

interface TrainingFormViewProps {
  tableRows: TrainingRow[];
  isAdmin: boolean;
  openDropdownId: string | null;
  setOpenDropdownId: (v: string | null) => void;
  updateRow: (id: number, field: keyof TrainingRow, value: string) => void;
  addRow: () => void;
  removeRow: (id: number) => void;
  isSaving: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved';
  formRef: React.RefObject<HTMLDivElement>;
  renderCalendar: (rowId: number, currentDate: string) => React.ReactNode;
  trainee: Trainee;
  totalHours: number;
  onUpdateTotalHours: (hours: number) => void;
  supervisor: string;
  onUpdateSupervisor: (v: string) => void;
}

const TrainingFormView: React.FC<TrainingFormViewProps> = memo(({
  tableRows,
  isAdmin,
  openDropdownId,
  setOpenDropdownId,
  updateRow,
  addRow,
  removeRow,
  autoSaveStatus,
  formRef,
  renderCalendar,
  trainee,
  totalHours,
  onUpdateTotalHours,
  supervisor,
  onUpdateSupervisor
}) => {
  const progressHours = tableRows.reduce((acc, row) => acc + (parseFloat(row.duracao) || 0), 0);
  const hoursLeft = Math.max(0, totalHours - progressHours);
  
  const [activeDropdownRect, setActiveDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!openDropdownId) return;
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('.dropdown-scrollable')) {
        return;
      }
      setOpenDropdownId(null);
    };
    window.addEventListener('scroll', handleScroll, { capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, [openDropdownId, setOpenDropdownId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Report Header Section */}
      <div className="bg-surface rounded-[28px] p-8 shadow-sm border border-border-subtle relative overflow-visible">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <h1 className="text-xl md:text-2xl font-black text-content uppercase tracking-tight mb-8 border-b border-border-subtle pb-4 relative z-10 text-center md:text-left">
          Relatório de Progresso de Treinamento
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="space-y-6 md:space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 md:gap-4">
              <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left min-w-0">
                <span className="text-[10px] font-black text-content-muted uppercase tracking-widest opacity-60">Nome do Colaborador</span>
                <span className="text-lg font-bold text-content uppercase truncate">{trainee?.name || '---'}</span>
              </div>
              <div className="flex flex-col gap-1 items-center shrink-0 text-center">
                <span className="text-[10px] font-black text-content-muted uppercase tracking-widest opacity-60">Matrícula</span>
                <span className="text-base font-bold text-content">{trainee?.matricula || '---'}</span>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row flex-wrap gap-6 md:gap-x-8 md:gap-y-4 sm:gap-12">
              <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left relative shrink-0">
                <span className="text-[10px] font-black text-content-muted uppercase tracking-widest opacity-60">Função</span>
                <button 
                  onClick={() => setOpenDropdownId(openDropdownId === 'funcao' ? null : 'funcao')}
                  className="relative text-base font-bold text-content uppercase text-center flex items-center justify-center px-6 md:px-0 md:justify-start gap-1 group cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {totalHours === 240 ? 'MAQUINISTA PÁTIO' : 'OFF'}
                  <ChevronDown className="absolute right-0 md:relative md:right-auto w-4 h-4 text-content-muted group-hover:text-blue-600 transition-colors" />
                </button>

                <AnimatePresence>
                  {openDropdownId === 'funcao' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 bg-surface border border-border-subtle rounded-xl shadow-xl overflow-hidden py-1 min-w-[200px]"
                    >
                      <button
                        onClick={() => { onUpdateTotalHours(432); setOpenDropdownId(null); }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-blue-50 hover:text-blue-600 ${totalHours === 432 ? 'bg-blue-50 text-blue-600 font-bold' : 'text-content-muted font-medium'}`}
                      >
                        OFF (432h)
                      </button>
                      <button
                        onClick={() => { onUpdateTotalHours(240); setOpenDropdownId(null); }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-blue-50 hover:text-blue-600 ${totalHours === 240 ? 'bg-blue-50 text-blue-600 font-bold' : 'text-content-muted font-medium'}`}
                      >
                        MAQUINISTA PÁTIO (240h)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left min-w-0 flex-1">
                <span className="text-[10px] font-black text-content-muted uppercase tracking-widest opacity-60">Supervisor</span>
                <input 
                  type="text"
                  value={supervisor}
                  onChange={(e) => onUpdateSupervisor(e.target.value)}
                  placeholder="Nome do Supervisor"
                  className="text-base font-bold text-content bg-transparent border-b border-transparent hover:border-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-content-muted/30 placeholder:font-normal uppercase w-full max-w-[300px] md:max-w-none text-center md:text-left truncate"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-alt rounded-[22px] p-6 border border-border-subtle grid grid-cols-3 gap-4 shadow-inner">
            <div className="flex flex-col items-center justify-center text-center relative">
              <span className="text-[9px] font-black text-content-muted uppercase tracking-tighter mb-1">Horas Previstas</span>
              <button 
                onClick={() => setOpenDropdownId(openDropdownId === 'horas-previstas' ? null : 'horas-previstas')}
                className="relative flex items-center justify-center hover:bg-background px-6 md:px-3 py-1 rounded-lg transition-colors group"
              >
                <span className="text-xl font-black text-content">{totalHours}</span>
                <ChevronDown className="absolute right-0 md:relative md:right-auto md:ml-1 w-4 h-4 text-content-muted" />
              </button>
              
              <AnimatePresence>
                {openDropdownId === 'horas-previstas' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 bg-surface border border-border-subtle rounded-xl shadow-xl overflow-hidden py-1 min-w-[120px]"
                  >
                    {[432, 240].map((hours) => (
                      <button
                        key={hours}
                        onClick={() => {
                          onUpdateTotalHours(hours);
                          setOpenDropdownId(null);
                        }}
                        className={`w-full text-center px-4 py-3 text-sm transition-colors hover:bg-blue-50 hover:text-blue-600 ${totalHours === hours ? 'bg-blue-50 text-blue-600 font-bold' : 'text-content-muted font-medium'}`}
                      >
                        {hours}h
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-col items-center justify-center text-center border-x border-border-subtle px-2">
              <span className="text-[9px] font-black text-content-muted uppercase tracking-tighter mb-1">Horas Realizadas</span>
              <span className="text-xl font-black text-blue-600">{progressHours}</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-black text-content-muted uppercase tracking-tighter mb-1">Horas Faltantes</span>
              <span className="text-xl font-black text-emerald-600">{hoursLeft}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-surface rounded-[28px] p-6 shadow-sm border border-border-subtle" ref={formRef}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-content">Registro de Atividades</h2>
            <AnimatePresence mode="wait">
              {autoSaveStatus !== 'idle' && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border-subtle"
                >
                  {autoSaveStatus === 'saving' ? (
                    <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  ) : (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  )}
                  <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest">
                    {autoSaveStatus === 'saving' ? 'Salvando...' : 'Salvo'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={addRow}
            className="flex items-center gap-2 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20 border border-white/10"
          >
            <Plus className="w-4 h-4" />
            Nova Linha
          </button>
        </div>

        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[140px] md:w-[180px]">Local</th>
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[120px]">Equipamento</th>
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[110px] md:w-[140px]">Data</th>
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[130px] md:w-[130px]">Hora</th>
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[70px] md:w-[80px]">Dur.</th>
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[120px]">Instrutor</th>
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[120px]">Avaliação</th>
                <th className="py-2 px-1 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.id} className="group border-b border-border-subtle/30 last:border-0 hover:bg-background/50 transition-colors">
                  <td className="py-2 px-1">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveDropdownRect({
                            top: rect.bottom + 4,
                            left: rect.left,
                            width: rect.width
                          });
                          setOpenDropdownId(openDropdownId === `local-${row.id}` ? null : `local-${row.id}`);
                        }}
                        className="w-full text-left px-2 py-3 md:py-1.5 text-sm rounded-lg border border-border-subtle/50 transition-colors flex items-center justify-between hover:border-blue-300 hover:bg-surface"
                      >
                        <span className={row.local ? 'text-content' : 'text-content-muted truncate'}>
                          {row.local || 'Selecione...'}
                        </span>
                        <ChevronDown className="w-3 h-3 text-content-muted" />
                      </button>
                      <AnimatePresence>
                        {openDropdownId === `local-${row.id}` && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none sm:absolute sm:inset-auto sm:left-0 sm:right-0 sm:mt-1 sm:top-full flex items-center justify-center sm:block"
                            onClick={() => setOpenDropdownId(null)}
                          >
                            <motion.div
                              initial={{ scale: 0.95 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0.95 }}
                              onClick={(e) => e.stopPropagation()}
                              className="dropdown-scrollable bg-surface border border-border-subtle rounded-2xl shadow-2xl py-2 w-[calc(100vw-3rem)] sm:w-full max-w-[320px] sm:max-w-none sm:min-w-[160px] max-h-[60vh] sm:max-h-48 overflow-y-auto custom-scrollbar sm:fixed"
                              style={window.innerWidth >= 640 && activeDropdownRect ? {
                                top: `${activeDropdownRect.top}px`,
                                left: `${activeDropdownRect.left}px`,
                                width: `${activeDropdownRect.width}px`
                              } : {}}
                            >
                              <div className="sm:hidden px-4 pb-3 mb-2 mt-1 border-b border-border-subtle flex justify-between items-center">
                                <span className="text-sm font-bold text-content">Selecionar Local</span>
                              </div>
                              {LOCAL_OPTIONS.map((option) => (
                                <button
                                  key={option}
                                  onClick={() => {
                                    updateRow(row.id, 'local', option);
                                    setOpenDropdownId(null);
                                  }}
                                  className={`w-full text-left px-4 py-3 sm:py-2 text-sm transition-colors hover:bg-blue-50 hover:text-blue-600 ${row.local === option ? 'bg-blue-50 text-blue-600 font-medium' : 'text-content-muted'}`}
                                >
                                  {option}
                                </button>
                              ))}
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                  <td className="py-2 px-1">
                    <input 
                      type="text" 
                      className="w-full bg-transparent border border-border-subtle/50 hover:border-blue-300 focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-3 md:py-1.5 outline-none text-sm transition-colors" 
                      value={row.equipamento} 
                      onChange={e => updateRow(row.id, 'equipamento', e.target.value)} 
                    />
                  </td>
                  <td className="py-2 px-1 relative text-center">
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === `date-${row.id}` ? null : `date-${row.id}`)}
                      className="w-full bg-transparent border border-border-subtle/50 hover:border-blue-300 focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-3 md:py-1.5 outline-none text-sm transition-colors flex items-center justify-between"
                    >
                      <span className={row.data ? 'text-content' : 'text-content-muted'}>
                        {row.data ? format(parseISO(row.data), 'dd/MM/yyyy') : 'DD/MM/AAAA'}
                      </span>
                      <Calendar className="w-3.5 h-3.5 text-content-muted" />
                    </button>
                    <AnimatePresence>
                      {openDropdownId === `date-${row.id}` && renderCalendar(row.id, row.data)}
                    </AnimatePresence>
                  </td>
                  <td className="py-2 px-1">
                    <input 
                      type="text" 
                      placeholder="00:00" 
                      className="w-full bg-transparent border border-border-subtle/50 hover:border-blue-300 focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-3 md:py-1.5 outline-none text-sm transition-colors" 
                      value={row.hora} 
                      onChange={e => updateRow(row.id, 'hora', e.target.value)} 
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input 
                      type="text" 
                      placeholder="0h" 
                      className="w-full text-center bg-transparent border border-border-subtle/50 hover:border-blue-300 focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-3 md:py-1.5 outline-none text-sm transition-colors" 
                      value={row.duracao} 
                      onChange={e => updateRow(row.id, 'duracao', e.target.value)} 
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input 
                      type="text" 
                      className="w-full uppercase bg-transparent border border-border-subtle/50 hover:border-blue-300 focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-3 md:py-1.5 outline-none text-sm transition-colors" 
                      value={row.instrutor} 
                      onChange={e => updateRow(row.id, 'instrutor', e.target.value.toUpperCase())} 
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input 
                      type="text" 
                      className="w-full bg-transparent border border-border-subtle/50 hover:border-blue-300 focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-3 md:py-1.5 outline-none text-sm transition-colors" 
                      value={row.avaliacao} 
                      onChange={e => updateRow(row.id, 'avaliacao', e.target.value)} 
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <button onClick={() => removeRow(row.id)} className="p-1.5 text-content-muted hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
});

export default TrainingFormView;
