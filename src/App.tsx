import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Download, User as UserIcon, 
  ChevronLeft, ChevronRight, Briefcase,
  FileText, Table, Image as ImageIcon, File
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, 
  endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, 
  isSameMonth, isSameDay, parseISO, isValid
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { newDb } from './firebase';

// Componentes
import LoginView from './components/LoginView';
import AdminClassesView from './components/AdminClassesView';
import TraineesListView from './components/TraineesListView';
import StatusSelectionView from './components/StatusSelectionView';
import TimelineView from './components/TimelineView';
import TrainingFormView from './components/TrainingFormView';
import PendingTrainingsView from './components/PendingTrainingsView';
import KaizenView from './components/KaizenView';
import DarkModeToggle from './components/DarkModeToggle';
import GlobalUploadModal from './components/GlobalUploadModal';
import MilestoneEvaluationModal from './components/MilestoneEvaluationModal';

// Serviços e Tipos
import { Trainee, TrainingRow, MilestoneEvaluations, LOCAL_OPTIONS, FUNCAO_OPTIONS, PRESET_HOURS } from './types';
import * as DataService from './services/dataService';
import * as ExportService from './services/exportService';
import { useTraineeData } from './hooks/useTraineeData';

export default function App() {
  // --- Estados de Autenticação e Navegação ---
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('isLoggedIn') === 'true');
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('isAdmin') === 'true');
  const [userName, setUserName] = useState(() => sessionStorage.getItem('userName') || '');
  const [loginEmail, setLoginEmail] = useState(() => sessionStorage.getItem('loginEmail') || '');
  const [loginError, setLoginError] = useState('');
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState<string | null>(() => sessionStorage.getItem('selectedClass'));
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(() => {
    const saved = sessionStorage.getItem('selectedTrainee');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<'form' | 'timeline' | 'pending' | 'kaizen'>(() => 
    (sessionStorage.getItem('activeTab') as any) || 'timeline'
  );

  // --- Dados do Colaborador (Gerenciados pelo Hook) ---
  const {
    tableRows, setTableRows,
    milestoneEvaluations, setMilestoneEvaluations,
    userStatus, setUserStatus,
    realTrainings,
    kaizenData,
    kaizenDebugLog,
    isLoadingProfile,
    hasLoadedData: hasLoadedDataFromHook,
    lastServerDataRef
  } = useTraineeData(selectedTrainee);

  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isLoadingTrainings, setIsLoadingTrainings] = useState(false);
  
  const totalHours = 432;
  const progressHours = useMemo(() => {
    return userStatus === 'efetivado' 
      ? totalHours 
      : tableRows.reduce((acc, row) => acc + (parseFloat(row.duracao) || 0), 0);
  }, [userStatus, tableRows]);
  
  // --- Estados de UI ---
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingMilestone, setEditingMilestone] = useState<number | null>(null);
  const [isLoadingTrainees, setIsLoadingTrainees] = useState(false);
  const [trainees, setTrainees] = useState<Trainee[]>([]);

  // --- Modais ---
  const [showGlobalUploadModal, setShowGlobalUploadModal] = useState(false);

  // --- Refs ---
  const autoSaveTimerRef = useRef<any>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // --- Efeitos Iniciais ---
  useEffect(() => {
    DataService.ensureAuth();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // --- Persistência de Sessão e Navegação ---
  useEffect(() => {
    sessionStorage.setItem('isLoggedIn', isLoggedIn.toString());
    sessionStorage.setItem('isAdmin', isAdmin.toString());
    sessionStorage.setItem('userName', userName);
    sessionStorage.setItem('loginEmail', loginEmail);
    sessionStorage.setItem('activeTab', activeTab);
    
    if (selectedClass) sessionStorage.setItem('selectedClass', selectedClass);
    else sessionStorage.removeItem('selectedClass');
    
    if (selectedTrainee) sessionStorage.setItem('selectedTrainee', JSON.stringify(selectedTrainee));
    else sessionStorage.removeItem('selectedTrainee');
  }, [isLoggedIn, isAdmin, userName, loginEmail, selectedClass, selectedTrainee, activeTab]);

  // A sincronização em tempo real foi movida para o hook useTraineeData
  useEffect(() => {
    if (userStatus === 'efetivado') {
      setActiveTab(prev => (prev === 'kaizen' || prev === 'pending' ? prev : 'pending'));
    }
  }, [userStatus]);

  // --- Sincronização em Tempo Real da Lista de Colaboradores (Admin) ---
  useEffect(() => {
    if (!isAdmin || !selectedClass || selectedTrainee) return;

    setIsLoadingTrainees(true);
    const unsubscribe = DataService.subscribeToTraineeList(selectedClass, (list) => {
      setTrainees(list);
      setIsLoadingTrainees(false);
    });

    return () => unsubscribe();
  }, [isAdmin, selectedClass, selectedTrainee]);

  // --- Auto-Save ---
  const triggerAutoSave = useCallback(() => {
    if (!hasLoadedDataFromHook || !selectedTrainee) return;
    
    // Calcula as horas baseado no formulário para comparação
    const currentProgressHours = tableRows.reduce((acc, row) => acc + (parseFloat(row.duracao) || 0), 0);

    // Compara os dados atuais com a última versão do servidor
    const currentData = JSON.stringify({
      tableRows,
      status: userStatus,
      milestoneEvaluations,
      horasAcumuladas: currentProgressHours
    });

    if (currentData === lastServerDataRef.current) {
      // Se os dados são iguais aos do servidor, não precisamos salvar
      return;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus('saving');
    
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const progressHours = userStatus === 'efetivado' ? 432 : currentProgressHours;
        await DataService.saveStageData(selectedTrainee, progressHours, userStatus, tableRows, milestoneEvaluations);
        
        // Atualiza a referência local após um salvamento bem-sucedido
        lastServerDataRef.current = currentData;
        
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (e) {
        console.error("Auto-save failed", e);
        setAutoSaveStatus('idle');
      }
    }, 2000);
  }, [selectedTrainee, tableRows, userStatus, milestoneEvaluations, hasLoadedDataFromHook, lastServerDataRef]);

  useEffect(() => { triggerAutoSave(); }, [tableRows, userStatus, milestoneEvaluations, triggerAutoSave]);

  // --- Handlers de UI ---
  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setSelectedClass(null);
    setSelectedTrainee(null);
    setTrainees([]);
    setLoginEmail('');
    
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('loginEmail');
    sessionStorage.removeItem('selectedClass');
    sessionStorage.removeItem('selectedTrainee');
    sessionStorage.removeItem('activeTab');
  }, []);

  const updateRow = useCallback((id: number, field: keyof TrainingRow, value: string) => {
    setTableRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  }, [setTableRows]);

  const addRow = useCallback(() => {
    const newId = tableRows.length > 0 ? Math.max(...tableRows.map(r => r.id)) + 1 : 1;
    setTableRows(prev => [...prev, { id: newId, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' }]);
  }, [tableRows, setTableRows]);

  const removeRow = useCallback((id: number) => {
    setTableRows(prev => prev.filter(row => row.id !== id));
  }, [setTableRows]);
  
  const handleExport = useCallback(async (type: 'pdf' | 'excel' | 'png' | 'word') => {
    if (!selectedTrainee) return;
    setIsDownloading(true);
    setIsDownloadMenuOpen(false);

    await new Promise(r => setTimeout(r, 300));

    try {
      const exportData = {
        nome: selectedTrainee.name,
        matricula: selectedTrainee.matricula,
        funcao: selectedTrainee.funcao,
        horasPrevistas: totalHours,
        horasRealizadas: progressHours,
        horasFaltantes: totalHours - progressHours
      };

      switch (type) {
        case 'pdf': await ExportService.exportToPDF(formRef.current!); break;
        case 'excel': await ExportService.exportToExcel(exportData, tableRows); break;
        case 'png': await ExportService.exportToPNG(formRef.current!); break;
        case 'word': await ExportService.exportToWord(exportData, tableRows); break;
      }
    } catch (e) {
      console.error("Export failed", e);
      alert("Erro ao gerar arquivo. Tente novamente.");
    } finally {
      setIsDownloading(false);
    }
  }, [selectedTrainee, totalHours, progressHours, tableRows]);


  // --- Renderizadores Auxiliares ---
  const renderCalendar = useCallback((rowId: number, currentDate: string) => {
    const date = currentDate ? parseISO(currentDate) : new Date();
    const days = eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentMonth)),
      end: endOfWeek(endOfMonth(currentMonth))
    });

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute z-[100] mt-2 p-4 bg-surface border border-border-subtle rounded-2xl shadow-2xl min-w-[280px] left-1/2 -translate-x-1/2"
        ref={datePickerRef}
      >
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-background rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-bold text-content uppercase tracking-tight">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-background rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <div key={d} className="text-[10px] font-black text-content-muted text-center py-1">{d}</div>)}
          {days.map(day => (
            <button
              key={day.toString()}
              onClick={() => {
                updateRow(rowId, 'data', format(day, 'yyyy-MM-dd'));
                setOpenDropdownId(null);
              }}
              className={`h-8 text-xs rounded-lg transition-all flex items-center justify-center ${!isSameMonth(day, currentMonth) ? 'text-content-muted opacity-20' : 'text-content hover:bg-blue-50 hover:text-blue-600'} ${isSameDay(day, date) ? 'bg-blue-600 !text-white font-bold' : ''}`}
            >
              {format(day, 'd')}
            </button>
          ))}
        </div>
      </motion.div>
    );
  }, [currentMonth, updateRow]);



  // --- Renderização Principal ---
  if (!isLoggedIn) {
    return (
      <LoginView 
        isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
        loginEmail={loginEmail} setLoginEmail={setLoginEmail}
        isLoadingLogin={isLoadingLogin} setIsLoadingLogin={setIsLoadingLogin}
        loginError={loginError} setLoginError={setLoginError}
        setUserName={setUserName} setIsAdmin={setIsAdmin}
        setIsLoggedIn={setIsLoggedIn} setSelectedTrainee={setSelectedTrainee}
        setFormData={setTableRows} 
      />
    );
  }

  if (isAdmin && !selectedClass) {
    return (
      <>
        <AdminClassesView 
          isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
          loginEmail={loginEmail} isProfileMenuOpen={isProfileMenuOpen}
          handleToggleProfileMenu={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          handleOpenGlobalRepo={() => setShowGlobalUploadModal(true)}
          handleLogout={handleLogout} setSelectedClass={setSelectedClass}
          setIsLoadingTrainees={setIsLoadingTrainees} setTrainees={setTrainees}
        />
        <GlobalUploadModal 
          show={showGlobalUploadModal} onClose={() => setShowGlobalUploadModal(false)}
          loginEmail={loginEmail}
        />
      </>
    );
  }

  if (isAdmin && selectedClass && !selectedTrainee) {
    return (
      <TraineesListView 
        selectedClass={selectedClass} trainees={trainees}
        isLoading={isLoadingTrainees} onBack={() => setSelectedClass(null)}
        onSelectTrainee={setSelectedTrainee}
      />
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-content-muted text-sm font-bold uppercase tracking-widest animate-pulse">Carregando Perfil...</p>
        </div>
      </div>
    );
  }

  if (selectedTrainee && userStatus === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <StatusSelectionView 
          currentStatus={userStatus} 
          onStatusChange={setUserStatus} 
          isAdmin={isAdmin}
          onBack={() => setSelectedTrainee(null)}
        />
      </div>
    );
  }

  // Proteção final: se chegamos aqui sem um trainee selecionado, algo está errado
  if (!selectedTrainee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-content-muted font-bold uppercase tracking-widest">Sessão expirada ou erro de carregamento</p>
          <button onClick={handleLogout} className="text-blue-600 font-black uppercase text-sm underline">Voltar para o Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <header className="flex items-center justify-between mb-8 md:mb-12 gap-4 px-6 pt-6">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <button onClick={() => setSelectedTrainee(null)} className="p-2 md:p-3 hover:bg-surface rounded-2xl transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-content" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl font-black text-content uppercase tracking-tight leading-tight truncate">{selectedTrainee?.name || 'Carregando...'}</h1>
              <p className="text-[10px] md:text-xs font-bold text-content-muted tracking-widest uppercase opacity-60">{selectedTrainee?.matricula || '---'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {activeTab === 'form' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative shrink-0" 
                  ref={downloadMenuRef}
                >
                  <button 
                    onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                    className="px-4 py-2.5 md:px-6 md:py-3 bg-blue-600 text-white rounded-2xl font-bold text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden xs:inline">Exportar</span>
                    <span className="xs:hidden">Exp.</span>
                  </button>
                  <AnimatePresence>
                    {isDownloadMenuOpen && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-56 bg-surface border border-border-subtle rounded-2xl shadow-xl overflow-hidden py-1.5 z-50">
                        <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-3 text-sm hover:bg-background transition-colors flex items-center gap-3 font-medium">
                          <FileText className="w-4 h-4 text-red-500" />
                          PDF Profissional
                        </button>
                        <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-3 text-sm hover:bg-background transition-colors flex items-center gap-3 font-medium">
                          <Table className="w-4 h-4 text-emerald-500" />
                          Planilha Excel
                        </button>
                        <button onClick={() => handleExport('png')} className="w-full text-left px-4 py-3 text-sm hover:bg-background transition-colors flex items-center gap-3 font-medium">
                          <ImageIcon className="w-4 h-4 text-blue-500" />
                          Imagem (PNG)
                        </button>
                        <button onClick={() => handleExport('word')} className="w-full text-left px-4 py-3 text-sm hover:bg-background transition-colors flex items-center gap-3 font-medium">
                          <File className="w-4 h-4 text-blue-600" />
                          Arquivo Word
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

      <main className="pt-6 pb-12 px-6 max-w-7xl mx-auto">

        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 custom-scrollbar no-scrollbar scroll-smooth">
          {(userStatus === 'efetivado' 
            ? ['pending', 'kaizen'] 
            : ['timeline', 'form', 'pending', 'kaizen']
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2.5 rounded-[18px] text-sm font-bold transition-all whitespace-nowrap shrink-0 ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-content-muted hover:bg-background'}`}
            >
              {tab === 'timeline' ? 'Linha do Tempo' : tab === 'form' ? 'Formulário' : tab === 'pending' ? 'Treinamentos' : 'Kaizen'}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {activeTab === 'timeline' && (
            <TimelineView 
              progressHours={progressHours} totalHours={totalHours}
              milestoneEvaluations={milestoneEvaluations} isAdmin={isAdmin}
              setEditingMilestone={setEditingMilestone}
            />
          )}
          {activeTab === 'form' && (
            <TrainingFormView 
              tableRows={tableRows} isAdmin={isAdmin}
              openDropdownId={openDropdownId} setOpenDropdownId={setOpenDropdownId}
              updateRow={updateRow} addRow={addRow} removeRow={removeRow}
              isSaving={isSaving} autoSaveStatus={autoSaveStatus}
              formRef={formRef} renderCalendar={renderCalendar}
              trainee={selectedTrainee!}
            />
          )}
          {activeTab === 'pending' && <PendingTrainingsView trainee={selectedTrainee!} realTrainings={realTrainings} isLoading={isLoadingTrainings} isAdmin={isAdmin} />}
          {activeTab === 'kaizen' && <KaizenView trainee={selectedTrainee!} kaizenData={kaizenData} />}
        </div>
      </main>

      <GlobalUploadModal 
        show={showGlobalUploadModal} onClose={() => setShowGlobalUploadModal(false)}
        loginEmail={loginEmail}
      />

      <MilestoneEvaluationModal 
        milestone={editingMilestone} onClose={() => setEditingMilestone(null)}
        evaluations={milestoneEvaluations} onUpdate={(m, c) => setMilestoneEvaluations(prev => ({ ...prev, [m]: { comment: c, inspector: c.trim() ? userName : '' } }))}
      />

      <AnimatePresence>
        {isDownloading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center gap-6"
          >
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Download className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black text-content uppercase tracking-tight mb-2">Gerando Documento</h2>
              <p className="text-sm font-bold text-content-muted uppercase tracking-widest opacity-60">Pode levar alguns segundos...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-8 text-center text-xs font-bold text-content-muted tracking-widest opacity-60">
        DESENVOLVIDO POR NEAR
      </footer>

      {/* === PAINEL ESPIÃO DEBUG KAIZEN === */}
      {showDebugPanel && kaizenDebugLog.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999,
          background: '#1a1a2e', color: '#0f0', fontFamily: 'monospace', fontSize: '11px',
          maxHeight: '50vh', overflow: 'auto', borderTop: '3px solid #00ff41',
          padding: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#00ff41', fontWeight: 'bold', fontSize: '13px' }}>🕵️ ESPIÃO KAIZEN - Relatório de Debug</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(kaizenDebugLog.join('\n'));
                  alert('Logs copiados!');
                }}
                style={{ background: '#00ff41', color: '#000', border: 'none', padding: '4px 12px', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}
              >
                📋 COPIAR TUDO
              </button>
              <button 
                onClick={() => setShowDebugPanel(false)}
                style={{ background: '#ff4444', color: '#fff', border: 'none', padding: '4px 12px', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}
              >
                ✕ FECHAR
              </button>
            </div>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {kaizenDebugLog.map((line, i) => (
              <div key={i} style={{ 
                color: line.includes('❌') ? '#ff4444' : line.includes('✅') ? '#00ff41' : line.includes('⚠️') ? '#ffaa00' : line.includes('💥') ? '#ff0066' : '#0f0',
                padding: '1px 0'
              }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
