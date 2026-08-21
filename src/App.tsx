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
import FeedbackNotificationModal from './components/FeedbackNotificationModal';
import Footer from './components/Footer';

// Serviços e Tipos
import { Trainee, TrainingRow, MilestoneEvaluations, MilestoneEvaluation, LOCAL_OPTIONS, FUNCAO_OPTIONS, PRESET_HOURS } from './types';
import * as DataService from './services/dataService';
import * as ExportService from './services/exportService';
import { triggerMilestoneEmail } from './services/githubActionsService';
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
    horasPrevistas, setHorasPrevistas,
    supervisor, setSupervisor,
    notifiedMilestones, setNotifiedMilestones,
    realTrainings,
    kaizenData,
    kaizenDebugLog,
    isLoadingProfile,
    hasLoadedData: hasLoadedDataFromHook,
    lastServerDataRef
  } = useTraineeData(selectedTrainee);

  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isLoadingTrainings, setIsLoadingTrainings] = useState(false);
  
  const totalHours = horasPrevistas || 432;
  const progressHours = useMemo(() => {
    if (userStatus === 'efetivado') return totalHours;
    const rows = Array.isArray(tableRows) ? tableRows : [];
    return rows.reduce((acc, row) => acc + (parseFloat(row.duracao) || 0), 0);
  }, [userStatus, tableRows, totalHours]);
  
  // --- Avaliações não lidas (Feedback Notifications) ---
  const unreadEvaluations = useMemo(() => {
    if (isAdmin || !hasLoadedDataFromHook || !selectedTrainee) return [];
    return Object.entries(milestoneEvaluations)
      .filter(([_, evalData]) => {
        const data = evalData as MilestoneEvaluation;
        return data.comment && data.readByTrainee !== true;
      })
      .map(([m, evalData]) => ({ milestone: Number(m), ...(evalData as MilestoneEvaluation) }));
  }, [milestoneEvaluations, isAdmin, hasLoadedDataFromHook, selectedTrainee]);

  const handleViewFeedback = useCallback(async () => {
    if (!selectedTrainee || unreadEvaluations.length === 0) return;

    // 1. Atualizar o estado local
    const updatedEvaluations = { ...milestoneEvaluations };
    unreadEvaluations.forEach(ev => {
      if (updatedEvaluations[ev.milestone]) {
        updatedEvaluations[ev.milestone] = { ...updatedEvaluations[ev.milestone], readByTrainee: true };
      }
    });
    setMilestoneEvaluations(updatedEvaluations);

    // 2. Salvar no Firebase diretamente sem ativar auto-save global
    try {
      await DataService.markEvaluationsAsRead(selectedTrainee.matricula, updatedEvaluations);
    } catch (e) {
      console.error("Falha ao marcar avaliações como lidas", e);
    }

    // 3. Forçar a aba ativa para timeline
    setActiveTab('timeline');
  }, [selectedTrainee, unreadEvaluations, milestoneEvaluations, setMilestoneEvaluations, setActiveTab]);

  
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

  // Click-outside para fechar o menu de download
  useEffect(() => {
    if (!isDownloadMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDownloadMenuOpen]);

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

  // Resetar scroll para o topo quando mudar de aba ou visualização
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab, selectedTrainee, selectedClass]);

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

  // --- Auto-Save e Notificações ---
  const dataForSaveRef = useRef({ tableRows, userStatus, horasPrevistas, supervisor, milestoneEvaluations, notifiedMilestones });
  dataForSaveRef.current = { tableRows, userStatus, horasPrevistas, supervisor, milestoneEvaluations, notifiedMilestones };

  useEffect(() => {
    if (!hasLoadedDataFromHook || !selectedTrainee) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      const { tableRows: rows, userStatus: status, horasPrevistas: currentHorasPrevistas, supervisor: currentSupervisor, milestoneEvaluations: evals, notifiedMilestones: currentNotified } = dataForSaveRef.current;
      const currentProgressHours = rows.reduce((acc, row) => acc + (parseFloat(row.duracao) || 0), 0);
      const computedProgressHours = status === 'efetivado' ? (currentHorasPrevistas || 432) : currentProgressHours;

      // Verifica se alcançou novos marcos
      const currentMilestones = (currentHorasPrevistas || 432) === 240 
        ? [60, 120, 180, 240] 
        : [100, 200, 300, (currentHorasPrevistas || 432)];
        
      let newNotified = [...currentNotified];
      let hasNewMilestone = false;

      for (const m of currentMilestones) {
        if (computedProgressHours >= m && !newNotified.includes(m)) {
          // Alcançou um novo marco! Dispara a notificação via GitHub Actions
          triggerMilestoneEmail(selectedTrainee.name, selectedTrainee.matricula, m);
          newNotified.push(m);
          hasNewMilestone = true;
        }
      }

      if (hasNewMilestone) {
        setNotifiedMilestones(newNotified);
      }

      const currentData = JSON.stringify({
        tableRows: rows,
        status: status,
        horasPrevistas: currentHorasPrevistas,
        supervisor: currentSupervisor,
        milestoneEvaluations: evals,
        horasAcumuladas: currentProgressHours,
        notifiedMilestones: newNotified
      });

      if (currentData === lastServerDataRef.current) return;

      setAutoSaveStatus('saving');
      try {
        await DataService.saveStageData(selectedTrainee, computedProgressHours, status, currentHorasPrevistas, rows, evals, currentSupervisor, newNotified);
        lastServerDataRef.current = currentData;
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (e) {
        console.error("Auto-save failed", e);
        setAutoSaveStatus('idle');
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [tableRows, userStatus, horasPrevistas, supervisor, milestoneEvaluations, notifiedMilestones, hasLoadedDataFromHook, selectedTrainee, lastServerDataRef]);

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
        funcao: totalHours === 240 ? 'MAQUINISTA PÁTIO' : 'OFF',
        supervisor: supervisor,
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center"
        onClick={() => setOpenDropdownId(null)}
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-surface border border-border-subtle rounded-3xl sm:rounded-2xl shadow-2xl p-6 min-w-[320px] sm:min-w-[300px]"
          ref={datePickerRef}
        >
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-background rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-bold text-content uppercase tracking-tight">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-background rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={i} className="text-[10px] font-black text-content-muted text-center py-1">{d}</div>)}
            {days.map(day => (
              <button
                key={day.toISOString()}
                onClick={() => {
                  updateRow(rowId, 'data', format(day, 'yyyy-MM-dd'));
                  setOpenDropdownId(null);
                }}
                className={`h-8 sm:h-7 text-xs rounded-lg transition-all flex items-center justify-center ${!isSameMonth(day, currentMonth) ? 'text-content-muted opacity-20' : 'text-content hover:bg-blue-50 hover:text-blue-600'} ${isSameDay(day, date) ? 'bg-blue-600 !text-white font-bold' : ''}`}
              >
                {format(day, 'd')}
              </button>
            ))}
          </div>
        </motion.div>
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
        onToggleManualStatus={async (matricula, title, completed) => {
          await DataService.updateManualTrainingStatus(matricula, title, completed);
        }}
      />
    );
  }

  if (isLoadingProfile || isLoadingLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        {/* Efeitos de fundo */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center gap-8"
        >
          <div className="relative">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 border-[3px] border-blue-600/10 border-t-blue-600 rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-blue-600 animate-bounce" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-content uppercase tracking-tighter">Sincronizando Dados</h2>
            <div className="flex items-center justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1.5 h-1.5 bg-blue-600 rounded-full"
                />
              ))}
            </div>
          </div>
        </motion.div>
        <div className="absolute bottom-4 left-0 right-0">
          <Footer />
        </div>
      </div>
    );
  }

  if (selectedTrainee && userStatus === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <StatusSelectionView 
          currentStatus={userStatus} 
          onStatusChange={(status, hours) => {
            setUserStatus(status);
            if (hours) setHorasPrevistas(hours);
          }} 
          isAdmin={isAdmin}
          onBack={() => setSelectedTrainee(null)}
        />
      </div>
    );
  }

  // Proteção final: se chegamos aqui sem um trainee selecionado, algo está errado
  if (!selectedTrainee && isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center max-w-md px-6"
        >
          <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-[24px] flex items-center justify-center mx-auto mb-8 shadow-sm">
            <UserIcon className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-content uppercase tracking-tight mb-4">Sessão Expirada</h2>
          <p className="text-content-muted text-sm font-medium mb-10 leading-relaxed uppercase tracking-wider opacity-80">
            Não conseguimos localizar os dados da sua sessão. Por favor, realize o login novamente para continuar.
          </p>
          <button 
            onClick={handleLogout} 
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Ir para tela de login
          </button>
        </motion.div>
        <div className="absolute bottom-4 left-0 right-0">
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <header className="flex items-center justify-between mb-8 md:mb-12 gap-4 px-6 pt-6">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <button 
              onClick={() => {
                if (isAdmin) setSelectedTrainee(null);
                else handleLogout();
              }} 
              className="p-2 md:p-3 hover:bg-surface rounded-2xl transition-colors shrink-0"
            >
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
              totalHours={totalHours}
              onUpdateTotalHours={setHorasPrevistas}
              supervisor={supervisor}
              onUpdateSupervisor={setSupervisor}
            />
          )}
          {activeTab === 'pending' && (
            <PendingTrainingsView 
              trainee={selectedTrainee!} 
              realTrainings={realTrainings} 
              isLoading={isLoadingTrainings} 
              isAdmin={isAdmin} 
              onToggleManualStatus={async (title, completed) => {
                await DataService.updateManualTrainingStatus(selectedTrainee!.matricula, title, completed);
              }}
            />
          )}
          {activeTab === 'kaizen' && <KaizenView trainee={selectedTrainee!} kaizenData={kaizenData} />}
        </div>
      </main>

      <GlobalUploadModal 
        show={showGlobalUploadModal} onClose={() => setShowGlobalUploadModal(false)}
        loginEmail={loginEmail}
      />

      <MilestoneEvaluationModal 
        milestone={editingMilestone} onClose={() => setEditingMilestone(null)}
        evaluations={milestoneEvaluations} onUpdate={(m, c) => setMilestoneEvaluations(prev => ({ ...prev, [m]: { comment: c, inspector: c.trim() ? userName : '', readByTrainee: false } }))}
        onResendEmail={isAdmin && selectedTrainee ? (m) => triggerMilestoneEmail(selectedTrainee.name, selectedTrainee.matricula, m) : undefined}
      />

      {!isAdmin && unreadEvaluations.length > 0 && (
        <FeedbackNotificationModal 
          unreadEvaluations={unreadEvaluations} 
          onViewFeedback={handleViewFeedback}
        />
      )}

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

      <Footer />

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
