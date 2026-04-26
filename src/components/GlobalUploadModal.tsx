import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Check, FileSpreadsheet, FileBarChart, Trash2 } from 'lucide-react';
import * as DataService from '../services/dataService';

interface GlobalUploadModalProps {
  show: boolean;
  onClose: () => void;
  loginEmail: string;
}

const GlobalUploadModal: React.FC<GlobalUploadModalProps> = ({ show, onClose, loginEmail }) => {
  const [kaizenFiles, setKaizenFiles] = useState<File[]>([]);
  const [trainingFiles, setTrainingFiles] = useState<File[]>([]);
  const [uploadingKaizen, setUploadingKaizen] = useState(false);
  const [uploadingTraining, setUploadingTraining] = useState(false);
  const [successKaizen, setSuccessKaizen] = useState(false);
  const [successTraining, setSuccessTraining] = useState(false);
  const [progressKaizen, setProgressKaizen] = useState('');
  const [progressTraining, setProgressTraining] = useState('');

  const handleUpload = async (type: 'kaizen' | 'treinamento') => {
    const files = type === 'kaizen' ? kaizenFiles : trainingFiles;
    if (!files.length) return;

    if (type === 'kaizen') setUploadingKaizen(true);
    else setUploadingTraining(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const label = `Processando ${i + 1} de ${files.length}...`;
        if (type === 'kaizen') setProgressKaizen(label);
        else setProgressTraining(label);

        await DataService.uploadGlobalFile(files[i], type, loginEmail);
      }

      if (type === 'kaizen') setSuccessKaizen(true);
      else setSuccessTraining(true);
      
      setTimeout(() => {
        if (type === 'kaizen') { setSuccessKaizen(false); setKaizenFiles([]); setProgressKaizen(''); }
        else { setSuccessTraining(false); setTrainingFiles([]); setProgressTraining(''); }
      }, 3000);
    } catch (e: any) {
      alert(`Ocorreu um erro no upload (${type}).\n\nIsso geralmente acontece se o arquivo estiver salvo com Rótulos de Confidencialidade ou Criptografado.\nPor favor, abra o arquivo, clique em 'Salvar Como' e tente enviá-lo novamente, ou salve no formato .CSV.\n\nDetalhe técnico: ${e.message}`);
    } finally {
      if (type === 'kaizen') { setUploadingKaizen(false); setProgressKaizen(''); }
      else { setUploadingTraining(false); setProgressTraining(''); }
    }
  };

  const removeFile = (type: 'kaizen' | 'treinamento', index: number) => {
    if (type === 'kaizen') {
      setKaizenFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setTrainingFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="bg-surface p-6 md:p-8 rounded-[38px] shadow-2xl w-full max-w-4xl border border-border-subtle relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8 border-b border-border-subtle pb-4 relative z-10">
              <h2 className="text-2xl font-black text-content flex items-center gap-3 tracking-tight">
                <Upload className="w-6 h-6 text-emerald-600" />
                Atualização de Dados do Sistema
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-border-subtle rounded-full transition-colors text-content-muted"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Split Grid for Kaizen and Treinamento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              
              {/* Treinamento Side */}
              <div className="flex flex-col bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[28px] border border-border-subtle">
                <div className="flex items-center gap-3 mb-4 text-blue-600 dark:text-blue-400">
                  <FileSpreadsheet className="w-6 h-6" />
                  <h3 className="text-xl font-bold tracking-tight">Treinamentos</h3>
                </div>
                <p className="text-sm font-medium text-content-muted mb-6">
                  Carregue as planilhas com os registros de treinamento. Você pode selecionar múltiplos arquivos.
                </p>

                {successTraining ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-10 h-10 mb-2" />
                    <p className="font-bold">{trainingFiles.length > 1 ? `${trainingFiles.length} Planilhas Processadas!` : 'Planilha Processada!'}</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="border-2 border-dashed border-blue-300 dark:border-blue-700/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer relative min-h-[10rem]">
                      <input 
                        type="file" 
                        accept=".csv,.xlsx,.xls"
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setTrainingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                          }
                        }}
                      />
                      <Upload className="w-8 h-8 text-blue-500 mb-2" />
                      {trainingFiles.length > 0 ? (
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{trainingFiles.length} arquivo(s) selecionado(s)</p>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Clique ou arraste arquivos</p>
                          <p className="text-xs text-blue-500/70 mt-1">.CSV ou .XLSX (múltiplos)</p>
                        </>
                      )}
                    </div>

                    {/* File list */}
                    {trainingFiles.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                        {trainingFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl text-xs">
                            <span className="font-bold text-blue-700 dark:text-blue-300 truncate flex-1 mr-2">{f.name}</span>
                            <button onClick={() => removeFile('treinamento', i)} className="text-red-400 hover:text-red-600 shrink-0 p-0.5">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleUpload('treinamento')}
                      disabled={trainingFiles.length === 0 || uploadingTraining}
                      className="w-full py-4 bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] hover:from-[#1d4ed8] hover:to-[#1e40af] text-white rounded-2xl font-black text-sm uppercase transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-black/20 border border-white/10"
                    >
                      {uploadingTraining ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {progressTraining || 'Processando...'}
                        </>
                      ) : (
                        `Atualizar Base de Treino${trainingFiles.length > 1 ? ` (${trainingFiles.length})` : ''}`
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Kaizen Side */}
              <div className="flex flex-col bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-[28px] border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex items-center gap-3 mb-4 text-emerald-600 dark:text-emerald-400">
                  <FileBarChart className="w-6 h-6" />
                  <h3 className="text-xl font-bold tracking-tight">Sistema Kaizen</h3>
                </div>
                <p className="text-sm font-medium text-emerald-800/60 dark:text-emerald-200/60 mb-6">
                  Carregue as bases de dados do Kaizen. Você pode selecionar múltiplos arquivos.
                </p>

                {successKaizen ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-emerald-600 bg-white dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-10 h-10 mb-2" />
                    <p className="font-bold">{kaizenFiles.length > 1 ? `${kaizenFiles.length} Bases Atualizadas!` : 'Base Kaizen Atualizada!'}</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-emerald-100/50 dark:hover:bg-emerald-800/30 transition-colors cursor-pointer relative min-h-[10rem] bg-white/50 dark:bg-black/10">
                      <input 
                        type="file" 
                        accept=".csv,.xlsx,.xls"
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setKaizenFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                          }
                        }}
                      />
                      <Upload className="w-8 h-8 text-emerald-500 mb-2" />
                      {kaizenFiles.length > 0 ? (
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{kaizenFiles.length} arquivo(s) selecionado(s)</p>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Escolha os arquivos Kaizen</p>
                          <p className="text-xs text-emerald-500/70 mt-1">.CSV ou .XLSX (múltiplos)</p>
                        </>
                      )}
                    </div>

                    {/* File list */}
                    {kaizenFiles.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                        {kaizenFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-xl text-xs">
                            <span className="font-bold text-emerald-700 dark:text-emerald-300 truncate flex-1 mr-2">{f.name}</span>
                            <button onClick={() => removeFile('kaizen', i)} className="text-red-400 hover:text-red-600 shrink-0 p-0.5">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleUpload('kaizen')}
                      disabled={kaizenFiles.length === 0 || uploadingKaizen}
                      className="w-full py-4 bg-gradient-to-br from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white rounded-2xl font-black text-sm uppercase transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-black/20 border border-white/10"
                    >
                      {uploadingKaizen ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {progressKaizen || 'Processando...'}
                        </>
                      ) : (
                        `Atualizar Base Kaizen${kaizenFiles.length > 1 ? ` (${kaizenFiles.length})` : ''}`
                      )}
                    </button>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalUploadModal;
