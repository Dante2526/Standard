import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Check } from 'lucide-react';

interface GlobalUploadModalProps {
  show: boolean;
  onClose: () => void;
  uploadType: 'kaizen' | 'treinamento';
  setUploadType: (type: 'kaizen' | 'treinamento') => void;
  file: File | null;
  setFile: (file: File | null) => void;
  isUploading: boolean;
  success: boolean;
  onUpload: () => void;
}

const GlobalUploadModal: React.FC<GlobalUploadModalProps> = ({
  show,
  onClose,
  uploadType,
  setUploadType,
  file,
  setFile,
  isUploading,
  success,
  onUpload
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-surface p-6 rounded-2xl shadow-xl max-w-md w-full border border-border-subtle"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-content flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                Repositório Global
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-border-subtle rounded-full transition-colors text-content-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-emerald-600">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-8 h-8" />
                </div>
                <p className="font-medium text-lg">Arquivo enviado com sucesso!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-2">Tipo de Arquivo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setUploadType('kaizen')}
                      className={`py-2 px-4 rounded-xl text-sm font-medium transition-colors border ${
                        uploadType === 'kaizen' 
                          ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' 
                          : 'bg-transparent border-border-subtle text-content-muted hover:bg-border-subtle'
                      }`}
                    >
                      Kaizen
                    </button>
                    <button
                      onClick={() => setUploadType('treinamento')}
                      className={`py-2 px-4 rounded-xl text-sm font-medium transition-colors border ${
                        uploadType === 'treinamento' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' 
                          : 'bg-transparent border-border-subtle text-content-muted hover:bg-border-subtle'
                      }`}
                    >
                      Treinamento
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-content-muted mb-2">Selecione o Arquivo</label>
                  <div className="border-2 border-dashed border-border-subtle rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-border-subtle/50 transition-colors cursor-pointer relative">
                    <input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFile(e.target.files[0]);
                        }
                      }}
                    />
                    <Upload className="w-8 h-8 text-content-muted mb-2" />
                    {file ? (
                      <p className="text-sm font-medium text-content truncate w-full px-4">{file.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-content">Clique ou arraste um arquivo</p>
                        <p className="text-xs text-content-muted mt-1">PDF, DOCX, XLSX, Imagens, etc.</p>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={onUpload}
                  disabled={!file || isUploading}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                >
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Enviar Arquivo
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalUploadModal;
