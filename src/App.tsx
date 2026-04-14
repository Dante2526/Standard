/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Trash2, ChevronDown, Calendar, ChevronLeft, ChevronRight, User as UserIcon, Clock, AlertCircle, CheckCircle2, Download, GraduationCap, Briefcase, Moon, Sun, Lightbulb, TrendingUp, Target, Upload, Check, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
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
import { collection, query, where, getDocs, doc, setDoc, getDoc, onSnapshot, serverTimestamp, addDoc, orderBy, limit } from 'firebase/firestore';
import { db, auth, signInAnonymously, newDb, newAuth, newStorage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import DarkModeToggle from './components/DarkModeToggle';
import { KAIZEN_DATA } from './kaizenData';

const LOCAL_OPTIONS = [
  "RECEPÇÃO", "VIRADOR", "GIROFLEX", "CLASSIFICAÇÃO", 
  "RECLASSIFICAÇÃO", "OFICINA", "FORMAÇÃO", "CTR"
];

const FUNCAO_OPTIONS = [
  "OFICIAL DE OPERAÇÕES FERROVIÁRIAS",
  "MAQUINISTA PÁTIO"
];

const PRESET_HOURS = ["432", "240"];

type ClassItem = {
  id: number;
  name: string;
  students: number;
  time: string;
  color: string;
};

type Trainee = {
  id: number | string;
  name: string;
  matricula: string;
  funcao: string;
  progress: number;
  status: 'active' | 'pending' | 'completed' | 'none';
};

export default function App() {
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);
  const [userStatus, setUserStatus] = useState<'estagio' | 'efetivado' | null>(null);
  const [userStatuses, setUserStatuses] = useState<Record<string | number, 'estagio' | 'efetivado'>>({});
  const [userTabsHidden, setUserTabsHidden] = useState<Record<string | number, boolean>>({});
  const [showHideTabsModal, setShowHideTabsModal] = useState(false);
  const [pendingHideAction, setPendingHideAction] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'timeline' | 'pending' | 'kaizen'>('timeline');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [isLoadingTrainees, setIsLoadingTrainees] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [isLoadingLogin, setIsLoadingLogin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const hasLoadedDataRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  // Global Upload State
  const [showGlobalUploadModal, setShowGlobalUploadModal] = useState(false);
  const [globalUploadType, setGlobalUploadType] = useState<'kaizen' | 'treinamento'>('kaizen');
  const [globalFile, setGlobalFile] = useState<File | null>(null);
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
  const [globalUploadSuccess, setGlobalUploadSuccess] = useState(false);
  const [realTrainings, setRealTrainings] = useState<any[]>([]);
  const [isLoadingTrainings, setIsLoadingTrainings] = useState(false);
  const [userName, setUserName] = useState('');
  const [milestoneEvaluations, setMilestoneEvaluations] = useState<Record<number, { comment: string, inspector: string }>>({});
  const [editingMilestone, setEditingMilestone] = useState<number | null>(null);
  const [isFuncaoDropdownOpen, setIsFuncaoDropdownOpen] = useState(false);

  const handleToggleProfileMenu = () => {
    setIsProfileMenuOpen(prev => !prev);
  };

  const handleOpenGlobalRepo = () => {
    setShowGlobalUploadModal(true);
    setIsProfileMenuOpen(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setSelectedClass(null);
    setIsProfileMenuOpen(false);
  };

  const scrollToLetter = (letter: string) => {
    const firstTrainee = trainees.find(t => t.name.toUpperCase().startsWith(letter));
    if (firstTrainee) {
      const element = document.getElementById(`trainee-card-${firstTrainee.id}`);
      if (element) {
        const yOffset = -100; 
        const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({top: y, behavior: 'smooth'});
      }
    }
  };

  const handleGlobalUpload = async () => {
    if (!globalFile) return;

    setIsUploadingGlobal(true);
    setGlobalUploadSuccess(false);
    
    try {
      // GARANTE QUE ESTÁ AUTENTICADO NO BANCO NOVO (Evita erro de Permissão Insuficiente)
      if (!newAuth.currentUser) {
        await signInAnonymously(newAuth);
      }

      // LÊ O CONTEÚDO DO ARQUIVO DIRETAMENTE PELO COMPLEMENTO DO NAVEGADOR
      const fileText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(globalFile, 'utf-8'); 
      });

      // PARSEIA O CSV (quebra as linhas e as colunas baseadas em vírgula ou ponto-e-vírgula)
      const rows = fileText.split(/\r?\n/);
      const parsedRows = rows.map(row => {
        // Suporta tanto CSV em padrão americano (vírgula) quanto brasileiro (ponto-e-vírgula)
        const delimiter = row.includes(';') ? ';' : ',';
        return row.split(delimiter).map(cell => cell.trim());
      });
      
      // FILTRA linhas que possam estar completamente em branco no final do arquivo
      const filteredRows = parsedRows.filter(row => row.some(cell => cell !== ''));

      // FIREBASE NÃO ACEITA ARRAYS DENTRO DE ARRAYS (Nested Arrays).
      // Entao nós transformamos a lista em um objeto estruturado: [{ linha: 1, colunas: ["A"] }]
      const structuredData = filteredRows.map((row, index) => ({
        index: index,
        colunas: row
      }));

      // SALVA TUDO ESTRUTURADA NO FIRESTORE (Database)
      await addDoc(collection(newDb, 'global_files'), {
        name: globalFile.name,
        type: globalUploadType,
        uploadedAt: serverTimestamp(),
        uploadedBy: loginEmail,
        isRawData: true,
        // Guardamos os dados de forma estruturada para o Firestore ler tranquilamente
        parsedData: structuredData,
      });
      
      setGlobalUploadSuccess(true);
      setTimeout(() => {
        setShowGlobalUploadModal(false);
        setGlobalFile(null);
        setGlobalUploadSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Erro ao fazer o processamento do arquivo global:", error);
      alert("Erro ao ler o arquivo. Certifique-se de anexar planilhas em formato texto (.CSV, etc).");
    } finally {
      setIsUploadingGlobal(false);
    }
  };

  // Carregar dados de estágio do novo banco de dados quando um trainee é selecionado
  useEffect(() => {
    if (!selectedTrainee) return;
    hasLoadedDataRef.current = false;

    const unsubscribe = onSnapshot(doc(newDb, 'estagios', selectedTrainee.matricula), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.tableRows) {
          setTableRows(data.tableRows);
        }
        if (data.milestoneEvaluations) {
          setMilestoneEvaluations(data.milestoneEvaluations);
        }
        if (data.status) {
          const statusChanged = data.status !== userStatus;
          setUserStatus(data.status);
          setUserStatuses(prev => ({ ...prev, [selectedTrainee.id]: data.status }));
          
          // Só muda a aba automaticamente na CARGA INICIAL ou se o status MUDAR de fato
          if (!hasLoadedDataRef.current || statusChanged) {
            if (data.status === 'efetivado') {
              setUserTabsHidden(prev => ({ ...prev, [selectedTrainee.id]: true }));
              setActiveTab('pending');
            } else {
              setUserTabsHidden(prev => ({ ...prev, [selectedTrainee.id]: false }));
              setActiveTab('timeline');
            }
          }
        }
      } else {
        // Se não existir, resetar para o padrão
        setTableRows([
          { id: 1, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' },
          { id: 2, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' },
          { id: 3, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' },
        ]);
        setUserStatus(isAdmin ? 'estagio' : null);
        setUserTabsHidden(prev => ({ ...prev, [selectedTrainee.id]: false }));
        setActiveTab('timeline');
      }
      // Marca que os dados iniciais foram carregados (com delay para não disparar auto-save imediatamente)
      setTimeout(() => { hasLoadedDataRef.current = true; }, 1000);
    });

    return () => unsubscribe();
  }, [selectedTrainee, userStatus, isAdmin]);


  const saveStageData = async () => {
    if (!selectedTrainee) return;
    
    try {
      setIsSaving(true);
      await setDoc(doc(newDb, 'estagios', selectedTrainee.matricula), {
        matricula: selectedTrainee.matricula,
        nome: selectedTrainee.name,
        horasAcumuladas: progressHours,
        status: userStatus,
        tableRows: tableRows,
        dataInicio: format(new Date(), 'yyyy-MM-dd'), // Simplificado para o exemplo
        ultimaAtualizacao: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar dados de estágio:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  const [isDownloading, setIsDownloading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const totalHours = 432;

  const classesList = [
    { id: 'turma a', name: 'TURMA A', letter: 'A', color: 'bg-[#3b82f6]', students: 32 },
    { id: 'turma b', name: 'TURMA B', letter: 'B', color: 'bg-[#10b981]', students: 28 },
    { id: 'turma c', name: 'TURMA C', letter: 'C', color: 'bg-[#f97316]', students: 35 },
    { id: 'turma d', name: 'TURMA D', letter: 'D', color: 'bg-[#ef4444]', students: 25 },
  ];

  useEffect(() => {
    // Conecta anonimamente aos dois bancos para satisfazer a regra request.auth != null
    signInAnonymously(auth).catch(error => {
      console.error("Erro na autenticação anônima (Banco Antigo):", error);
    });
    signInAnonymously(newAuth).catch(error => {
      console.error("Erro na autenticação anônima (Banco Novo):", error);
    });
  }, []);

  const fetchRealTrainings = async (trainee: Trainee) => {
    setIsLoadingTrainings(true);
    setRealTrainings([]);
    try {
      // Busca o último upload no banco
      const q = query(collection(newDb, 'global_files'), orderBy('uploadedAt', 'desc'), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const fileData = snap.docs[0].data();
        const parsedData = fileData.parsedData || [];
        
        // Filtra os treinamentos desse colaborador priorizando a Matrícula
        const matches = parsedData.filter((row: any, idx: number) => {
          if (idx === 0) return false; 

          const rowMatricula = (row.colunas[1] || '').toString().trim();
          const rowName = (row.colunas[0] || '').toString().toUpperCase().trim();
          
          const targetMatricula = (trainee.matricula || '').toString().trim();
          const targetName = (trainee.name || '').toString().toUpperCase().trim();
          
          // Lógica: Se temos matrícula em ambos os lados, usamos ela (é único)
          // Se não, tentamos o match por nome como fallback
          if (targetMatricula && rowMatricula) {
            return rowMatricula === targetMatricula;
          }
          
          return targetName && (rowName.includes(targetName) || targetName.includes(rowName));
        }).map((row: any) => {
          const statusRaw = (row.colunas[4] || '').toString().trim();
          const daysLeftStr = (row.colunas[6] || '').toString().trim();
          const daysLeft = parseInt(daysLeftStr);

          // Se o status for "Realizado", é concluído. 
          // Se houver "Dias restantes" e for baixo, podemos considerar próximo do vencimento.
          return {
            title: row.colunas[3] || 'Treinamento sem título',
            status: statusRaw === 'Realizado' ? 'completed' : 'pending',
            date: row.colunas[5] || 'Sem data',
            priority: isNaN(daysLeft) ? 'Média' : (daysLeft < 30 ? 'Alta' : (daysLeft < 90 ? 'Média' : 'Baixa')),
            daysRemaining: isNaN(daysLeft) ? null : daysLeft
          };
        });
        
        setRealTrainings(matches);
      }
    } catch (error) {
      console.error("Erro crítico ao buscar treinamentos reais:", error);
    } finally {
      setIsLoadingTrainings(false);
    }
  };

  useEffect(() => {
    if (selectedTrainee) {
      fetchRealTrainings(selectedTrainee);
    } else {
      setRealTrainings([]);
    }
  }, [selectedTrainee]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDownloadPNG = async () => {
    if (!formRef.current) return;
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb'
      });
      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = 'formulario-treinamento.png';
      a.click();
    } catch (error) {
      console.error('Error generating PNG:', error);
    } finally {
      setIsDownloading(false);
      setIsDownloadMenuOpen(false);
    }
  };

  const handleDownloadExcel = () => {
    try {
      setIsDownloading(true);
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Dados do Treinamento'],
        [],
        ['Nome', formData.nome],
        ['Matrícula', formData.matricula],
        ['Supervisor', formData.supervisor],
        ['Função', formData.funcao],
        ['Horas Previstas', formData.horasPrevistas],
        ['Horas Realizadas', formData.horasRealizadas],
        ['Horas Faltantes', formData.horasFaltantes],
        [],
        ['Local', 'Equipamento', 'Data', 'Hora', 'Duração', 'Instrutor', 'Avaliação']
      ];
      
      tableRows.forEach(row => {
        wsData.push([row.local, row.equipamento, row.data, row.hora, row.duracao, row.instrutor, row.avaliacao]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Treinamento');
      XLSX.writeFile(wb, 'formulario-treinamento.xlsx');
    } catch (error) {
      console.error('Error generating Excel:', error);
    } finally {
      setIsDownloading(false);
      setIsDownloadMenuOpen(false);
    }
  };

  const handleDownloadWord = async () => {
    try {
      setIsDownloading(true);
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ children: [new TextRun({ text: "Dados do Treinamento", bold: true, size: 28 })] }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: `Nome: ${formData.nome}` }),
            new Paragraph({ text: `Matrícula: ${formData.matricula}` }),
            new Paragraph({ text: `Supervisor: ${formData.supervisor}` }),
            new Paragraph({ text: `Função: ${formData.funcao}` }),
            new Paragraph({ text: `Horas Previstas: ${formData.horasPrevistas}` }),
            new Paragraph({ text: `Horas Realizadas: ${formData.horasRealizadas}` }),
            new Paragraph({ text: `Horas Faltantes: ${formData.horasFaltantes}` }),
            new Paragraph({ text: "" }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Local", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Equipamento", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Data", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Hora", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Duração", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Instrutor", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Avaliação", bold: true })] })] }),
                  ]
                }),
                ...tableRows.map(row => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(row.local)] }),
                    new TableCell({ children: [new Paragraph(row.equipamento)] }),
                    new TableCell({ children: [new Paragraph(row.data)] }),
                    new TableCell({ children: [new Paragraph(row.hora)] }),
                    new TableCell({ children: [new Paragraph(row.duracao)] }),
                    new TableCell({ children: [new Paragraph(row.instrutor)] }),
                    new TableCell({ children: [new Paragraph(row.avaliacao)] }),
                  ]
                }))
              ]
            })
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "formulario-treinamento.docx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating Word:', error);
    } finally {
      setIsDownloading(false);
      setIsDownloadMenuOpen(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    
    try {
      // Pequena espera adicional para estabilização do DOM
      await new Promise(resolve => setTimeout(resolve, 200));

      if (!formRef.current) {
        alert("Ops! Não conseguimos localizar o formulário para gerar o PDF. Verifique se a aba de Treinamentos está visível e tente novamente.");
        setIsDownloading(false);
        return;
      }

      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb'
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
      alert("Houve um erro ao gerar o PDF. Por favor, tente novamente.");
    } finally {
      setIsDownloading(false);
      setIsDownloadMenuOpen(false);
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
        className="absolute z-50 bottom-full mb-2 bg-surface rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-border-subtle p-4 w-[280px] left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0"
      >
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={(e) => { e.stopPropagation(); setCurrentMonth(subMonths(currentMonth, 1)); }}
            className="p-1.5 hover:bg-background rounded-full transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-content-muted" />
          </button>
          <span className="text-sm font-bold text-content capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); setCurrentMonth(addMonths(currentMonth, 1)); }}
            className="p-1.5 hover:bg-background rounded-full transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-content-muted" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
            <div key={i} className="text-[10px] font-bold text-content-muted text-center py-1">
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
                    isCurrentMonth ? 'text-content hover:bg-background' : 'text-content-muted'}
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

  // Sincronizar horas realizadas e faltantes automaticamente
  useEffect(() => {
    const prev = parseInt(formData.horasPrevistas || '0');
    const realized = progressHours;
    const faltantes = Math.max(0, prev - realized);
    
    setFormData(current => ({
      ...current,
      horasRealizadas: realized.toString(),
      horasFaltantes: faltantes.toString()
    }));
  }, [progressHours, formData.horasPrevistas]);

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

  useEffect(() => {
    if (selectedTrainee && userStatus === 'estagio' && progressHours >= 432) {
      setUserStatus('efetivado');
      setUserStatuses(prev => ({ ...prev, [selectedTrainee.id]: 'efetivado' }));
      setShowHideTabsModal(true);
      
      // Salvar automaticamente a efetivação no banco de dados
      const autoSaveEfetivacao = async () => {
        try {
          await setDoc(doc(newDb, 'estagios', selectedTrainee.matricula), {
            matricula: selectedTrainee.matricula,
            nome: selectedTrainee.name,
            horasAcumuladas: progressHours,
            status: 'efetivado',
            tableRows: tableRows,
            milestoneEvaluations: milestoneEvaluations,
            ultimaAtualizacao: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          console.error("Erro ao salvar efetivação automática:", e);
        }
      };
      autoSaveEfetivacao();
    }
  }, [progressHours, userStatus, selectedTrainee]);

  // Auto-save com debounce de 2 segundos (Reposicionado para apoiar progressHours e tableRows)
  useEffect(() => {
    if (!selectedTrainee || !hasLoadedDataRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setAutoSaveStatus('idle');
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        setIsSaving(true);
        await setDoc(doc(newDb, 'estagios', selectedTrainee.matricula), {
          matricula: selectedTrainee.matricula,
          nome: selectedTrainee.name,
          horasAcumuladas: progressHours,
          status: userStatus,
          tableRows: tableRows,
          milestoneEvaluations: milestoneEvaluations,
          dataInicio: format(new Date(), 'yyyy-MM-dd'),
          ultimaAtualizacao: new Date().toISOString()
        }, { merge: true });
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } catch (error) {
        console.error("Erro no auto-save:", error);
        setAutoSaveStatus('idle');
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [tableRows, userStatus, progressHours, selectedTrainee, milestoneEvaluations]);

  return (
    <div className="min-h-screen bg-background text-content font-sans selection:bg-blue-200 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex items-center justify-center p-4 relative"
          >
            <div className="absolute top-6 right-6">
              <DarkModeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
            </div>
            <div className="bg-surface rounded-[32px] p-8 shadow-xl max-w-md w-full border border-border-subtle flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-content mb-2 tracking-tight">Bem-vindo</h1>
              <p className="text-content-muted mb-8">Faça login com seu email corporativo</p>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                const trimmedEmail = loginEmail.trim().toLowerCase();
                if (!trimmedEmail) return;
                
                setIsLoadingLogin(true);
                setLoginError('');
                
                try {
                  const emailLower = trimmedEmail;
                  
                  // 1. Verifica se é administrador
                  const adminQ = query(collection(db, 'administrators'), where('email', '==', emailLower));
                  const adminSnap = await getDocs(adminQ);
                  
                  if (!adminSnap.empty) {
                    const adminData = adminSnap.docs[0].data();
                    const rawName = adminData.nome || adminData.name || trimmedEmail.split('.')[0] || 'Admin';
                    setUserName(rawName.split(' ')[0].toUpperCase());
                    setIsAdmin(true);
                    setIsLoggedIn(true);
                    return;
                  }

                  // 2. Verifica se é aluno em alguma turma
                  const turmas = ['turma a', 'turma b', 'turma c', 'turma d'];
                  for (const turma of turmas) {
                    const turmaQ = query(collection(db, turma), where('email', '==', emailLower));
                    const turmaSnap = await getDocs(turmaQ);
                    
                    if (!turmaSnap.empty) {
                      const traineeDoc = turmaSnap.docs[0];
                      const t = traineeDoc.data();
                      setIsAdmin(false);
                      setIsLoggedIn(true);
                      // Buscar progresso no novo banco de dados
                      const stageSnap = await getDoc(doc(newDb, 'estagios', t.matricula || ''));
                      const stageData = stageSnap.exists() ? stageSnap.data() as any : null;

                      const traineeObj: Trainee = {
                        id: traineeDoc.id,
                        name: t.nome || t.name || 'Usuário',
                        matricula: t.matricula || '',
                        funcao: t.funcao || '',
                        progress: stageData ? Math.round((stageData.horasAcumuladas / 432) * 100) : 0,
                        status: stageData?.status === 'efetivado' ? 'completed' : 'active'
                      };
                      setUserName(traineeObj.name.split(' ')[0].toUpperCase());
                      setSelectedTrainee(traineeObj);
                      setFormData(prev => ({
                        ...prev,
                        nome: traineeObj.name,
                        matricula: traineeObj.matricula,
                        funcao: traineeObj.funcao
                      }));
                      return;
                    }
                  }

                  setLoginError('Email não encontrado no sistema.');
                } catch (error: any) {
                  console.error("Erro ao fazer login:", error);
                  setLoginError(error.message || 'Erro de conexão com o banco de dados.');
                } finally {
                  setIsLoadingLogin(false);
                }
              }} className="space-y-4 w-full text-left">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-content mb-1.5 pl-1">
                    <span className="text-yellow-600 font-bold">*Digite tudo em minúsculo</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nome@empresa.com.br"
                    className="w-full px-4 py-3 rounded-2xl border border-border-subtle focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background focus:bg-surface"
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
        ) : isAdmin && !selectedClass ? (
          <motion.div 
            key="classes"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="pt-12"
          >
            <div className="max-w-4xl mx-auto px-4 mb-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-content">Colaboradores</h1>
                  <p className="text-content-muted">Selecione uma turma para visualizar os colaboradores</p>
                </div>
                <div className="flex items-center gap-4 relative">
                  <DarkModeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
                  <button 
                    className="aspect-square w-10 h-10 rounded-[12px] bg-blue-50/80 dark:bg-surface border border-blue-200 dark:border-border-subtle flex items-center justify-center shadow-sm hover:shadow hover:bg-blue-100 dark:hover:bg-border-subtle/50 transition-all text-blue-600 dark:text-blue-400 font-bold text-sm" 
                    onClick={handleToggleProfileMenu}
                  >
                    {loginEmail.charAt(0).toUpperCase()}
                  </button>
                  
                  <AnimatePresence>
                    {isProfileMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-12 right-0 w-56 bg-surface border border-border-subtle rounded-2xl shadow-xl overflow-hidden z-50 p-2"
                      >
                        <div className="px-3 pb-3 pt-1 border-b border-border-subtle mb-2">
                          <p className="text-sm font-semibold text-content truncate">{loginEmail}</p>
                          <p className="text-xs text-content-muted mt-0.5">Administrador</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={handleOpenGlobalRepo}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-content bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-800/50"
                          >
                            <Upload className="w-4 h-4 text-emerald-500" />
                            Repositório Global
                          </button>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Sair
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card de Controle de Estágio Global */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    setSelectedClass('global-estagio');
                    setIsLoadingTrainees(true);
                    try {
                      // Buscar todos os estágios do novo banco de dados
                      const snap = await getDocs(collection(newDb, 'estagios'));
                      const traineesData = snap.docs.map(docSnapshot => {
                        const data = docSnapshot.data() as any;
                        return {
                          id: docSnapshot.id,
                          name: data.nome || 'Sem Nome',
                          matricula: data.matricula || '',
                          funcao: data.funcao || 'Colaborador',
                          progress: Math.round((data.horasAcumuladas / 432) * 100),
                          status: data.status === 'efetivado' ? 'completed' : data.status === 'estagio' ? 'active' : 'none'
                        };
                      }).sort((a, b) => a.name.localeCompare(b.name));
                      setTrainees(traineesData);
                    } catch (e) {
                      console.error("Erro ao buscar controle de estágio:", e);
                    } finally {
                      setIsLoadingTrainees(false);
                    }
                  }}
                  className="bg-surface rounded-[32px] p-8 flex flex-col items-center justify-center shadow-sm border border-blue-100 bg-blue-50/30 hover:shadow-md transition-all cursor-pointer md:col-span-2"
                >
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white mb-4 shadow-sm">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-content tracking-wide mb-1 text-center">Controle de Colaboradores</h3>
                  <p className="text-sm text-content-muted mb-2 text-center max-w-md">
                    Visualize o progresso de todos os colaboradores cadastrados no novo banco de dados.
                  </p>
                </motion.div>

                {classesList.map((cls, index) => (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      setSelectedClass(cls.id);
                      setIsLoadingTrainees(true);
                      try {
                        const snap = await getDocs(collection(db, cls.id));
                        const traineesData = (await Promise.all(snap.docs.map(async docSnapshot => {
                          const data = docSnapshot.data() as any;
                          // Buscar progresso no novo banco de dados
                          const stageSnap = await getDoc(doc(newDb, 'estagios', data.matricula || ''));
                          const stageData = stageSnap.exists() ? stageSnap.data() as any : null;
                          
                          return {
                            id: docSnapshot.id,
                            name: data.nome || data.name || 'Sem Nome',
                            matricula: data.matricula || '',
                            funcao: data.funcao || '',
                            email: data.email || '',
                            progress: stageData ? Math.round((stageData.horasAcumuladas / 432) * 100) : 0,
                            status: stageData?.status === 'efetivado' ? 'completed' : stageData?.status === 'estagio' ? 'active' : 'none'
                          };
                        }))).sort((a, b) => a.name.localeCompare(b.name));
                        setTrainees(traineesData);
                      } catch (e) {
                        console.error("Erro ao buscar alunos:", e);
                      } finally {
                        setIsLoadingTrainees(false);
                      }
                    }}
                    className="bg-surface rounded-[32px] p-8 flex flex-col items-center justify-center shadow-sm border border-border-subtle hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className={`w-16 h-16 rounded-full ${cls.color} flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-sm`}>
                      {cls.letter}
                    </div>
                    <h3 className="text-lg font-bold text-content tracking-wide mb-1">{cls.name}</h3>
                    <p className="text-sm text-content-muted mb-6">{cls.students} alunos</p>
                    
                    <div className="flex items-center justify-center -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-background border-2 border-surface flex items-center justify-center z-10">
                          <UserIcon className="w-4 h-4 text-green-500" />
                        </div>
                      ))}
                      <div className="w-8 h-8 rounded-full bg-background border-2 border-surface flex items-center justify-center z-0 text-[10px] font-medium text-content-muted">
                        +{cls.students - 3}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : isAdmin && selectedClass && !selectedTrainee ? (
          <motion.div 
            key="trainees"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="pt-12"
          >
            <div className="max-w-6xl mx-auto px-4 mb-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedClass(null)}
                    className="p-2 hover:bg-border-subtle rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-6 h-6 text-content-muted" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-content">
                      {selectedClass === 'global-estagio' ? 'Controle de Colaboradores' : 'Colaboradores'}
                    </h1>
                    <p className="text-content-muted capitalize">
                      {selectedClass === 'global-estagio' ? 'Todos os colaboradores cadastrados' : selectedClass}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 relative">
                  <DarkModeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
                  <button 
                    className="aspect-square w-10 h-10 rounded-[12px] bg-blue-50/80 dark:bg-surface border border-blue-200 dark:border-border-subtle flex items-center justify-center shadow-sm hover:shadow hover:bg-blue-100 dark:hover:bg-border-subtle/50 transition-all text-blue-600 dark:text-blue-400 font-bold text-sm" 
                    onClick={handleToggleProfileMenu}
                  >
                    {loginEmail.charAt(0).toUpperCase()}
                  </button>
                  
                  <AnimatePresence>
                    {isProfileMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-12 right-0 w-56 bg-surface border border-border-subtle rounded-2xl shadow-xl overflow-hidden z-50 p-2"
                      >
                        <div className="px-3 pb-3 pt-1 border-b border-border-subtle mb-2">
                          <p className="text-sm font-semibold text-content truncate">{loginEmail}</p>
                          <p className="text-xs text-content-muted mt-0.5">Administrador</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={handleOpenGlobalRepo}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-content bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-800/50"
                          >
                            <Upload className="w-4 h-4 text-emerald-500" />
                            Repositório Global
                          </button>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            Sair
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {isLoadingTrainees ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : trainees.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-[24px] border border-border-subtle">
                  <p className="text-content-muted">Nenhum colaborador encontrado nesta turma.</p>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6 relative items-start">
                  {/* Alphabet Bar (Mobile: Top, Desktop: Right) */}
                  <div className="lg:order-2 lg:sticky lg:top-8 flex lg:flex-col flex-wrap justify-center gap-1 p-2 bg-surface rounded-2xl border border-border-subtle shadow-sm z-10 w-full lg:w-auto">
                    {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(letter => {
                      const hasTrainees = trainees.some(t => t.name.toUpperCase().startsWith(letter));
                      return (
                        <button
                          key={letter}
                          onClick={() => scrollToLetter(letter)}
                          disabled={!hasTrainees}
                          className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
                            hasTrainees 
                              ? 'text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30 cursor-pointer' 
                              : 'text-content-muted/30 cursor-not-allowed'
                          }`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>

                  {/* Trainees Grid */}
                  <div className="lg:order-1 flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                    {trainees.map((trainee, index) => (
                      <motion.div
                        key={trainee.id}
                        id={`trainee-card-${trainee.id}`}
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
                        
                        const currentStatus = trainee.status === 'completed' ? 'efetivado' : 'estagio';
                        setUserStatus(currentStatus);
                        setUserStatuses(prev => ({ ...prev, [trainee.id]: currentStatus }));
                        
                        if (currentStatus === 'efetivado') {
                          setActiveTab('pending');
                          setUserTabsHidden(prev => ({ ...prev, [trainee.id]: true }));
                        } else {
                          setActiveTab('timeline');
                          setUserTabsHidden(prev => ({ ...prev, [trainee.id]: false }));
                        }
                      }}
                      className="bg-surface rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-border-subtle"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <UserIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-content">{trainee.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-content-muted">Mat: {trainee.matricula}</p>
                              {trainee.status !== 'none' && (
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm ${
                                  trainee.status === 'active' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-emerald-600 text-white'
                                }`}>
                                  {trainee.status === 'active' ? 'ESTÁGIO' : 'EFETIVADO'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          trainee.status === 'completed' ? 'bg-green-500' :
                          trainee.status === 'active' ? 'bg-blue-500' : 
                          trainee.status === 'none' ? 'bg-gray-300 dark:bg-gray-600' : 'bg-orange-500'
                        }`} />
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-content-muted truncate">{trainee.funcao || 'Sem função'}</p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-content-muted font-medium">Progresso</span>
                          <span className="text-content font-bold">{trainee.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-border-subtle rounded-full overflow-hidden">
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
              )}
            </div>
          </motion.div>
        ) : !userStatus && !isAdmin ? (
          <motion.div 
            key="status-selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="pt-12"
          >
            <div className="max-w-3xl mx-auto px-4 mb-8">
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => setSelectedTrainee(null)}
                  className="flex items-center gap-2 text-content-muted hover:text-content transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">Voltar para Colaboradores</span>
                </button>
                <DarkModeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
              </div>
              
              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-content">{selectedTrainee.name}</h1>
                <p className="text-content-muted">Selecione a situação atual do usuário</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <motion.button
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    setUserStatus('estagio');
                    setUserStatuses(prev => ({ ...prev, [selectedTrainee.id]: 'estagio' }));
                    setActiveTab('timeline');
                    
                    // Salvar no banco de dados
                    try {
                      await setDoc(doc(newDb, 'estagios', selectedTrainee.matricula), {
                        matricula: selectedTrainee.matricula,
                        nome: selectedTrainee.name,
                        horasAcumuladas: progressHours,
                        status: 'estagio',
                        tableRows: tableRows,
                        dataInicio: format(new Date(), 'yyyy-MM-dd'),
                        ultimaAtualizacao: new Date().toISOString()
                      }, { merge: true });
                    } catch (e) {
                      console.error("Erro ao salvar status de estágio:", e);
                    }
                  }}
                  className="bg-surface rounded-[28px] p-8 shadow-sm hover:shadow-md transition-all border border-border-subtle flex flex-col items-center text-center group"
                >
                  <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-content mb-2">Estágio</h2>
                  <p className="text-sm text-content-muted">Usuário em período de estágio ou treinamento inicial.</p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    setUserStatus('efetivado');
                    setUserStatuses(prev => ({ ...prev, [selectedTrainee.id]: 'efetivado' }));
                    setUserTabsHidden(prev => ({ ...prev, [selectedTrainee.id]: true }));
                    setActiveTab('pending');
                    
                    // Salvar no banco de dados
                    try {
                      await setDoc(doc(newDb, 'estagios', selectedTrainee.matricula), {
                        matricula: selectedTrainee.matricula,
                        nome: selectedTrainee.name,
                        horasAcumuladas: progressHours,
                        status: 'efetivado',
                        tableRows: tableRows,
                        ultimaAtualizacao: new Date().toISOString()
                      }, { merge: true });
                    } catch (e) {
                      console.error("Erro ao salvar efetivação manual:", e);
                    }
                  }}
                  className="bg-surface rounded-[28px] p-8 shadow-sm hover:shadow-md transition-all border border-border-subtle flex flex-col items-center text-center group"
                >
                  <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-4 group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-semibold text-content mb-2">Efetivado</h2>
                  <p className="text-sm text-content-muted">Usuário já efetivado no cargo atual.</p>
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
            <header className="pt-14 pb-4 px-4 sticky top-0 bg-background/80 backdrop-blur-xl z-10 flex items-center justify-between gap-2 max-w-[100vw]">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button 
                  onClick={() => {
                    if (isAdmin) {
                      setSelectedTrainee(null);
                    } else {
                      setUserStatus(null);
                    }
                  }} 
                  className="p-2 rounded-full hover:bg-border-subtle/80 transition-colors bg-surface shadow-sm shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{selectedTrainee.name}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-content-muted font-medium">Mat: {selectedTrainee.matricula}</p>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full shadow-md ${
                      userStatus === 'efetivado' 
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 text-white' 
                    }`}>
                      {userStatus === 'efetivado' ? 'EFETIVADO' : 'ESTÁGIO'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {autoSaveStatus === 'saving' && (
                  <div className="flex items-center gap-1.5 text-xs text-content-muted transition-all opacity-100">
                    <div className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />
                    <span className="hidden sm:inline">Salvando...</span>
                  </div>
                )}
                {autoSaveStatus === 'saved' && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-500 transition-all opacity-100">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Salvo</span>
                  </div>
                )}
                <DarkModeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
              </div>
            </header>

            <main className="px-4 max-w-5xl mx-auto mt-4">
              {/* Top Card Toggle */}
              {!userTabsHidden[selectedTrainee.id] && (
                <div className="bg-surface rounded-[28px] p-2 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.04)] mb-6 flex relative max-w-2xl mx-auto">
                  <div 
                    className={`absolute top-2 bottom-2 w-[calc(25%-8px)] bg-border-subtle rounded-[20px] transition-transform duration-300 ease-in-out ${
                      activeTab === 'timeline' ? 'translate-x-0' : 
                      activeTab === 'form' ? 'translate-x-[calc(100%+8px)]' : 
                      activeTab === 'pending' ? 'translate-x-[calc(200%+16px)]' :
                      'translate-x-[calc(300%+24px)]'
                    }`}
                  />
                  <button 
                    onClick={() => setActiveTab('timeline')}
                    className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-sm font-semibold relative z-10 transition-colors ${activeTab === 'timeline' ? 'text-content' : 'text-content-muted'}`}
                  >
                    Linha do Tempo
                  </button>
                  <button 
                    onClick={() => setActiveTab('form')}
                    className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-sm font-semibold relative z-10 transition-colors ${activeTab === 'form' ? 'text-content' : 'text-content-muted'}`}
                  >
                    Formulário
                  </button>
                  <button 
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-sm font-semibold relative z-10 transition-colors ${activeTab === 'pending' ? 'text-content' : 'text-content-muted'}`}
                  >
                    Treinamentos
                  </button>
                  <button 
                    onClick={() => setActiveTab('kaizen')}
                    className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-sm font-semibold relative z-10 transition-colors ${activeTab === 'kaizen' ? 'text-content' : 'text-content-muted'}`}
                  >
                    Kaizen
                  </button>
                </div>
              )}
              
              {userTabsHidden[selectedTrainee.id] && (
                <div className="bg-surface rounded-[28px] p-2 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.04)] mb-6 flex relative max-w-lg mx-auto">
                  <div 
                    className={`absolute top-2 bottom-2 w-[calc(50%-8px)] bg-border-subtle rounded-[20px] transition-transform duration-300 ease-in-out ${
                      activeTab === 'pending' ? 'translate-x-0' : 'translate-x-[calc(100%+8px)]'
                    }`}
                  />
                  <button 
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-sm font-semibold relative z-10 transition-colors ${activeTab === 'pending' ? 'text-content' : 'text-content-muted'}`}
                  >
                    Treinamentos
                  </button>
                  <button 
                    onClick={() => setActiveTab('kaizen')}
                    className={`flex-1 py-2 sm:py-3 text-[11px] sm:text-sm font-semibold relative z-10 transition-colors ${activeTab === 'kaizen' ? 'text-content' : 'text-content-muted'}`}
                  >
                    Kaizen
                  </button>
                </div>
              )}

              {activeTab === 'timeline' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface rounded-[28px] p-6 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.04)] max-w-7xl mx-auto overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                    <h2 className="text-lg font-semibold text-content max-md:text-center">Progresso do Treinamento</h2>
                    <div className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-medium max-md:h-[35px] max-md:w-[105px] max-md:px-0 max-md:py-0 max-md:flex max-md:items-center max-md:justify-center max-md:text-center">
                      {progressHours}h / {totalHours}h
                    </div>
                  </div>

                  <div className="relative h-[800px] md:h-[350px] mt-8 mb-16 max-w-2xl md:max-w-full mx-auto w-full overflow-visible">
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
                    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1.5 bg-border-subtle rounded-full md:top-1/2 md:-translate-y-1/2 md:left-0 md:right-0 md:h-1.5 md:w-full md:translate-x-0"></div>
                    
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
                        { hours: 100, color: '#22c55e', label: 'Marco 1', comment: milestoneEvaluations[100]?.comment || '', inspector: milestoneEvaluations[100]?.inspector || '' },
                        { hours: 200, color: '#f97316', label: 'Marco 2', comment: milestoneEvaluations[200]?.comment || '', inspector: milestoneEvaluations[200]?.inspector || '' },
                        { hours: 300, color: '#a855f7', label: 'Marco 3', comment: milestoneEvaluations[300]?.comment || '', inspector: milestoneEvaluations[300]?.inspector || '' },
                        { hours: 432, color: '#10b981', label: 'Conclusão', comment: milestoneEvaluations[432]?.comment || '', inspector: milestoneEvaluations[432]?.inspector || '' }
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
                                <div className="absolute inset-0 rounded-full border-4 border-surface bg-border-subtle shadow-sm"></div>
                                
                                {/* Animated colored dot */}
                                <motion.div
                                  className="absolute inset-0 rounded-full border-4 border-surface shadow-sm"
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
                                     {(milestone.comment || (isAdmin && milestone.hours > 0)) && (
                                       <div className="absolute right-full top-1/2 -translate-y-1/2 pr-4 w-[140px] sm:w-[180px] md:right-auto md:left-1/2 md:-translate-x-1/2 md:translate-y-0 md:top-full md:pt-6 md:pr-0 md:w-[140px] z-20">
                                         <motion.div 
                                           onClick={() => isAdmin && setEditingMilestone(milestone.hours)}
                                           className={`bg-background border border-border-subtle p-3 rounded-2xl text-center relative shadow-sm ${isAdmin ? 'cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group/card' : ''}`}
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
                                           {isAdmin && (
                                             <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-1 rounded-full opacity-0 group-hover/card:opacity-100 transition-opacity shadow-sm">
                                               <Plus className="w-3 h-3" />
                                             </div>
                                           )}
                                           
                                           {/* Triangle pointer (Mobile: Right) */}
                                           <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-gray-50 md:hidden"></div>
                                           
                                           {/* Triangle pointer (Desktop: Top) */}
                                           <div className="hidden md:block absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent -top-2 border-b-[8px] border-b-gray-50"></div>
                                           
                                           <p className="text-[10px] text-content-muted font-bold mb-1 uppercase tracking-wider">Avaliação do Inspetor</p>
                                           <p className={`text-xs leading-relaxed ${isReached ? 'text-content' : 'text-content-muted'} mb-2`}>
                                             {milestone.comment || (isAdmin ? "Adicionar avaliação..." : "")}
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
                              <div className="absolute left-full top-1/2 -translate-y-1/2 pl-4 md:left-1/2 md:-translate-x-1/2 md:translate-y-0 md:bottom-full md:pb-6 md:top-auto md:pl-0 text-left md:text-center w-[100px] sm:w-max z-20">
                                <motion.div 
                                  className="bg-surface/80 backdrop-blur-sm py-1 px-2 rounded-md"
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
                                    <p className="text-xs text-content-muted whitespace-nowrap">{milestone.hours} horas</p>
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
                  <div className="flex justify-end mb-4 relative" ref={downloadMenuRef}>
                    <button 
                      onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                      disabled={isDownloading}
                      className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 px-5 py-2.5 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      {isDownloading ? 'Gerando...' : 'Baixar Relatório'}
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </button>
                    
                    <AnimatePresence>
                      {isDownloadMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full right-0 mt-2 w-48 bg-surface border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50"
                        >
                          <button
                            onClick={handleDownloadPDF}
                            className="w-full text-left px-4 py-3 text-sm text-content hover:bg-border-subtle/50 transition-colors flex items-center gap-2"
                          >
                            <span className="font-medium">PDF</span> (.pdf)
                          </button>
                          <button
                            onClick={handleDownloadWord}
                            className="w-full text-left px-4 py-3 text-sm text-content hover:bg-border-subtle/50 transition-colors flex items-center gap-2 border-t border-border-subtle"
                          >
                            <span className="font-medium">Word</span> (.docx)
                          </button>
                          <button
                            onClick={handleDownloadExcel}
                            className="w-full text-left px-4 py-3 text-sm text-content hover:bg-border-subtle/50 transition-colors flex items-center gap-2 border-t border-border-subtle"
                          >
                            <span className="font-medium">Excel</span> (.xlsx)
                          </button>
                          <button
                            onClick={handleDownloadPNG}
                            className="w-full text-left px-4 py-3 text-sm text-content hover:bg-border-subtle/50 transition-colors flex items-center gap-2 border-t border-border-subtle"
                          >
                            <span className="font-medium">Imagem</span> (.png)
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div ref={formRef} className="bg-background -mx-4 px-4 sm:mx-0 sm:px-0 pb-4">
                    <div className="bg-surface rounded-[28px] p-6 shadow-sm mb-6">
                      <h2 className="text-lg font-semibold mb-4 text-content">Dados do Treinamento</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1 md:col-span-3">
                        <label className="text-xs font-medium text-content-muted ml-1">Nome</label>
                        <input type="text" className="w-full bg-background border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                      </div>
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-xs font-medium text-content-muted ml-1">Matrícula</label>
                        <input type="text" className="w-full bg-background border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.matricula} onChange={e => setFormData({...formData, matricula: e.target.value})} />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-medium text-content-muted ml-1">Supervisor</label>
                        <input type="text" className="w-full bg-background border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.supervisor} onChange={e => setFormData({...formData, supervisor: e.target.value})} />
                      </div>
                      <div className="space-y-1 md:col-span-3">
                        <label className="text-xs font-medium text-content-muted ml-1">Função em Treinamento</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            className="w-full bg-background border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                            value={formData.funcao} 
                            onChange={e => setFormData({...formData, funcao: e.target.value})}
                            onFocus={() => setIsFuncaoDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setIsFuncaoDropdownOpen(false), 200)}
                          />
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
                          
                          <AnimatePresence>
                            {isFuncaoDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute left-0 right-0 top-full mt-2 bg-surface border border-border-subtle rounded-2xl shadow-xl z-[100] overflow-hidden"
                              >
                                {FUNCAO_OPTIONS.map(opt => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      setFormData({...formData, funcao: opt});
                                      setIsFuncaoDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-content hover:bg-border-subtle/50 transition-colors"
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-content-muted ml-1">Horas previstas</label>
                        <div className="flex flex-col gap-2">
                          <input 
                            type="text" 
                            className="w-full bg-background border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                            value={formData.horasPrevistas} 
                            onChange={e => setFormData({...formData, horasPrevistas: e.target.value})} 
                          />
                          <div className="flex gap-2">
                            {PRESET_HOURS.map(h => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => setFormData({...formData, horasPrevistas: h})}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all border ${
                                  formData.horasPrevistas === h 
                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                    : 'bg-transparent border-border-subtle text-content-muted hover:bg-border-subtle'
                                }`}
                              >
                                {h} HORAS
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-content-muted ml-1">Horas realizadas</label>
                        <div className="w-full bg-background/50 border border-dashed border-border-subtle rounded-xl px-4 py-3 text-content-muted text-sm font-medium">
                          {formData.horasRealizadas}h
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-content-muted ml-1">Horas faltantes</label>
                        <div className={`w-full rounded-xl px-4 py-3 text-sm font-bold border ${
                          parseInt(formData.horasFaltantes) === 0 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                            : 'bg-orange-50 border-orange-100 text-orange-600'
                        }`}>
                          {formData.horasFaltantes}h
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface rounded-[28px] p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                      <h2 className="text-lg font-semibold text-content">Registros de Atividade</h2>
                      <button onClick={addRow} className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors max-md:w-[210px] max-md:h-[60px] max-md:text-[14px] max-md:leading-[18px] max-md:-ml-[2px]">
                        <Plus className="w-4 h-4" /> Adicionar Linha
                      </button>
                    </div>
                    
                    <div className="max-md:overflow-x-auto md:overflow-visible pb-4">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="border-b border-border-subtle">
                            <th className="pb-3 px-2 text-xs font-medium text-content-muted uppercase tracking-wider w-[15%]">Local</th>
                            <th className="pb-3 px-2 text-xs font-medium text-content-muted uppercase tracking-wider w-[25%]">Equipamento/Atividade</th>
                            <th className="pb-3 px-2 text-xs font-medium text-content-muted uppercase tracking-wider w-[10%]">Data</th>
                            <th className="pb-3 px-2 text-xs font-medium text-content-muted uppercase tracking-wider w-[10%]">Hora</th>
                            <th className="pb-3 px-2 text-xs font-medium text-content-muted uppercase tracking-wider w-[10%]">Duração</th>
                            <th className="pb-3 px-2 text-xs font-medium text-content-muted uppercase tracking-wider w-[15%]">Instrutor</th>
                            <th className="pb-3 px-2 text-xs font-medium text-content-muted uppercase tracking-wider w-[15%]">Avaliação/Obs</th>
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
                                    className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-1.5 outline-none text-sm transition-colors flex items-center justify-between group/btn"
                                  >
                                    <span className={row.local ? 'text-content' : 'text-content-muted'}>
                                      {row.local || 'Selecione...'}
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-content-muted transition-transform duration-200 ${openDropdownId === `local-${row.id}` ? 'rotate-180' : ''}`} />
                                  </button>

                                  <AnimatePresence>
                                    {openDropdownId === `local-${row.id}` && (
                                      <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
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
                              <td className="py-2 px-1"><input type="text" className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-1.5 outline-none text-sm transition-colors" value={row.equipamento} onChange={e => updateRow(row.id, 'equipamento', e.target.value)} /></td>
                              <td className="py-2 px-1 relative">
                                <div className="relative" ref={openDropdownId === `date-${row.id}` ? datePickerRef : null}>
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(openDropdownId === `date-${row.id}` ? null : `date-${row.id}`);
                                      if (row.data) setCurrentMonth(parseISO(row.data));
                                    }}
                                    className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-1.5 outline-none text-sm transition-colors flex items-center justify-between group/btn"
                                  >
                                    <span className={row.data ? 'text-content' : 'text-content-muted'}>
                                      {row.data ? format(parseISO(row.data), 'dd/MM/yyyy') : 'DD/MM/AAAA'}
                                    </span>
                                    <Calendar className="w-3.5 h-3.5 text-content-muted" />
                                  </button>

                                  <AnimatePresence>
                                    {openDropdownId === `date-${row.id}` && renderCalendar(row.id, row.data)}
                                  </AnimatePresence>
                                </div>
                              </td>
                              <td className="py-2 px-1"><input type="text" placeholder="00:00" className="w-full max-md:h-[34px] max-md:w-[53px] bg-transparent border border-transparent hover:border-border-subtle focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-1.5 outline-none text-sm transition-colors" value={row.hora} onChange={e => updateRow(row.id, 'hora', e.target.value)} /></td>
                              <td className="py-2 px-1"><input type="text" placeholder="0h" className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-1.5 outline-none text-sm transition-colors" value={row.duracao} onChange={e => updateRow(row.id, 'duracao', e.target.value)} /></td>
                              <td className="py-2 px-1"><input type="text" className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-1.5 outline-none text-sm transition-colors" value={row.instrutor} onChange={e => updateRow(row.id, 'instrutor', e.target.value)} /></td>
                              <td className="py-2 px-1"><input type="text" className="w-full bg-transparent border border-transparent hover:border-border-subtle focus:border-blue-500 focus:bg-surface rounded-lg px-2 py-1.5 outline-none text-sm transition-colors" value={row.avaliacao} onChange={e => updateRow(row.id, 'avaliacao', e.target.value)} /></td>
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
                  </div>
                </motion.div>
              )}

              {activeTab === 'pending' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-surface rounded-[28px] p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-6 text-content">Treinamentos Pendentes</h2>
                    
                    <div className="space-y-4">
                      {isLoadingTrainings ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                          <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                          <p className="text-sm text-content-muted animate-pulse">Sincronizando com o banco de dados...</p>
                        </div>
                      ) : realTrainings.filter(t => t.status !== 'completed').length === 0 ? (
                        <div className="text-center py-8 bg-background rounded-2xl border border-dashed border-border-subtle">
                          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2 opacity-20" />
                          <p className="text-sm text-content-muted">Nenhum treinamento pendente encontrado.</p>
                        </div>
                      ) : (
                        realTrainings.filter(t => t.status !== 'completed').map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border-subtle hover:border-blue-200 transition-all group">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-orange-50 text-orange-500">
                                <Clock className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-content group-hover:text-blue-600 transition-colors">{item.title}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-content-muted flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {item.date}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                                    Prioridade {item.priority}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button className="px-4 py-2 bg-surface border border-border-subtle text-content text-sm font-bold rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">
                              Iniciar Treinamento
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-surface rounded-[28px] p-6 shadow-sm border border-green-50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-content">Concluídos Recentemente</h3>
                      </div>
                      <div className="space-y-3">
                        {isLoadingTrainings ? (
                           <p className="text-xs text-content-muted text-center py-4">Carregando históricos...</p>
                        ) : realTrainings.filter(t => t.status === 'completed').length === 0 ? (
                          <p className="text-xs text-content-muted text-center py-4">Nenhum treinamento concluído.</p>
                        ) : (
                          realTrainings.filter(t => t.status === 'completed').map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm p-2 hover:bg-background rounded-lg transition-colors border-b border-border-subtle/30 last:border-0">
                              <span className="text-content-muted max-w-[70%] truncate">{item.title}</span>
                              <span className="text-green-600 font-bold whitespace-nowrap">100% (OK)</span>
                            </div>
                          ))
                        )}
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
                        {isLoadingTrainings ? (
                          <p className="text-xs text-content-muted text-center py-4">Calculando prazos...</p>
                        ) : realTrainings.filter(t => t.daysRemaining !== null && t.daysRemaining < 365).length === 0 ? (
                          <p className="text-xs text-content-muted text-center py-4">Tudo em dia!</p>
                        ) : (
                          realTrainings
                            .filter(t => t.daysRemaining !== null && t.daysRemaining < 365)
                            .sort((a, b) => (a.daysRemaining || 0) - (b.daysRemaining || 0))
                            .slice(0, 5)
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
              )}

              {activeTab === 'kaizen' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-surface rounded-[28px] p-6 shadow-sm border border-border-subtle">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-content">Central de Kaizen - {selectedTrainee.name}</h2>
                      <span className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
                        Dados Reais
                      </span>
                    </div>

                    {KAIZEN_DATA[selectedTrainee.matricula] ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          <div className="bg-background rounded-2xl p-5 border border-border-subtle flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center">
                              <Lightbulb className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-sm text-content-muted font-medium">Total Submetidos</p>
                              <p className="text-2xl font-bold text-content">{KAIZEN_DATA[selectedTrainee.matricula].resumo.submetidos}</p>
                            </div>
                          </div>
                          <div className="bg-background rounded-2xl p-5 border border-border-subtle flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-sm text-content-muted font-medium">Implementados</p>
                              <p className="text-2xl font-bold text-content">{KAIZEN_DATA[selectedTrainee.matricula].resumo.implementados}</p>
                            </div>
                          </div>
                          <div className="bg-background rounded-2xl p-5 border border-border-subtle flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                              <Target className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-sm text-content-muted font-medium">Taxa de Sucesso</p>
                              <p className="text-2xl font-bold text-content">
                                {Math.round((KAIZEN_DATA[selectedTrainee.matricula].resumo.implementados / KAIZEN_DATA[selectedTrainee.matricula].resumo.submetidos) * 100)}%
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 bg-background rounded-2xl p-5 border border-border-subtle">
                            <h3 className="text-sm font-bold text-content mb-6 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-content-muted" />
                              Evolução Mensal
                            </h3>
                            <div className="h-[250px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={KAIZEN_DATA[selectedTrainee.matricula].evolucaoMensal}
                                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                  <Tooltip 
                                    cursor={{ fill: '#f3f4f6' }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                  />
                                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                  <Bar dataKey="submetidos" name="Submetidos" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={20} />
                                  <Bar dataKey="implementados" name="Implementados" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="bg-background rounded-2xl p-5 border border-border-subtle">
                            <h3 className="text-sm font-bold text-content mb-4">Últimos Registros</h3>
                            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                              {KAIZEN_DATA[selectedTrainee.matricula].ultimosRegistros.map((item: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-xl border border-border-subtle hover:border-blue-200 transition-colors bg-surface">
                                  <div className="flex justify-between items-start mb-1.5">
                                    <h4 className="text-xs font-bold text-content line-clamp-2 leading-tight">{item.title}</h4>
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] text-content-muted flex items-center gap-1">
                                      <Calendar className="w-3 h-3" /> {format(parseISO(item.date), "dd MMM", { locale: ptBR })}
                                    </span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                      item.status === 'Implementado' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <Lightbulb className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-content mb-2">Nenhum Kaizen Encontrado</h3>
                        <p className="text-content-muted max-w-md">
                          Este colaborador ainda não possui registros de Kaizen no sistema.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHideTabsModal && selectedTrainee && (
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
              {!pendingHideAction ? (
                <>
                  <h2 className="text-xl font-bold mb-4">Ocultar Abas?</h2>
                  <p className="text-content-muted mb-6">
                    O colaborador <strong>{selectedTrainee.name}</strong> foi efetivado. Deseja ocultar as abas de Linha do Tempo e Formulário?
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setUserTabsHidden(prev => ({ ...prev, [selectedTrainee.id]: false }));
                        setShowHideTabsModal(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-content-muted hover:text-content transition-colors"
                    >
                      Manter Abas
                    </button>
                    <button
                      onClick={() => setPendingHideAction(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Ocultar Abas
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold mb-4">Download Obrigatório</h2>
                  <p className="text-content-muted mb-6">
                    Para ocultar as abas, é obrigatório fazer o download do formulário atual.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setPendingHideAction(false)}
                      className="px-4 py-2 text-sm font-medium text-content-muted hover:text-content transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={async () => {
                        const doDownloadAndHide = async () => {
                          await handleDownloadPDF();
                          setUserTabsHidden(prev => ({ ...prev, [selectedTrainee.id]: true }));
                          setActiveTab('pending');
                          setShowHideTabsModal(false);
                          setPendingHideAction(false);
                        };

                        if (activeTab !== 'form') {
                          setActiveTab('form');
                          setTimeout(doDownloadAndHide, 600);
                        } else {
                          await doDownloadAndHide();
                        }
                      }}
                      disabled={isDownloading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                    >
                      <Download className="w-4 h-4" />
                      {isDownloading ? 'Baixando...' : 'Baixar PDF e Ocultar'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGlobalUploadModal && (
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
                  onClick={() => {
                    setShowGlobalUploadModal(false);
                    setGlobalFile(null);
                    setGlobalUploadSuccess(false);
                  }}
                  className="p-2 hover:bg-border-subtle rounded-full transition-colors text-content-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {globalUploadSuccess ? (
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
                        onClick={() => setGlobalUploadType('kaizen')}
                        className={`py-2 px-4 rounded-xl text-sm font-medium transition-colors border ${
                          globalUploadType === 'kaizen' 
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' 
                            : 'bg-transparent border-border-subtle text-content-muted hover:bg-border-subtle'
                        }`}
                      >
                        Kaizen
                      </button>
                      <button
                        onClick={() => setGlobalUploadType('treinamento')}
                        className={`py-2 px-4 rounded-xl text-sm font-medium transition-colors border ${
                          globalUploadType === 'treinamento' 
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
                            setGlobalFile(e.target.files[0]);
                          }
                        }}
                      />
                      <Upload className="w-8 h-8 text-content-muted mb-2" />
                      {globalFile ? (
                        <p className="text-sm font-medium text-content truncate w-full px-4">{globalFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-content">Clique ou arraste um arquivo</p>
                          <p className="text-xs text-content-muted mt-1">PDF, DOCX, XLSX, Imagens, etc.</p>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleGlobalUpload}
                    disabled={!globalFile || isUploadingGlobal}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                  >
                    {isUploadingGlobal ? (
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

      <AnimatePresence>
        {editingMilestone !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingMilestone(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-border-subtle relative z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-content">Avaliação do Inspetor</h3>
                <button 
                  onClick={() => setEditingMilestone(null)}
                  className="p-2 hover:bg-border-subtle rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-content-muted" />
                </button>
              </div>
              
              <p className="text-sm text-content-muted mb-4 font-medium">
                {editingMilestone === 432 ? 'Conclusão do Treinamento' : `Marco de ${editingMilestone} horas`}
              </p>
              
              <textarea
                autoFocus
                className="w-full bg-background border border-border-subtle rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm leading-relaxed mb-6"
                placeholder="Digite aqui a avaliação técnica..."
                value={milestoneEvaluations[editingMilestone]?.comment || ''}
                onChange={(e) => {
                  const newVal = e.target.value;
                  setMilestoneEvaluations(prev => ({
                    ...prev,
                    [editingMilestone]: {
                      comment: newVal,
                      inspector: newVal.trim() === "" ? "" : userName
                    }
                  }));
                }}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingMilestone(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-content-muted hover:bg-border-subtle transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setEditingMilestone(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Salvar Avaliação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-8 text-center text-xs font-bold text-content-muted tracking-widest opacity-60">
        DESENVOLVIDO POR NEAR
      </footer>
    </div>
  );
}
