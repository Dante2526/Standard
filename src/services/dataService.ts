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
  addDoc 
} from 'firebase/firestore';
import { signInAnonymously, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { db, auth, newDb, newAuth } from '../firebase';
import { Trainee, TrainingRow, MilestoneEvaluations } from '../types';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { sanitizeString } from '../utils/securityUtils';

/**
 * Garante que o usuário está autenticado anonimamente em ambos os bancos.
 */
export const ensureAuth = async () => {
  try {
    // Configurar persistência de sessão para ambos os bancos
    await setPersistence(auth, browserSessionPersistence);
    await setPersistence(newAuth, browserSessionPersistence);

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
      turma: trainee.turma || '',
      tableRows: tableRows.map(row => ({
        ...row,
        local: sanitizeString(row.local),
        equipamento: sanitizeString(row.equipamento),
        instrutor: sanitizeString(row.instrutor),
        avaliacao: sanitizeString(row.avaliacao),
        hora: sanitizeString(row.hora),
        duracao: sanitizeString(row.duracao)
      })),
      milestoneEvaluations: Object.keys(milestoneEvaluations).reduce((acc, key) => {
        const k = Number(key);
        acc[k] = {
          comment: sanitizeString(milestoneEvaluations[k].comment),
          inspector: sanitizeString(milestoneEvaluations[k].inspector)
        };
        return acc;
      }, {} as MilestoneEvaluations),
      dataInicio: format(new Date(), 'yyyy-MM-dd'),
      ultimaAtualizacao: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Erro ao salvar dados de estágio:", error);
    throw error;
  }
};

/**
 * Atualiza o status de conclusão manual de um treinamento.
 */
export const updateManualTrainingStatus = async (matricula: string, trainingTitle: string, isCompleted: boolean) => {
  if (!matricula) return;
  try {
    const docRef = doc(newDb, 'estagios', matricula);
    const snap = await getDoc(docRef);
    let completedList: string[] = [];
    
    if (snap.exists()) {
      completedList = snap.data().manualCompletedTitles || [];
    }

    if (isCompleted) {
      if (!completedList.includes(trainingTitle)) {
        completedList.push(trainingTitle);
      }
    } else {
      completedList = completedList.filter(t => t !== trainingTitle);
    }

    await setDoc(docRef, { manualCompletedTitles: completedList }, { merge: true });
  } catch (error) {
    console.error("Erro ao atualizar status manual do treinamento:", error);
    throw error;
  }
};

/**
 * Carrega parsedData de um documento, buscando chunks se necessário.
 */
const loadParsedDataForDoc = async (fileData: any): Promise<any[]> => {
  if (!fileData.isChunked) {
    return fileData.parsedData || [];
  }
  // Buscar chunks da subcoleção
  const chunksQ = query(
    collection(newDb, 'global_files_chunks'),
    where('chunkParentId', '==', fileData.chunkParentId)
  );
  const chunksSnap = await getDocs(chunksQ);
  const sortedChunks = chunksSnap.docs
    .map(d => d.data())
    .sort((a, b) => a.chunkIndex - b.chunkIndex);
  
  let allData: any[] = [];
  for (const chunk of sortedChunks) {
    allData = allData.concat(chunk.parsedData || []);
  }
  return allData;
};

/**
 * Processa parsedData para extrair treinamentos reais de um trainee.
 */
export const processRealTrainingsFromParsedData = (parsedData: any[], trainee: Trainee) => {
  if (!parsedData || parsedData.length === 0) return [];

  let headerIdx = 0;
  while (headerIdx < parsedData.length) {
    const hRow = parsedData[headerIdx].colunas.map((h: string) => (h || '').toLowerCase().trim());
    if (hRow.some((h: string) => h.includes('matrícula') || h.includes('empregado') || h.includes('treinamento'))) {
      break; 
    }
    headerIdx++;
  }

  if (headerIdx >= parsedData.length) return [];

  const headers = parsedData[headerIdx].colunas.map((h: string) => (h || '').toLowerCase().trim());
  
  const idxNome = headers.findIndex((h: string) => h.includes('nome') || h.includes('empregado') || h.includes('colaborador'));
  const idxMatricula = headers.findIndex((h: string) => h.includes('matrícula') || h.includes('matricula') || h.includes('id'));
  const idxTitulo = headers.findIndex((h: string) => h.includes('treinamento') || h.includes('curso') || h.includes('título'));
  const idxStatus = headers.findIndex((h: string) => h.includes('status') || h.includes('situação'));
  const idxDate = headers.findIndex((h: string) => h.includes('data') || h.includes('vencimento') || h.includes('realização'));
  const idxDaysLeft = headers.findIndex((h: string) => h.includes('dias') || h.includes('prazo'));

  return parsedData.filter((row: any, idx: number) => {
    if (idx <= headerIdx) return false; 
    const rowMatricula = idxMatricula >= 0 ? (row.colunas[idxMatricula] || '').toString().trim() : (row.colunas[1] || '').toString().trim();
    const rowName = idxNome >= 0 ? (row.colunas[idxNome] || '').toString().toUpperCase().trim() : (row.colunas[0] || '').toString().toUpperCase().trim();
    const targetMatricula = (trainee.matricula || '').toString().trim();
    const targetName = (trainee.name || '').toString().toUpperCase().trim();
    const firstName = targetName.split(' ')[0] || '';
    
    if (targetMatricula && rowMatricula && rowMatricula.includes(targetMatricula)) return true;
    if (targetName && rowName && rowName.includes(targetName)) return true;
    if (firstName && targetMatricula && rowName.includes(firstName) && rowMatricula.includes(targetMatricula)) return true;
    return false;
  }).map((row: any) => {
    const statusRaw = idxStatus >= 0 ? (row.colunas[idxStatus] || '').toString().trim() : (row.colunas[4] || '').toString().trim();
    const daysLeftStr = idxDaysLeft >= 0 ? (row.colunas[idxDaysLeft] || '').toString().trim() : (row.colunas[6] || '').toString().trim();
    const daysLeft = parseInt(daysLeftStr);
    const title = idxTitulo >= 0 ? (row.colunas[idxTitulo] || 'Treinamento sem título') : (row.colunas[3] || 'Treinamento sem título');
    let date = idxDate >= 0 ? (row.colunas[idxDate] || '').toString().trim() : (row.colunas[5] || '').toString().trim();
    
    // Se a data estiver vazia mas temos dias restantes, calcular a data limite
    if (!date && !isNaN(daysLeft)) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysLeft);
      date = targetDate.toLocaleDateString('pt-BR');
    }
    if (!date) date = 'Sem data';

    const normalizedStatus = statusRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isCompleted = normalizedStatus.includes('realizado') || normalizedStatus.includes('concluido') || normalizedStatus.includes('conclu');

    return {
      title: sanitizeString(title),
      status: isCompleted ? 'completed' : 'pending',
      date: sanitizeString(date),
      priority: isNaN(daysLeft) ? 'Média' : (daysLeft < 0 ? 'Alta' : (daysLeft < 30 ? 'Alta' : (daysLeft < 90 ? 'Média' : 'Baixa'))),
      daysRemaining: isNaN(daysLeft) ? null : daysLeft
    };
  });
};

/**
 * Compatibilidade: processa snap diretamente (para documentos não-chunked).
 */
export const processRealTrainingsFromSnap = (snap: any, trainee: Trainee) => {
  if (snap.empty) return [];
  const sortedDocs = snap.docs.sort((a: any, b: any) => {
    const tA = a.data().uploadedAt?.toMillis?.() || 0;
    const tB = b.data().uploadedAt?.toMillis?.() || 0;
    return tB - tA;
  });
  const fileData = sortedDocs[0].data();
  if (fileData.isChunked) return []; // Será tratado pelo fetch async
  return processRealTrainingsFromParsedData(fileData.parsedData || [], trainee);
};

/**
 * Busca os treinamentos reais (Promise-based) com suporte a chunks.
 */
export const fetchRealTrainings = async (trainee: Trainee) => {
  const q = query(collection(newDb, 'global_files'), where('type', '==', 'treinamento'));
  const snap = await getDocs(q);
  if (snap.empty) return [];
  const sortedDocs = snap.docs.sort((a: any, b: any) => {
    const tA = a.data().uploadedAt?.toMillis?.() || 0;
    const tB = b.data().uploadedAt?.toMillis?.() || 0;
    return tB - tA;
  });
  const fileData = sortedDocs[0].data();
  const parsedData = await loadParsedDataForDoc(fileData);
  return processRealTrainingsFromParsedData(parsedData, trainee);
};

/**
 * Assina atualizações de treinamentos reais (com suporte a chunks).
 */
export const subscribeToRealTrainings = (trainee: Trainee, onUpdate: (data: any[]) => void) => {
  const q = query(collection(newDb, 'global_files'), where('type', '==', 'treinamento'));
  return onSnapshot(q, async (snap) => {
    if (snap.empty) { onUpdate([]); return; }
    const sortedDocs = snap.docs.sort((a: any, b: any) => {
      const tA = a.data().uploadedAt?.toMillis?.() || 0;
      const tB = b.data().uploadedAt?.toMillis?.() || 0;
      return tB - tA;
    });
    const fileData = sortedDocs[0].data();
    const parsedData = await loadParsedDataForDoc(fileData);
    onUpdate(processRealTrainingsFromParsedData(parsedData, trainee));
  });
};

/**
 * Busca todos os treinamentos atrasados de uma lista de colaboradores em lote.
 * Retorna um objeto mapeando a matrícula do colaborador para a lista de seus treinamentos atrasados.
 */
export const fetchDelayedTrainingsForClass = async (trainees: Trainee[]): Promise<Record<string, any[]>> => {
  if (trainees.length === 0) return {};

  const q = query(collection(newDb, 'global_files'), where('type', '==', 'treinamento'));
  const snap = await getDocs(q);
  if (snap.empty) return {};

  const sortedDocs = snap.docs.sort((a: any, b: any) => {
    const tA = a.data().uploadedAt?.toMillis?.() || 0;
    const tB = b.data().uploadedAt?.toMillis?.() || 0;
    return tB - tA;
  });
  const fileData = sortedDocs[0].data();
  const parsedData = await loadParsedDataForDoc(fileData);

  if (!parsedData || parsedData.length === 0) return {};

  let headerIdx = 0;
  while (headerIdx < parsedData.length) {
    const hRow = parsedData[headerIdx].colunas.map((h: string) => (h || '').toLowerCase().trim());
    if (hRow.some((h: string) => h.includes('matrícula') || h.includes('empregado') || h.includes('treinamento'))) {
      break; 
    }
    headerIdx++;
  }

  if (headerIdx >= parsedData.length) return {};

  const headers = parsedData[headerIdx].colunas.map((h: string) => (h || '').toLowerCase().trim());
  const idxNome = headers.findIndex((h: string) => h.includes('nome') || h.includes('empregado') || h.includes('colaborador'));
  const idxMatricula = headers.findIndex((h: string) => h.includes('matrícula') || h.includes('matricula') || h.includes('id'));
  const idxTitulo = headers.findIndex((h: string) => h.includes('treinamento') || h.includes('curso') || h.includes('título'));
  const idxStatus = headers.findIndex((h: string) => h.includes('status') || h.includes('situação'));
  const idxDate = headers.findIndex((h: string) => h.includes('data') || h.includes('vencimento') || h.includes('realização'));
  const idxDaysLeft = headers.findIndex((h: string) => h.includes('dias') || h.includes('prazo'));

  const results: Record<string, any[]> = {};
  trainees.forEach(t => { results[t.matricula] = []; });

  // Cria um mapa para busca rápida por matrícula
  const traineeMap = new Map<string, Trainee>();
  trainees.forEach(t => {
    if (t.matricula) traineeMap.set(t.matricula.toString().trim(), t);
  });

  // Itera os dados globais uma única vez
  for (let i = headerIdx + 1; i < parsedData.length; i++) {
    const row = parsedData[i];
    const rowMatricula = idxMatricula >= 0 ? (row.colunas[idxMatricula] || '').toString().trim() : (row.colunas[1] || '').toString().trim();
    
    // Se a matrícula existir na nossa turma
    if (rowMatricula && traineeMap.has(rowMatricula)) {
      const statusRaw = idxStatus >= 0 ? (row.colunas[idxStatus] || '').toString().trim() : (row.colunas[4] || '').toString().trim();
      const normalizedStatus = statusRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isCompleted = normalizedStatus.includes('realizado') || normalizedStatus.includes('concluido') || normalizedStatus.includes('conclu');
      
      // Só nos interessam os não concluídos (pendentes)
      if (!isCompleted) {
        const daysLeftStr = idxDaysLeft >= 0 ? (row.colunas[idxDaysLeft] || '').toString().trim() : (row.colunas[6] || '').toString().trim();
        const daysLeft = parseInt(daysLeftStr);
        
        // Vamos incluir TODOS os treinamentos pendentes (não concluídos)
        // pois o usuário considera "Pendência" como algo a ser acompanhado na colmeia
        const title = idxTitulo >= 0 ? (row.colunas[idxTitulo] || 'Treinamento sem título') : (row.colunas[3] || 'Treinamento sem título');
        let date = idxDate >= 0 ? (row.colunas[idxDate] || '').toString().trim() : (row.colunas[5] || '').toString().trim();
        
        if (!date && !isNaN(daysLeft)) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + daysLeft);
          date = targetDate.toLocaleDateString('pt-BR');
        }
        if (!date) date = 'Sem data';

        results[rowMatricula].push({
          title: sanitizeString(title),
          status: 'pending',
          date: sanitizeString(date),
          priority: isNaN(daysLeft) ? 'Média' : (daysLeft < 0 ? 'Alta' : 'Média'),
          daysRemaining: isNaN(daysLeft) ? 0 : daysLeft
        });
      }
    }
  }

  return results;
};

/**
 * Estima o tamanho em bytes de um objeto para verificar limite do Firestore.
 */
const estimateDocSize = (data: any): number => {
  return new TextEncoder().encode(JSON.stringify(data)).length;
};

/**
 * Limite seguro por documento Firestore (800KB para margem de segurança).
 */
const FIRESTORE_SAFE_LIMIT = 800 * 1024;

/**
 * Processa e faz o upload de um arquivo CSV ou Excel global.
 * Para arquivos grandes, divide automaticamente em múltiplos documentos (chunks).
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

    // Verificar se o documento ultrapassa o limite do Firestore
    const estimatedSize = estimateDocSize(structuredData);

    if (estimatedSize <= FIRESTORE_SAFE_LIMIT) {
      // Cabe em um único documento
      await addDoc(collection(newDb, 'global_files'), {
        name: file.name,
        type: type,
        uploadedAt: serverTimestamp(),
        uploadedBy: userEmail,
        isRawData: true,
        parsedData: structuredData,
      });
    } else {
      // Arquivo grande: dividir em chunks
      const parentId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const chunks: typeof structuredData[] = [];
      let currentChunk: typeof structuredData = [];
      let currentChunkSize = 0;

      for (const row of structuredData) {
        const rowSize = estimateDocSize(row);
        if (currentChunkSize + rowSize > FIRESTORE_SAFE_LIMIT && currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentChunkSize = 0;
        }
        currentChunk.push(row);
        currentChunkSize += rowSize;
      }
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      console.log(`Arquivo grande (${(estimatedSize / 1024).toFixed(0)}KB). Dividindo em ${chunks.length} chunks...`);

      // Salvar documento principal (sem parsedData, apenas metadados)
      await addDoc(collection(newDb, 'global_files'), {
        name: file.name,
        type: type,
        uploadedAt: serverTimestamp(),
        uploadedBy: userEmail,
        isRawData: true,
        isChunked: true,
        chunkParentId: parentId,
        totalChunks: chunks.length,
        totalRows: structuredData.length,
      });

      // Salvar todos os chunks em paralelo (muito mais rápido)
      await Promise.all(chunks.map((chunk, i) =>
        addDoc(collection(newDb, 'global_files_chunks'), {
          chunkParentId: parentId,
          chunkIndex: i,
          type: type,
          parsedData: chunk,
        })
      ));
    }
  } catch (error) {
    console.error("Erro no upload do arquivo global:", error);
    throw error;
  }
};

/**
 * Processa o snapshot de arquivos globais para extrair dados de Kaizen.
 */
export const processKaizenDataFromSnap = (snap: any, trainee: Trainee) => {
  const debugLog: string[] = [];
  const log = (msg: string) => { debugLog.push(msg); };

  try {
    if (snap.empty) return { _debug: debugLog };

    const sortedDocs = snap.docs.sort((a: any, b: any) => {
      const tA = a.data().uploadedAt?.toMillis?.() || 0;
      const tB = b.data().uploadedAt?.toMillis?.() || 0;
      return tB - tA;
    });
    
    const fileData = sortedDocs[0].data();
    const parsedData = fileData.parsedData || [];

    if (parsedData.length < 2) return { _debug: debugLog };

    let headerIdx = 0;
    while (headerIdx < parsedData.length) {
      const hRow = parsedData[headerIdx].colunas.map((h: string) => (h || '').toLowerCase().trim());
      if (hRow.some((h: string) => h.includes('elaborador') || h.includes('kaizen') || h.includes('data'))) break; 
      headerIdx++;
    }

    if (headerIdx >= parsedData.length) return { _debug: debugLog };

    const headers = parsedData[headerIdx].colunas.map((h: string) => (h || '').toLowerCase().trim());
    const elaboradoresIdx = headers.findIndex((h: string) => h.includes('elaborador'));
    const titleIdx = headers.findIndex((h: string) => h.includes('título da melhoria') || h.includes('titulo') || h.includes('nome do kaizen'));
    const dateIdx = headers.findIndex((h: string) => h.includes('data'));
    const implDateIdx = headers.findIndex((h: string) => h.includes('quando foi implantada') || h.includes('implantada'));
    
    const targetMatricula = (trainee.matricula || '').toString().trim();
    const targetName = (trainee.name || '').toString().toUpperCase().trim();
    const firstName = targetName.split(' ')[0] || '';
    
    const userRecords = parsedData.filter((row: any, idx: number) => {
      if (idx <= headerIdx) return false;
      const checkMatch = (cellValue: string) => {
        const c = (cellValue || '').toString().toUpperCase();
        if (!c) return false;
        if (targetMatricula && c.includes(targetMatricula)) return true;
        if (targetName && c.includes(targetName)) return true;
        if (firstName && targetMatricula && c.includes(firstName) && c.includes(targetMatricula)) return true;
        return false;
      };
      return elaboradoresIdx >= 0 ? checkMatch(row.colunas[elaboradoresIdx]) : row.colunas.some(checkMatch);
    });

    if (userRecords.length === 0) return { _debug: debugLog };

    const isImplemented = (row: any) => {
      if (implDateIdx >= 0) {
        const val = (row.colunas[implDateIdx] || '').toString().trim();
        return val.length > 0 && val !== '-';
      }
      return false; 
    };

    const monthsMap: Record<string, { submetidos: number, implementados: number }> = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    userRecords.forEach((row: any) => {
      let monthStr = 'Atual';
      if (dateIdx >= 0) {
        const dateVal = row.colunas[dateIdx];
        if (dateVal) {
           const dateStr = String(dateVal).trim();
           if (dateStr.includes('/')) {
             const parts = dateStr.split('/');
             if (parts.length >= 2) {
               const m = parseInt(parts[1], 10);
               if (m >= 1 && m <= 12) monthStr = monthNames[m - 1];
             }
           } else if (dateStr.includes('-')) {
             const parts = dateStr.split('-');
             if (parts.length >= 2) {
               const m = parseInt(parts[1], 10);
               if (m >= 1 && m <= 12) monthStr = monthNames[m - 1];
             }
           } else if (!isNaN(Number(dateStr))) {
             const serial = Number(dateStr);
             if (serial > 20000) {
                const date = new Date((serial - 25569) * 86400 * 1000);
                monthStr = monthNames[date.getUTCMonth()];
             }
           }
        }
      }
      if (!monthsMap[monthStr]) monthsMap[monthStr] = { submetidos: 0, implementados: 0 };
      monthsMap[monthStr].submetidos++;
      if (isImplemented(row)) monthsMap[monthStr].implementados++;
    });

    const evolucaoMensal = Object.entries(monthsMap)
        .map(([month, data]) => ({ month, submetidos: data.submetidos, implementados: data.implementados }))
        .sort((a, b) => {
          const idxA = monthNames.indexOf(a.month);
          const idxB = monthNames.indexOf(b.month);
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });

    return {
      resumo: {
        submetidos: userRecords.length,
        implementados: userRecords.filter((r: any) => isImplemented(r)).length
      },
      evolucaoMensal, 
      ultimosRegistros: userRecords.slice(0, 5).map((r: any) => ({
        title: titleIdx >= 0 ? (r.colunas[titleIdx] || 'Sugestão Kaizen') : 'Sugestão Kaizen',
        date: dateIdx >= 0 ? (r.colunas[dateIdx] || new Date().toISOString()) : new Date().toISOString(),
        status: isImplemented(r) ? 'Implementado' : 'Submetido'
      })),
      _debug: debugLog
    };
  } catch (error: any) {
    return { _debug: debugLog };
  }
};

/**
 * Busca dados de Kaizen (Promise-based) com suporte a chunks.
 */
export const fetchKaizenData = async (trainee: Trainee) => {
  const q = query(collection(newDb, 'global_files'), where('type', '==', 'kaizen'));
  const snap = await getDocs(q);
  if (snap.empty) return { _debug: [] };
  const sortedDocs = snap.docs.sort((a: any, b: any) => {
    const tA = a.data().uploadedAt?.toMillis?.() || 0;
    const tB = b.data().uploadedAt?.toMillis?.() || 0;
    return tB - tA;
  });
  const fileData = sortedDocs[0].data();
  if (fileData.isChunked) {
    const parsedData = await loadParsedDataForDoc(fileData);
    const mockSnap = { empty: false, docs: [{ data: () => ({ ...fileData, parsedData, isChunked: false }) }] };
    return processKaizenDataFromSnap(mockSnap, trainee);
  }
  return processKaizenDataFromSnap(snap, trainee);
};

/**
 * Assina atualizações de dados de Kaizen (com suporte a chunks).
 */
export const subscribeToKaizenData = (trainee: Trainee, onUpdate: (data: any) => void) => {
  const q = query(collection(newDb, 'global_files'), where('type', '==', 'kaizen'));
  return onSnapshot(q, async (snap) => {
    if (snap.empty) { onUpdate({ _debug: [] }); return; }
    const sortedDocs = snap.docs.sort((a: any, b: any) => {
      const tA = a.data().uploadedAt?.toMillis?.() || 0;
      const tB = b.data().uploadedAt?.toMillis?.() || 0;
      return tB - tA;
    });
    const fileData = sortedDocs[0].data();
    if (fileData.isChunked) {
      const parsedData = await loadParsedDataForDoc(fileData);
      const mockSnap = { empty: false, docs: [{ data: () => ({ ...fileData, parsedData, isChunked: false }) }] };
      onUpdate(processKaizenDataFromSnap(mockSnap, trainee));
    } else {
      onUpdate(processKaizenDataFromSnap(snap, trainee));
    }
  });
};

/**
 * Assina atualizações da lista de colaboradores de forma eficiente e em tempo real.
 */
export const subscribeToTraineeList = (clsId: string, onUpdate: (trainees: Trainee[]) => void) => {
  let baseTrainees: any[] = [];
  let stageDataMap: Record<string, any> = {};

  const updateFinalList = () => {
    const finalTrainees = baseTrainees.map(trainee => {
      const stageData = stageDataMap[trainee.matricula];
      const progressHours = (stageData?.tableRows || []).reduce((acc: number, row: any) => acc + (parseFloat(row.duracao) || 0), 0);
      
      return {
        ...trainee,
        progress: stageData?.status === 'efetivado' ? 100 : stageData ? Math.round((progressHours / 432) * 100) : 0,
        status: stageData?.status === 'efetivado' ? 'completed' : stageData?.status === 'estagio' ? 'active' : 'none',
      } as Trainee;
    });
    onUpdate(finalTrainees.sort((a, b) => a.name.localeCompare(b.name)));
  };

  if (clsId === 'global-estagio') {
    // Lista Global: Apenas quem está no novo banco com status 'estagio'
    const q = query(collection(newDb, 'estagios'), where('status', '==', 'estagio'));
    return onSnapshot(q, (snap) => {
      const trainees = snap.docs.map(docSnapshot => {
        const data = docSnapshot.data() as any;
        const progressHours = (data.tableRows || []).reduce((acc: number, row: any) => acc + (parseFloat(row.duracao) || 0), 0);
        
        return {
          id: docSnapshot.id,
          name: data.nome || 'Sem Nome',
          matricula: data.matricula || '',
          funcao: data.funcao || 'Colaborador',
          progress: Math.round((progressHours / 432) * 100),
          status: 'active',
          turma: data.turma || ''
        } as Trainee;
      }).sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(trainees);
    });
  } else {
    // Lista por Turma: Combina base (banco antigo) + progresso (novo banco) em tempo real
    const unsubBase = onSnapshot(collection(db, clsId), (snap) => {
      baseTrainees = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.nome || data.name || 'Sem Nome',
          matricula: data.matricula || '',
          funcao: data.funcao || '',
          email: data.email || '',
          turma: clsId.split(' ').pop()?.toUpperCase() || ''
        };
      });
      updateFinalList();
    });

    const targetTurma = clsId.split(' ').pop()?.toUpperCase() || '';
    const qStage = collection(newDb, 'estagios');
    
    const unsubStage = onSnapshot(qStage, (snap) => {
      snap.docs.forEach(d => {
        stageDataMap[d.id] = d.data();
      });
      updateFinalList();
    });

    return () => {
      unsubBase();
      unsubStage();
    };
  }
};

/**
 * Busca os links externos da coleção 'web'.
 */
export const fetchWebLinks = async () => {
  try {
    const q = collection(newDb, 'web');
    const snap = await getDocs(q);
    const links: Record<string, string> = {};
    
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.kaizen) links.kaizen = data.kaizen;
      if (data.treinamento) links.treinamento = data.treinamento;
    });
    
    return links;
  } catch (error) {
    console.error("Erro ao buscar links web:", error);
    return {};
  }
};

