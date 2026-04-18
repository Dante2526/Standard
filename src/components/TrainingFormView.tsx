import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Plus, Calendar, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TrainingRow, LOCAL_OPTIONS } from '../types';

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
}

const TrainingFormView: React.FC<TrainingFormViewProps> = ({
  tableRows,
  isAdmin,
  openDropdownId,
  setOpenDropdownId,
  updateRow,
  addRow,
  removeRow,
  isSaving,
  autoSaveStatus,
  formRef,
  renderCalendar
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
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
          {isAdmin && (
            <button
              onClick={addRow}
              className="flex items-center gap-2 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20 border border-white/10"
            >
              <Plus className="w-4 h-4" />
              Nova Linha
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[140px] md:w-[180px]">Local</th>
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[120px]">Equipamento</th>
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[110px] md:w-[140px]">Data</th>
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[80px] md:w-[80px]">Hora</th>
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[70px] md:w-[80px]">Dur.</th>
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[120px]">Instrutor</th>
                <th className="py-3 md:py-2 px-1 text-[10px] font-bold text-content-muted uppercase tracking-wider min-w-[120px]">Avaliação</th>
                {isAdmin && <th className="py-2 px-1 w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.id} className="group border-b border-border-subtle/30 last:border-0 hover:bg-background/50 transition-colors">
                  <td className="py-2 px-1">
                    <div className="relative">
                      <button
                        onClick={() => isAdmin && setOpenDropdownId(openDropdownId === `local-${row.id}` ? null : `local-${row.id}`)}
                        className={`w-full text-left px-2 py-3 md:py-1.5 text-sm rounded-lg border border-border-subtle/50 transition-colors flex items-center justify-between ${isAdmin ? 'hover:border-blue-300 hover:bg-surface' : ''}`}
                      >
                        <span className={row.local ? 'text-content' : 'text-content-muted truncate'}>
                          {row.local || 'Selecione...'}
                        </span>
                        {isAdmin && <ChevronDown className="w-3 h-3 text-content-muted" />}
                      </button>
                      <AnimatePresence>
                        {openDropdownId === `local-${row.id}` && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-border-subtle rounded-xl shadow-xl overflow-hidden py-1 min-w-[160px]"
                          >
                            {LOCAL_OPTIONS.map((option) => (
                              <button
                                key={option}
                                onClick={() => {
                                  updateRow(row.id, 'local', option);
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-blue-50 hover:text-blue-600 ${row.local === option ? 'bg-blue-50 text-blue-600 font-medium' : 'text-content-muted'}`}
                              >
                                {option}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                  <td className="py-2 px-1">
                    <input 
                      type="text" 
                      readOnly={!isAdmin}
                      className="w-full bg-transparent border border-border-subtle/50 hover:border-blue-300 focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-3 md:py-1.5 outline-none text-sm transition-colors" 
                      value={row.equipamento} 
                      onChange={e => updateRow(row.id, 'equipamento', e.target.value)} 
                    />
                  </td>
                  <td className="py-2 px-1 relative text-center">
                    <button
                      onClick={() => isAdmin && setOpenDropdownId(openDropdownId === `date-${row.id}` ? null : `date-${row.id}`)}
                      className="w-full bg-transparent border border-border-subtle/50 hover:border-blue-300 focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-3 md:py-1.5 outline-none text-sm transition-colors flex items-center justify-between"
                    >
                      <span className={row.data ? 'text-content' : 'text-content-muted'}>
                        {row.data ? format(parseISO(row.data), 'dd/MM/yyyy') : 'DD/MM/AAAA'}
                      </span>
                      {isAdmin && <Calendar className="w-3.5 h-3.5 text-content-muted" />}
                    </button>
                    <AnimatePresence>
                      {openDropdownId === `date-${row.id}` && renderCalendar(row.id, row.data)}
                    </AnimatePresence>
                  </td>
                  <td className="py-2 px-1">
                    <input 
                      type="text" 
                      readOnly={!isAdmin}
                      placeholder="00:00" 
                      className="w-full bg-transparent border border-border-subtle/50 hover:border-blue-300 focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-3 md:py-1.5 outline-none text-sm transition-colors" 
                      value={row.hora} 
                      onChange={e => updateRow(row.id, 'hora', e.target.value)} 
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input 
                      type="text" 
                      readOnly={!isAdmin}
                      placeholder="0h" 
                      className="w-full bg-transparent border border-border-subtle/50 hover:border-blue-300 focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-3 md:py-1.5 outline-none text-sm transition-colors" 
                      value={row.duracao} 
                      onChange={e => updateRow(row.id, 'duracao', e.target.value)} 
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input 
                      type="text" 
                      readOnly={!isAdmin}
                      className="w-full bg-transparent border border-border-subtle/50 hover:border-blue-300 focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-3 md:py-1.5 outline-none text-sm transition-colors" 
                      value={row.instrutor} 
                      onChange={e => updateRow(row.id, 'instrutor', e.target.value)} 
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input 
                      type="text" 
                      readOnly={!isAdmin}
                      className="w-full bg-transparent border border-border-subtle/50 hover:border-blue-300 focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-3 md:py-1.5 outline-none text-sm transition-colors" 
                      value={row.avaliacao} 
                      onChange={e => updateRow(row.id, 'avaliacao', e.target.value)} 
                    />
                  </td>
                  {isAdmin && (
                    <td className="py-2 px-1 text-center">
                      <button onClick={() => removeRow(row.id)} className="p-1.5 text-content-muted hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default TrainingFormView;
