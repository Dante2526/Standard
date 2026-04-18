import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  serverTimestamp, 
  addDoc, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, newDb, newAuth } from '../firebase';
import { Trainee, TrainingRow, MilestoneEvaluations } from '../types';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

/**
 * Garante que o usuário está autenticado anonimamente em ambos os bancos.
 */
export const ensureAuth = async () => {
  try {
    if (!auth.currentUser) await signInAnonymously(auth);
    if (!newAuth.currentUser) await signInAnonymously(newAuth);
  } catch (error) {
    console.error("Erro na autenticação anônima:", error);
    throw error;
  }
};

/**
 * Salva os dados de estágio de um colaborador.
 */
export const saveStageData = async (
  trainee: Trainee, 
  progressHours: number, 
  userStatus: string | null, 
  tableRows: TrainingRow[],
  milestoneEvaluations: MilestoneEvaluations
) => {
  if (!trainee) return;
  
  try {
    await setDoc(doc(newDb, 'estagios', trainee.matricula), {
      matricula: trainee.matricula,
      nome: trainee.name,
      horasAcumuladas: progressHours,
      status: userStatus,
      tableRows: tableRows,
      milestoneEvaluations: milestoneEvaluations,
      dataInicio: format(new Date(), 'yyyy-MM-dd'),
      ultimaAtualizacao: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Erro ao salvar dados de estágio:", error);
    throw error;
  }
};

/**
 * Busca os treinamentos reais de um colaborador a partir do arquivo global mais recente.
 */
export const fetchRealTrainings = async (trainee: Trainee) => {
  try {
    const q = query(collection(newDb, 'global_files'), orderBy('uploadedAt', 'desc'), limit(1));
    const snap = await getDocs(q);
    
    if (snap.empty) return [];

    const fileData = snap.docs[0].data();
    const parsedData = fileData.parsedData || [];
    
    const matches = parsedData.filter((row: any, idx: number) => {
      if (idx === 0) return false; 

      const rowMatricula = (row.colunas[1] || '').toString().trim();
      const rowName = (row.colunas[0] || '').toString().toUpperCase().trim();
      
      const targetMatricula = (trainee.matricula || '').toString().trim();
      const targetName = (trainee.name || '').toString().toUpperCase().trim();
      
      if (targetMatricula && rowMatricula) {
        return rowMatricula === targetMatricula;
      }
      
      return targetName && (rowName.includes(targetName) || targetName.includes(rowName));
    }).map((row: any) => {
      const statusRaw = (row.colunas[4] || '').toString().trim();
      const daysLeftStr = (row.colunas[6] || '').toString().trim();
      const daysLeft = parseInt(daysLeftStr);

      return {
        title: row.colunas[3] || 'Treinamento sem título',
        status: statusRaw === 'Realizado' ? 'completed' : 'pending',
        date: row.colunas[5] || 'Sem data',
        priority: isNaN(daysLeft) ? 'Média' : (daysLeft < 30 ? 'Alta' : (daysLeft < 90 ? 'Média' : 'Baixa')),
        daysRemaining: isNaN(daysLeft) ? null : daysLeft
      };
    });
    
    return matches;
  } catch (error) {
    console.error("Erro ao buscar treinamentos reais:", error);
    throw error;
  }
};

/**
 * Processa e faz o upload de um arquivo CSV ou Excel global.
 */
export const uploadGlobalFile = async (file: File, type: 'kaizen' | 'treinamento', userEmail: string) => {
  try {
    await ensureAuth();

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    let parsedRows: string[][] = [];

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
      });

      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: false, defval: '' });
      parsedRows = jsonData.map((row) => row.map((cell) => (cell != null ? String(cell).trim() : '')));
      // Remove linhas totalmente vazias
      parsedRows = parsedRows.filter(row => row.some(cell => cell !== ''));
    } else {
      const fileText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file, 'utf-8'); 
      });

      // Detectar delimitador
      const detectDelimiter = fileText.indexOf(';') >= 0 && fileText.indexOf(';') < (fileText.indexOf('\n') > 0 ? fileText.indexOf('\n') : fileText.length) ? ';' : ',';
      
      // Parser robusto de CSV suportando quebras de linha em aspas
      let currentRow: string[] = [];
      let currentCell = '';
      let inQuotes = false;
      
      for (let i = 0; i < fileText.length; i++) {
        const char = fileText[i];
        if (char === '"') {
          if (inQuotes && fileText[i + 1] === '"') {
            currentCell += '"';
            i++; 
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === detectDelimiter && !inQuotes) {
          currentRow.push(currentCell.trim());
          currentCell = '';
        } else if (char === '\n' && !inQuotes) {
          if (currentCell.endsWith('\r')) currentCell = currentCell.slice(0, -1);
          currentRow.push(currentCell.trim());
          if (currentRow.some(cell => cell !== '')) {
            parsedRows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      
      if (currentCell !== '' || currentRow.length > 0) {
        if (currentCell.endsWith('\r')) currentCell = currentCell.slice(0, -1);
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell !== '')) {
          parsedRows.push(currentRow);
        }
      }
    }

    const structuredData = parsedRows.map((row, index) => ({
      index: index,
      colunas: row
    }));

    await addDoc(collection(newDb, 'global_files'), {
      name: file.name,
      type: type,
      uploadedAt: serverTimestamp(),
      uploadedBy: userEmail,
      isRawData: true,
      parsedData: structuredData,
    });
  } catch (error) {
    console.error("Erro no upload do arquivo global:", error);
    throw error;
  }
};

/**
 * Busca dados de Kaizen para um colaborador.
 */
export const fetchKaizenData = async (trainee: Trainee) => {
  try {
    const q = query(
      collection(newDb, 'global_files'), 
      where('type', '==', 'kaizen'),
      orderBy('uploadedAt', 'desc'), 
      limit(1)
    );
    const snap = await getDocs(q);
    
    if (snap.empty) return null;

    const fileData = snap.docs[0].data();
    const parsedData = fileData.parsedData || [];

    if (parsedData.length < 2) return null;

    // Buscar os índices das colunas de forma dinâmica a partir da linha de cabeçalho
    const headers = parsedData[0].colunas.map((h: string) => (h || '').toLowerCase().trim());
    const elaboradoresIdx = headers.findIndex((h: string) => h.includes('elaborador'));
    const titleIdx = headers.findIndex((h: string) => h.includes('título da melhoria') || h.includes('titulo') || h.includes('nome do kaizen'));
    const dateIdx = headers.findIndex((h: string) => h.includes('data'));
    const implDateIdx = headers.findIndex((h: string) => h.includes('quando foi implantada') || h.includes('implantada'));

    // Encontra registros do colaborador específico
    const userRecords = parsedData.filter((row: any, idx: number) => {
      if (idx === 0) return false;
      
      const targetMatricula = (trainee.matricula || '').toString().trim();
      const targetName = (trainee.name || '').toString().toUpperCase().trim();
      
      // Procura na coluna de elaboradores, ou se não achar, procura em todas as colunas
      if (elaboradoresIdx >= 0) {
        const elaboradores = (row.colunas[elaboradoresIdx] || '').toString();
        return (targetMatricula && elaboradores.includes(targetMatricula)) || 
               (targetName && elaboradores.toUpperCase().includes(targetName));
      } else {
        // Fallback: procura em qualquer lugar da linha
        return row.colunas.some((cell: string) => {
          const c = (cell || '').toString();
          return (targetMatricula && c.includes(targetMatricula)) || 
                 (targetName && c.toUpperCase().includes(targetName));
        });
      }
    });

    if (userRecords.length === 0) return null;

    // Função auxiliar para determinar se foi implementado (se tem data de implantação)
    const isImplemented = (row: any) => {
      if (implDateIdx >= 0) {
        const val = (row.colunas[implDateIdx] || '').toString().trim();
        return val.length > 0 && val !== '-';
      }
      return false; 
    };

    // Constrói objeto estruturado esperado pelo KaizenView
    return {
      resumo: {
        submetidos: userRecords.length,
        implementados: userRecords.filter((r: any) => isImplemented(r)).length
      },
      evolucaoMensal: [], 
      ultimosRegistros: userRecords.slice(0, 5).map((r: any) => ({
        title: titleIdx >= 0 ? (r.colunas[titleIdx] || 'Sugestão Kaizen') : 'Sugestão Kaizen',
        date: dateIdx >= 0 ? (r.colunas[dateIdx] || new Date().toISOString()) : new Date().toISOString(),
        status: isImplemented(r) ? 'Implementado' : 'Submetido'
      }))
    };
  } catch (error) {
    console.error("Erro ao buscar dados de Kaizen:", error);
    return null;
  }
};

