import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Download, User as UserIcon, 
  ChevronLeft, ChevronRight, Briefcase 
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, 
  endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, 
  isSameMonth, isSameDay, parseISO, isValid
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { doc, onSnapshot } from 'firebase/firestore';
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

export default function App() {
  // --- Estados de Autenticação e Navegação ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'timeline' | 'pending' | 'kaizen'>('timeline');

  // --- Estados de Dados do Colaborador ---
  const [tableRows, setTableRows] = useState<TrainingRow[]>([]);
  const [milestoneEvaluations, setMilestoneEvaluations] = useState<MilestoneEvaluations>({});
  const [userStatus, setUserStatus] = useState<'estagio' | 'efetivado' | null>(null);
  const [realTrainings, setRealTrainings] = useState<any[]>([]);
  const [isLoadingTrainings, setIsLoadingTrainings] = useState(false);
  
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
  const [globalUploadType, setGlobalUploadType] = useState<'kaizen' | 'treinamento'>('kaizen');
  const [globalFile, setGlobalFile] = useState<File | null>(null);
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
  const [globalUploadSuccess, setGlobalUploadSuccess] = useState(false);

  // --- Refs ---
  const hasLoadedDataRef = useRef(false);
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

  // --- Sincronização em Tempo Real ---
  useEffect(() => {
    if (!selectedTrainee) return;
    hasLoadedDataRef.current = false;

    const unsubscribe = onSnapshot(doc(newDb, 'estagios', selectedTrainee.matricula), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.tableRows) setTableRows(data.tableRows);
        if (data.milestoneEvaluations) setMilestoneEvaluations(data.milestoneEvaluations);
        if (data.status) setUserStatus(data.status);
      } else {
        setTableRows([
          { id: 1, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' },
          { id: 2, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' },
          { id: 3, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' },
        ]);
        setUserStatus(null);
      }
      setTimeout(() => { hasLoadedDataRef.current = true; }, 1000);
    });

    DataService.fetchRealTrainings(selectedTrainee).then(setRealTrainings);

    return () => unsubscribe();
  }, [selectedTrainee]);

  // --- Auto-Save ---
  const triggerAutoSave = useCallback(() => {
    if (!hasLoadedDataRef.current || !selectedTrainee) return;
    
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus('saving');
    
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const progressHours = tableRows.reduce((acc, row) => acc + (parseFloat(row.duracao) || 0), 0);
        await DataService.saveStageData(selectedTrainee, progressHours, userStatus, tableRows, milestoneEvaluations);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (e) {
        console.error("Auto-save failed", e);
        setAutoSaveStatus('idle');
      }
    }, 2000);
  }, [selectedTrainee, tableRows, userStatus, milestoneEvaluations]);

  useEffect(() => { triggerAutoSave(); }, [tableRows, userStatus, milestoneEvaluations, triggerAutoSave]);

  // --- Handlers de UI ---
  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setSelectedClass(null);
    setSelectedTrainee(null);
    setTrainees([]);
    setLoginEmail('');
  };

  const updateRow = (id: number, field: keyof TrainingRow, value: string) => {
    setTableRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const addRow = () => {
    const newId = tableRows.length > 0 ? Math.max(...tableRows.map(r => r.id)) + 1 : 1;
    setTableRows(prev => [...prev, { id: newId, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' }]);
  };

  const removeRow = (id: number) => {
    setTableRows(prev => prev.filter(row => row.id !== id));
  };

  const handleGlobalUpload = async () => {
    if (!globalFile) return;
    setIsUploadingGlobal(true);
    try {
      await DataService.uploadGlobalFile(globalFile, globalUploadType, loginEmail);
      setGlobalUploadSuccess(true);
      setTimeout(() => {
        setShowGlobalUploadModal(false);
        setGlobalFile(null);
        setGlobalUploadSuccess(false);
      }, 2000);
    } catch (e) {
      alert("Erro no upload do arquivo.");
    } finally {
      setIsUploadingGlobal(false);
    }
  };

  // --- Renderizadores Auxiliares ---
  const renderCalendar = (rowId: number, currentDate: string) => {
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
  };

  const progressHours = tableRows.reduce((acc, row) => acc + (parseFloat(row.duracao) || 0), 0);
  const totalHours = 432;

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
        setFormData={() => {}} // Não mais necessário com o novo fluxo
      />
    );
  }

  if (isAdmin && !selectedClass) {
    return (
      <AdminClassesView 
        isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
        loginEmail={loginEmail} isProfileMenuOpen={isProfileMenuOpen}
        handleToggleProfileMenu={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
        handleOpenGlobalRepo={() => setShowGlobalUploadModal(true)}
        handleLogout={handleLogout} setSelectedClass={setSelectedClass}
        setIsLoadingTrainees={setIsLoadingTrainees} setTrainees={setTrainees}
      />
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

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-md border-b border-border-subtle px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedTrainee(null)} className="p-2 hover:bg-background rounded-full transition-colors text-content-muted"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold text-content tracking-tight">{selectedTrainee?.name}</h1>
            <p className="text-xs text-content-muted font-medium uppercase tracking-wider">{selectedTrainee?.matricula}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative" ref={downloadMenuRef}>
            <button onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm">
              <Download className="w-4 h-4" /> Exportar
            </button>
            <AnimatePresence>
              {isDownloadMenuOpen && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-48 bg-surface border border-border-subtle rounded-2xl shadow-xl overflow-hidden py-1 z-50">
                  <button onClick={() => { ExportService.exportToPDF(formRef.current!); setIsDownloadMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-background transition-colors">PDF Profissional</button>
                  <button onClick={() => { ExportService.exportToExcel({ nome: selectedTrainee?.name, matricula: selectedTrainee?.matricula, funcao: selectedTrainee?.funcao, horasPrevistas: totalHours, horasRealizadas: progressHours, horasFaltantes: totalHours - progressHours }, tableRows); setIsDownloadMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-background transition-colors">Planilha Excel</button>
                  <button onClick={() => { ExportService.exportToPNG(formRef.current!); setIsDownloadMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-background transition-colors">Imagem (PNG)</button>
                  <button onClick={() => { ExportService.exportToWord({ nome: selectedTrainee?.name, matricula: selectedTrainee?.matricula, funcao: selectedTrainee?.funcao, horasPrevistas: totalHours, horasRealizadas: progressHours, horasFaltantes: totalHours - progressHours }, tableRows); setIsDownloadMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-background transition-colors">Arquivo Word</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <DarkModeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
        </div>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
        <StatusSelectionView 
          currentStatus={userStatus} 
          onStatusChange={setUserStatus} 
          isAdmin={isAdmin} 
        />

        <div className="flex gap-2 mb-8 bg-surface p-1.5 rounded-[22px] border border-border-subtle w-fit">
          {['timeline', 'form', 'pending', 'kaizen'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2.5 rounded-[18px] text-sm font-bold transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-content-muted hover:bg-background'}`}
            >
              {tab === 'timeline' ? 'Linha do Tempo' : tab === 'form' ? 'Atividades' : tab === 'pending' ? 'Pendências' : 'Kaizen'}
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
            />
          )}
          {activeTab === 'pending' && <PendingTrainingsView trainee={selectedTrainee!} realTrainings={realTrainings} isLoading={isLoadingTrainings} />}
          {activeTab === 'kaizen' && <KaizenView trainee={selectedTrainee!} />}
        </div>
      </main>

      <GlobalUploadModal 
        show={showGlobalUploadModal} onClose={() => setShowGlobalUploadModal(false)}
        uploadType={globalUploadType} setUploadType={setGlobalUploadType}
        file={globalFile} setFile={setGlobalFile} isUploading={isUploadingGlobal}
        success={globalUploadSuccess} onUpload={handleGlobalUpload}
      />

      <MilestoneEvaluationModal 
        milestone={editingMilestone} onClose={() => setEditingMilestone(null)}
        evaluations={milestoneEvaluations} onUpdate={(m, c) => setMilestoneEvaluations(prev => ({ ...prev, [m]: { comment: c, inspector: userName } }))}
      />

      <footer className="py-8 text-center text-xs font-bold text-content-muted tracking-widest opacity-60">
        DESENVOLVIDO POR NEAR
      </footer>
    </div>
  );
}
