import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Check, FileSpreadsheet, FileBarChart } from 'lucide-react';
import * as DataService from '../services/dataService';

interface GlobalUploadModalProps {
  show: boolean;
  onClose: () => void;
  loginEmail: string;
}

const GlobalUploadModal: React.FC<GlobalUploadModalProps> = ({ show, onClose, loginEmail }) => {
  const [kaizenFile, setKaizenFile] = useState<File | null>(null);
  const [trainingFile, setTrainingFile] = useState<File | null>(null);
  const [uploadingKaizen, setUploadingKaizen] = useState(false);
  const [uploadingTraining, setUploadingTraining] = useState(false);
  const [successKaizen, setSuccessKaizen] = useState(false);
  const [successTraining, setSuccessTraining] = useState(false);

  const handleUpload = async (type: 'kaizen' | 'treinamento') => {
    const file = type === 'kaizen' ? kaizenFile : trainingFile;
    if (!file) return;

    if (type === 'kaizen') setUploadingKaizen(true);
    else setUploadingTraining(true);

    try {
      await DataService.uploadGlobalFile(file, type, loginEmail);
      if (type === 'kaizen') setSuccessKaizen(true);
      else setSuccessTraining(true);
      
      setTimeout(() => {
        if (type === 'kaizen') { setSuccessKaizen(false); setKaizenFile(null); }
        else { setSuccessTraining(false); setTrainingFile(null); }
      }, 3000);
    } catch (e) {
      alert(`Erro no upload (${type})`);
    } finally {
      if (type === 'kaizen') setUploadingKaizen(false);
      else setUploadingTraining(false);
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
                  Carregue a planilha atualizada com os registros de treinamento de todos os colaboradores.
                </p>

                {successTraining ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-10 h-10 mb-2" />
                    <p className="font-bold">Planilha Processada!</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="border-2 border-dashed border-blue-300 dark:border-blue-700/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer relative h-40">
                      <input 
                        type="file" 
                        accept=".xlsx,.csv,.xls"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setTrainingFile(e.target.files[0]);
                          }
                        }}
                      />
                      <Upload className="w-8 h-8 text-blue-500 mb-2" />
                      {trainingFile ? (
                        <p className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate w-full px-4">{trainingFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Clique ou arraste um arquivo</p>
                          <p className="text-xs text-blue-500/70 mt-1">.XLSX ou .CSV</p>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => handleUpload('treinamento')}
                      disabled={!trainingFile || uploadingTraining}
                      className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                      {uploadingTraining ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processando...
                        </>
                      ) : (
                        'Atualizar Base de Treino'
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
                  Carregue a base de dados do Kaizen para sincronizar as avaliações no sistema.
                </p>

                {successKaizen ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-emerald-600 bg-white dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-10 h-10 mb-2" />
                    <p className="font-bold">Base Kaizen Atualizada!</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-emerald-100/50 dark:hover:bg-emerald-800/30 transition-colors cursor-pointer relative h-40 bg-white/50 dark:bg-black/10">
                      <input 
                        type="file" 
                        accept=".xlsx,.csv,.xls"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setKaizenFile(e.target.files[0]);
                          }
                        }}
                      />
                      <Upload className="w-8 h-8 text-emerald-500 mb-2" />
                      {kaizenFile ? (
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 truncate w-full px-4">{kaizenFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Escolha o arquivo Kaizen</p>
                          <p className="text-xs text-emerald-500/70 mt-1">.XLSX ou .CSV</p>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => handleUpload('kaizen')}
                      disabled={!kaizenFile || uploadingKaizen}
                      className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {uploadingKaizen ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processando...
                        </>
                      ) : (
                        'Atualizar Base Kaizen'
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
