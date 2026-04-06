/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Trash2, ChevronDown, Calendar, ChevronLeft, ChevronRight, User as UserIcon, Clock, AlertCircle, CheckCircle2, Download, GraduationCap, Briefcase } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parseISO,
  isValid
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const LOCAL_OPTIONS = [
  "RECEPÇÃO", "VIRADOR", "GIROFLEX", "CLASSIFICAÇÃO", 
  "RECLASSIFICAÇÃO", "OFICINA", "FORMAÇÃO", "CTR"
];

type ClassItem = {
  id: number;
  name: string;
  students: number;
  time: string;
  color: string;
};

type Trainee = {
  id: number;
  name: string;
  matricula: string;
  funcao: string;
  progress: number;
  status: 'active' | 'pending' | 'completed';
};

export default function App() {
  const trainees: Trainee[] = [
    { id: 1, name: 'João Silva', matricula: '12345', funcao: 'Operador de Empilhadeira', progress: 45, status: 'active' },
    { id: 2, name: 'Maria Santos', matricula: '12346', funcao: 'Assistente de Logística', progress: 80, status: 'active' },
    { id: 3, name: 'Pedro Costa', matricula: '12347', funcao: 'Técnico de Manutenção', progress: 100, status: 'completed' },
    { id: 4, name: 'Ana Oliveira', matricula: '12348', funcao: 'Operador de Guindaste', progress: 10, status: 'pending' },
    { id: 5, name: 'Lucas Pereira', matricula: '12349', funcao: 'Conferente', progress: 60, status: 'active' },
    { id: 6, name: 'Juliana Alves', matricula: '12350', funcao: 'Operador de Empilhadeira', progress: 30, status: 'active' },
  ];

  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
  const [userStatus, setUserStatus] = useState<'estagio' | 'efetivado' | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<number, 'estagio' | 'efetivado'>>({});
  const [activeTab, setActiveTab] = useState<'form' | 'timeline' | 'pending'>('timeline');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDownloading, setIsDownloading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const totalHours = 432;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDownloadPDF = async () => {
    if (!formRef.current) return;
    
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb' // Match the background color (bg-gray-50)
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('formulario-treinamento.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const renderCalendar = (rowId: number, currentDateStr: string) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const selectedDate = currentDateStr ? parseISO(currentDateStr) : null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="absolute z-50 bottom-full mb-2 bg-white rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 p-4 w-[280px] left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0"
      >
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={(e) => { e.stopPropagation(); setCurrentMonth(subMonths(currentMonth, 1)); }}
            className="p-1.5 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-bold text-gray-800 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); setCurrentMonth(addMonths(currentMonth, 1)); }}
            className="p-1.5 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
            <div key={i} className="text-[10px] font-bold text-gray-400 text-center py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const isSelected = selectedDate && isValid(selectedDate) && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={i}
                onClick={() => {
                  updateRow(rowId, 'data', format(day, 'yyyy-MM-dd'));
                  setOpenDropdownId(null);
                }}
                className={`
                  h-8 w-8 rounded-xl text-xs flex items-center justify-center transition-all
                  ${isSelected ? 'bg-blue-500 text-white font-bold shadow-md' : 
                    isToday ? 'bg-blue-50 text-blue-600 font-bold' :
                    isCurrentMonth ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-300'}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
          <button 
            onClick={() => { updateRow(rowId, 'data', ''); setOpenDropdownId(null); }}
            className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-wider"
          >
            Limpar
          </button>
          <button 
            onClick={() => { updateRow(rowId, 'data', format(new Date(), 'yyyy-MM-dd')); setOpenDropdownId(null); }}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
          >
            Hoje
          </button>
        </div>
      </motion.div>
    );
  };
  
  const [formData, setFormData] = useState({
    nome: '',
    matricula: '',
    supervisor: '',
    funcao: '',
    horasPrevistas: '',
    horasRealizadas: '',
    horasFaltantes: ''
  });

  const [tableRows, setTableRows] = useState([
    { id: 1, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' },
    { id: 2, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' },
    { id: 3, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' },
  ]);

  const addRow = () => {
    setTableRows([...tableRows, { id: Date.now(), local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' }]);
  };

  const removeRow = (id: number) => {
    setTableRows(tableRows.filter(row => row.id !== id));
  };

  const updateRow = (id: number, field: string, value: string) => {
    setTableRows(tableRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const progressHours = tableRows.reduce((total, row) => {
    const match = row.duracao.match(/[\d.]+/);
    return match ? total + parseFloat(match[0]) : total;
  }, 0);

  return (
    <div className="min-h-screen bg-[#f2f2f6] text-gray-900 font-sans selection:bg-blue-200">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-[32px] p-8 shadow-xl max-w-md w-full border border-gray-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Bem-vindo</h1>
              <p className="text-gray-500 mb-8">Faça login com seu email corporativo</p>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const trimmedEmail = loginEmail.trim().toLowerCase();
                if (!trimmedEmail) return;
                
                setIsLoadingLogin(true);
                setLoginError('');
                
                try {
                  const q = query(collection(db, 'administrators'), where('email', '==', trimmedEmail));
                  const querySnapshot = await getDocs(q);
                  
                  if (!querySnapshot.empty) {
                    setIsLoggedIn(true);
                  } else {
                    setLoginError('Email não encontrado na lista de administradores.');
                  }
                } catch (error: any) {
                  console.error("Erro ao fazer login:", error);
                  let message = 'Erro ao conectar com o banco de dados.';
                  
                  if (error.code === 'permission-denied') {
                    message = 'Acesso negado. Verifique as regras do Firestore.';
                  } else if (error.code === 'failed-precondition') {
                    message = 'O Firestore precisa de um índice. Verifique o console.';
                  } else if (!import.meta.env.VITE_FIREBASE_API_KEY) {
                    message = 'Configuração do Firebase ausente (Variáveis de Ambiente).';
                  } else {
                    message = `Erro: ${error.message || 'Verifique a configuração do Firebase.'}`;
                  }
                  
                  setLoginError(message);
                } finally {
                  setIsLoadingLogin(false);
                }
              }} className="space-y-4 w-full text-left">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5 pl-1">
                    <span className="text-yellow-600 font-bold">*Digite tudo em minúsculo</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nome@empresa.com.br"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                    required
                    disabled={isLoadingLogin}
                  />
                  {loginError && (
                    <p className="text-red-500 text-sm mt-2 pl-1 font-medium">{loginError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoadingLogin}
                  className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-blue-700 transition-colors shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoadingLogin ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        ) : !selectedTrainee ? (
          <motion.div 
            key="trainees"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="pt-12"
          >
            <div className="max-w-4xl mx-auto px-4 mb-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
                  <p className="text-gray-500">Selecione um usuário em estágio</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium cursor-pointer" onClick={() => setIsLoggedIn(false)}>
                    {loginEmail.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainees.map((trainee, index) => (
                  <motion.div
                    key={trainee.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedTrainee(trainee);
                      setFormData(prev => ({
                        ...prev,
                        nome: trainee.name,
                        matricula: trainee.matricula,
                        funcao: trainee.funcao
                      }));
                      if (userStatuses[trainee.id]) {
                        setUserStatus(userStatuses[trainee.id]);
                        if (userStatuses[trainee.id] === 'efetivado') {
                          setActiveTab('pending');
                        } else {
                          setActiveTab('timeline');
                        }
                      } else {
                        setUserStatus(null);
                      }
                    }}
                    className="bg-white rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{trainee.name}</h3>
                          <p className="text-xs text-gray-500">Mat: {trainee.matricula}</p>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        trainee.status === 'completed' ? 'bg-green-500' :
                        trainee.status === 'active' ? 'bg-blue-500' : 'bg-orange-500'
                      }`} />
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 truncate">{trainee.funcao}</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Progresso</span>
                        <span className="text-gray-900 font-bold">{trainee.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            trainee.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${trainee.progress}%` }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : !userStatus ? (
          <motion.div 
            key="status-selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="pt-12"
          >
            <div className="max-w-3xl mx-auto px-4 mb-8">
              <button 
                onClick={() => setSelectedTrainee(null)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-6"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Voltar para Usuários</span>
              </button>
              
              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedTrainee.name}</h1>
                <p className="text-gray-500">Selecione a situação atual do usuário</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <motion.button
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setUserStatus('estagio');
                    setUserStatuses(prev => ({ ...prev, [selectedTrainee.id]: 'estagio' }));
                    setActiveTab('timeline');
                  }}
                  className="bg-white rounded-[28px] p-8 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col items-center text-center group"
                >
                  <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Estágio</h2>
                  <p className="text-sm text-gray-500">Usuário em período de estágio ou treinamento inicial.</p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setUserStatus('efetivado');
                    setUserStatuses(prev => ({ ...prev, [selectedTrainee.id]: 'efetivado' }));
                    setActiveTab('pending');
                  }}
                  className="bg-white rounded-[28px] p-8 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col items-center text-center group"
                >
                  <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-4 group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Efetivado</h2>
                  <p className="text-sm text-gray-500">Usuário já efetivado no cargo atual.</p>
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="pb-24"
          >
            {/* Header */}
            <header className="pt-14 pb-4 px-4 sticky top-0 bg-[#f2f2f6]/80 backdrop-blur-xl z-10 flex items-center gap-4">
              <button 
                onClick={() => setUserStatus(null)} 
                className="p-2 rounded-full hover:bg-gray-200/80 transition-colors bg-white shadow-sm"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{selectedTrainee.name}</h1>
                <p className="text-sm text-gray-500 font-medium">Mat: {selectedTrainee.matricula} • {userStatus === 'estagio' ? 'Estágio' : 'Efetivado'}</p>
              </div>
            </header>

            <main className="px-4 max-w-5xl mx-auto mt-4">
              {/* Top Card Toggle */}
              {userStatus === 'estagio' && (
                <div className="bg-white rounded-[28px] p-2 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.04)] mb-6 flex relative max-w-lg mx-auto">
                  <div 
                    className={`absolute top-2 bottom-2 w-[calc(33.33%-8px)] bg-gray-100 rounded-[20px] transition-transform duration-300 ease-in-out ${
                      activeTab === 'timeline' ? 'translate-x-0' : 
                      activeTab === 'form' ? 'translate-x-[calc(100%+8px)]' : 
                      'translate-x-[calc(200%+16px)]'
                    }`}
                  />
                  <button 
                    onClick={() => setActiveTab('timeline')}
                    className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-sm font-semibold relative z-10 transition-colors ${activeTab === 'timeline' ? 'text-gray-900' : 'text-gray-500'}`}
                  >
                    Linha do Tempo
                  </button>
                  <button 
                    onClick={() => setActiveTab('form')}
                    className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-sm font-semibold relative z-10 transition-colors ${activeTab === 'form' ? 'text-gray-900' : 'text-gray-500'}`}
                  >
                    Formulário
                  </button>
                  <button 
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-sm font-semibold relative z-10 transition-colors ${activeTab === 'pending' ? 'text-gray-900' : 'text-gray-500'}`}
                  >
                    Treinamentos
                  </button>
                </div>
              )}
              
              {userStatus === 'efetivado' && (
                <div className="bg-white rounded-[28px] p-2 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.04)] mb-6 flex relative max-w-lg mx-auto">
                  <div className="absolute top-2 bottom-2 left-2 right-2 bg-gray-100 rounded-[20px]" />
                  <button 
                    className="flex-1 py-2 sm:py-3 text-[11px] sm:text-sm font-semibold relative z-10 text-gray-900"
                  >
                    Treinamentos
                  </button>
                </div>
              )}

              {activeTab === 'timeline' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[28px] p-6 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.04)] max-w-7xl mx-auto"
                >
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                    <h2 className="text-lg font-semibold text-gray-800 max-md:text-center">Progresso do Treinamento</h2>
                    <div className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-medium max-md:h-[35px] max-md:w-[105px] max-md:px-0 max-md:py-0 max-md:flex max-md:items-center max-md:justify-center max-md:text-center">
                      {progressHours}h / {totalHours}h
                    </div>
                  </div>

                  <div className="relative h-[800px] md:h-[350px] mt-8 mb-16 max-w-2xl md:max-w-full mx-auto w-full">
                    <div className="absolute inset-0 md:left-[70px] md:right-[70px]">
                    <style>{`
                      .progress-line-anim {
                        height: ${Math.min((progressHours / totalHours) * 100, 100)}%;
                        width: 0.375rem;
                      }
                      .progress-tip-anim {
                        top: calc(${Math.min((progressHours / totalHours) * 100, 100)}% - 6px);
                        left: 50%;
                        transform: translateX(-50%);
                      }
                      @media (min-width: 768px) {
                        .progress-line-anim {
                          height: 0.375rem;
                          width: ${Math.min((progressHours / totalHours) * 100, 100)}%;
                        }
                        .progress-tip-anim {
                          top: 50%;
                          left: calc(${Math.min((progressHours / totalHours) * 100, 100)}% - 6px);
                          transform: translateY(-50%);
                        }
                      }
                    `}</style>

                    {/* Background Line */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1.5 bg-gray-100 rounded-full md:top-1/2 md:-translate-y-1/2 md:left-0 md:right-0 md:h-1.5 md:w-full md:translate-x-0"></div>
                    
                    {/* Progress Line */}
                    <div 
                      className="progress-line-anim absolute left-1/2 -translate-x-1/2 top-0 bg-blue-500 rounded-full origin-top md:top-1/2 md:-translate-y-1/2 md:left-0 md:origin-left md:translate-x-0 transition-all duration-[2000ms] ease-in-out"
                    ></div>

                    {/* Glowing Tip */}
                    <div
                      className="progress-tip-anim absolute w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_12px_4px_rgba(59,130,246,0.6)] z-20 transition-all duration-[2000ms] ease-in-out"
                      style={{ opacity: progressHours > 0 && progressHours < totalHours ? 1 : 0 }}
                    />

                    {/* Milestones */}
                    {(() => {
                      const milestones = [
                        { hours: 0, color: '#3b82f6', label: 'Início' },
                        { hours: 100, color: '#22c55e', label: 'Marco 1', comment: 'Precisa melhorar a comunicação via rádio e atenção aos sinais sonoros.', inspector: 'Petrus' },
                        { hours: 200, color: '#f97316', label: 'Marco 2', comment: 'Evolução notável na operação do virador. Manter o foco na segurança.', inspector: 'Marcio Flavio' },
                        { hours: 300, color: '#a855f7', label: 'Marco 3', comment: 'Apto nas manobras básicas. Focar agora em situações de emergência.', inspector: 'Francenilde' },
                        { hours: 432, color: '#10b981', label: 'Conclusão', comment: 'Treinamento concluído com sucesso. Apto para operação assistida.', inspector: 'Petrus' }
                      ];
                      const currentMilestone = milestones.slice().reverse().find(m => progressHours >= m.hours);

                      return milestones.map((milestone, index) => {
                        const isReached = progressHours >= milestone.hours;
                        const percentage = (milestone.hours / totalHours) * 100;
                        const reachTime = progressHours > 0 ? (milestone.hours / progressHours) * 2 : 0;
                        const shouldAnimate = isReached && progressHours > 0 && milestone.hours > 0;
                        const isActive = currentMilestone?.hours === milestone.hours && progressHours < totalHours;
                        
                        return (
                          <div key={milestone.hours}>
                            <style>{`
                              .milestone-${index} {
                                top: ${percentage}%;
                                left: 50%;
                                transform: translate(-50%, -50%);
                              }
                              @media (min-width: 768px) {
                                .milestone-${index} {
                                  top: 50%;
                                  left: ${percentage}%;
                                }
                              }
                            `}</style>
                            <div className={`milestone-${index} absolute flex items-center justify-center z-10`}>
                              
                              {/* Center: Dot */}
                              <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
                                {/* Background dot */}
                                <div className="absolute inset-0 rounded-full border-4 border-white bg-gray-200 shadow-sm"></div>
                                
                                {/* Animated colored dot */}
                                <motion.div
                                  className="absolute inset-0 rounded-full border-4 border-white shadow-sm"
                                  initial={{ backgroundColor: '#e5e7eb', scale: 0.5, opacity: 0 }}
                                  animate={{
                                    backgroundColor: isReached ? milestone.color : '#e5e7eb',
                                    scale: isReached ? 1 : 0.5,
                                    opacity: isReached ? 1 : 0
                                  }}
                                  transition={{
                                    duration: 0.4,
                                    delay: shouldAnimate ? reachTime : 0,
                                    ease: "easeOut"
                                  }}
                                />

                                {/* Pulsing ring for active milestone */}
                                {isActive && (
                                  <motion.div
                                    className="absolute inset-0 rounded-full border-2"
                                    style={{ borderColor: milestone.color }}
                                    initial={{ scale: 1, opacity: 0.8 }}
                                    animate={{ scale: 1.8, opacity: 0 }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                                  />
                                )}
                              </div>

                              {/* Comment Box (Left on mobile, Bottom on desktop) */}
                              {milestone.comment && (
                                <div className="absolute right-full top-1/2 -translate-y-1/2 pr-4 w-[calc(50vw-45px)] sm:w-[200px] md:right-auto md:left-1/2 md:-translate-x-1/2 md:translate-y-0 md:top-full md:pt-6 md:pr-0 md:w-[140px] z-20">
                                  <motion.div 
                                    className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center relative shadow-sm"
                                    initial={{ opacity: 0.5, scale: 0.9 }}
                                    animate={{
                                      opacity: isReached ? 1 : 0.4,
                                      scale: isReached ? 1 : 0.9
                                    }}
                                    transition={{
                                      duration: 0.4,
                                      delay: shouldAnimate ? reachTime : 0,
                                      ease: "easeOut"
                                    }}
                                  >
                                    {/* Triangle pointer (Mobile: Right) */}
                                    <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-gray-50 md:hidden"></div>
                                    
                                    {/* Triangle pointer (Desktop: Top) */}
                                    <div className="hidden md:block absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent -top-2 border-b-[8px] border-b-gray-50"></div>
                                    
                                    <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">Avaliação do Inspetor</p>
                                    <p className={`text-xs leading-relaxed ${isReached ? 'text-gray-700' : 'text-gray-400'} mb-2`}>
                                      {milestone.comment}
                                    </p>
                                    {milestone.inspector && (
                                      <div className="flex justify-center">
                                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-100 uppercase tracking-tight">
                                          {milestone.inspector}
                                        </span>
                                      </div>
                                    )}
                                  </motion.div>
                                </div>
                              )}

                              {/* Label (Right on mobile, Top on desktop) */}
                              <div className="absolute left-full top-1/2 -translate-y-1/2 pl-4 md:left-1/2 md:-translate-x-1/2 md:translate-y-0 md:bottom-full md:pb-6 md:top-auto md:pl-0 text-left md:text-center w-max z-20">
                                <motion.div 
                                  className="bg-white/80 backdrop-blur-sm py-1 px-2 rounded-md"
                                  initial={{ opacity: 0.5 }}
                                  animate={{ opacity: isReached ? 1 : 0.5 }}
                                  transition={{
                                    duration: 0.4,
                                    delay: shouldAnimate ? reachTime : 0,
                                    ease: "easeOut"
                                  }}
                                >
                                  <div className="flex flex-col items-start md:items-center">
                                    <p className="text-sm font-bold transition-colors duration-300 whitespace-nowrap" style={{ color: isReached ? '#111827' : '#9ca3af' }}>
                                      {milestone.label}
                                    </p>
                                    <p className="text-xs text-gray-500 whitespace-nowrap">{milestone.hours} horas</p>
                                  </div>
                                </motion.div>
                              </div>

                            </div>
                          </div>
                        );
                      });
                    })()}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'form' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex justify-end mb-4">
                    <button 
                      onClick={handleDownloadPDF}
                      disabled={isDownloading}
                      className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 px-5 py-2.5 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      {isDownloading ? 'Gerando PDF...' : 'Baixar PDF'}
                    </button>
                  </div>
                  
                  <div ref={formRef} className="bg-gray-50 -mx-4 px-4 sm:mx-0 sm:px-0 pb-4">
                    <div className="bg-white rounded-[28px] p-6 shadow-sm mb-6">
                      <h2 className="text-lg font-semibold mb-4 text-gray-800">Dados do Treinamento</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1 md:col-span-3">
                        <label className="text-xs font-medium text-gray-500 ml-1">Nome</label>
                        <input type="text" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                      </div>
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-xs font-medium text-gray-500 ml-1">Matrícula</label>
                        <input type="text" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.matricula} onChange={e => setFormData({...formData, matricula: e.target.value})} />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-medium text-gray-500 ml-1">Supervisor</label>
                        <input type="text" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.supervisor} onChange={e => setFormData({...formData, supervisor: e.target.value})} />
                      </div>
                      <div className="space-y-1 md:col-span-3">
                        <label className="text-xs font-medium text-gray-500 ml-1">Função em Treinamento</label>
                        <input type="text" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.funcao} onChange={e => setFormData({...formData, funcao: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 ml-1">Horas previstas</label>
                        <input type="text" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.horasPrevistas} onChange={e => setFormData({...formData, horasPrevistas: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 ml-1">Horas realizadas</label>
                        <input type="text" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.horasRealizadas} onChange={e => setFormData({...formData, horasRealizadas: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 ml-1">Horas faltantes</label>
                        <input type="text" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.horasFaltantes} onChange={e => setFormData({...formData, horasFaltantes: e.target.value})} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[28px] p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                      <h2 className="text-lg font-semibold text-gray-800">Registros de Atividade</h2>
                      <button onClick={addRow} className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors max-md:w-[210px] max-md:h-[60px] max-md:text-[14px] max-md:leading-[18px] max-md:-ml-[2px]">
                        <Plus className="w-4 h-4" /> Adicionar Linha
                      </button>
                    </div>
                    
                    <div className="max-md:overflow-x-auto md:overflow-visible pb-4">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="pb-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Local</th>
                            <th className="pb-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">Equipamento/Atividade</th>
                            <th className="pb-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Data</th>
                            <th className="pb-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Hora</th>
                            <th className="pb-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Duração</th>
                            <th className="pb-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Instrutor</th>
                            <th className="pb-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Avaliação/Obs</th>
                            <th className="pb-3 px-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {tableRows.map(row => (
                            <tr key={row.id} className="group">
                              <td className="py-2 px-1 relative">
                                <div className="relative" ref={openDropdownId === `local-${row.id}` ? dropdownRef : null}>
                                  <button
                                    onClick={() => setOpenDropdownId(openDropdownId === `local-${row.id}` ? null : `local-${row.id}`)}
                                    className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 outline-none text-sm transition-colors flex items-center justify-between group/btn"
                                  >
                                    <span className={row.local ? 'text-gray-900' : 'text-gray-400'}>
                                      {row.local || 'Selecione...'}
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${openDropdownId === `local-${row.id}` ? 'rotate-180' : ''}`} />
                                  </button>

                                  <AnimatePresence>
                                    {openDropdownId === `local-${row.id}` && (
                                      <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden py-1 min-w-[160px]"
                                      >
                                        {LOCAL_OPTIONS.map((option) => (
                                          <button
                                            key={option}
                                            onClick={() => {
                                              updateRow(row.id, 'local', option);
                                              setOpenDropdownId(null);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-blue-50 hover:text-blue-600 ${row.local === option ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600'}`}
                                          >
                                            {option}
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </td>
                              <td className="py-2 px-1"><input type="text" className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 outline-none text-sm transition-colors" value={row.equipamento} onChange={e => updateRow(row.id, 'equipamento', e.target.value)} /></td>
                              <td className="py-2 px-1 relative">
                                <div className="relative" ref={openDropdownId === `date-${row.id}` ? datePickerRef : null}>
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(openDropdownId === `date-${row.id}` ? null : `date-${row.id}`);
                                      if (row.data) setCurrentMonth(parseISO(row.data));
                                    }}
                                    className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 outline-none text-sm transition-colors flex items-center justify-between group/btn"
                                  >
                                    <span className={row.data ? 'text-gray-900' : 'text-gray-400'}>
                                      {row.data ? format(parseISO(row.data), 'dd/MM/yyyy') : 'DD/MM/AAAA'}
                                    </span>
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                  </button>

                                  <AnimatePresence>
                                    {openDropdownId === `date-${row.id}` && renderCalendar(row.id, row.data)}
                                  </AnimatePresence>
                                </div>
                              </td>
                              <td className="py-2 px-1"><input type="text" placeholder="00:00" className="w-full max-md:h-[34px] max-md:w-[53px] bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 outline-none text-sm transition-colors" value={row.hora} onChange={e => updateRow(row.id, 'hora', e.target.value)} /></td>
                              <td className="py-2 px-1"><input type="text" placeholder="0h" className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 outline-none text-sm transition-colors" value={row.duracao} onChange={e => updateRow(row.id, 'duracao', e.target.value)} /></td>
                              <td className="py-2 px-1"><input type="text" className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 outline-none text-sm transition-colors" value={row.instrutor} onChange={e => updateRow(row.id, 'instrutor', e.target.value)} /></td>
                              <td className="py-2 px-1"><input type="text" className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1.5 outline-none text-sm transition-colors" value={row.avaliacao} onChange={e => updateRow(row.id, 'avaliacao', e.target.value)} /></td>
                              <td className="py-2 px-1 text-center">
                                <button onClick={() => removeRow(row.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'pending' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-white rounded-[28px] p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-6 text-gray-800">Treinamentos Pendentes</h2>
                    
                    <div className="space-y-4">
                      {[
                        { title: 'Operação de Guindaste RTG', status: 'overdue', date: '28 Mar 2024', priority: 'Alta' },
                        { title: 'Segurança em Altura (NR-35)', status: 'pending', date: '15 Abr 2024', priority: 'Média' },
                        { title: 'Manutenção de Motores Diesel', status: 'pending', date: '22 Abr 2024', priority: 'Baixa' },
                        { title: 'Primeiros Socorros Avançado', status: 'overdue', date: '01 Abr 2024', priority: 'Alta' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.status === 'overdue' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                              {item.status === 'overdue' ? <AlertCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {item.date}
                                </span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                  item.priority === 'Alta' ? 'bg-red-100 text-red-600' : 
                                  item.priority === 'Média' ? 'bg-orange-100 text-orange-600' : 
                                  'bg-blue-100 text-blue-600'
                                }`}>
                                  Prioridade {item.priority}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">
                            Iniciar Treinamento
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-[28px] p-6 shadow-sm border border-green-50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-800">Concluídos Recentemente</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded-lg transition-colors">
                          <span className="text-gray-600">Direção Defensiva</span>
                          <span className="text-green-600 font-bold">100%</span>
                        </div>
                        <div className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded-lg transition-colors">
                          <span className="text-gray-600">Ética e Conduta</span>
                          <span className="text-green-600 font-bold">100%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[28px] p-6 shadow-sm border border-blue-50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                          <Clock className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-800">Próximos Vencimentos</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded-lg transition-colors">
                          <span className="text-gray-600">NR-10 Básico</span>
                          <span className="text-orange-500 font-bold">12 dias</span>
                        </div>
                        <div className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded-lg transition-colors">
                          <span className="text-gray-600">Operação Empilhadeira</span>
                          <span className="text-orange-500 font-bold">24 dias</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
