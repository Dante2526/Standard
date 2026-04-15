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
 * Processa e faz o upload de um arquivo CSV global.
 */
export const uploadGlobalFile = async (file: File, type: 'kaizen' | 'treinamento', userEmail: string) => {
  try {
    await ensureAuth();

    const fileText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'utf-8'); 
    });

    const rows = fileText.split(/\r?\n/);
    const parsedRows = rows.map(row => {
      const delimiter = row.includes(';') ? ';' : ',';
      return row.split(delimiter).map(cell => cell.trim());
    });
    
    const filteredRows = parsedRows.filter(row => row.some(cell => cell !== ''));
    const structuredData = filteredRows.map((row, index) => ({
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
