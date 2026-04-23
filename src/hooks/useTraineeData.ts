import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { newDb } from '../firebase';
import * as DataService from '../services/dataService';
import { Trainee, TrainingRow, MilestoneEvaluations } from '../types';

export function useTraineeData(selectedTrainee: Trainee | null) {
  const [tableRows, setTableRows] = useState<TrainingRow[]>([]);
  const [milestoneEvaluations, setMilestoneEvaluations] = useState<MilestoneEvaluations>({});
  const [userStatus, setUserStatus] = useState<'estagio' | 'efetivado' | null>(null);
  const [kaizenData, setKaizenData] = useState<any>(null);
  const [kaizenDebugLog, setKaizenDebugLog] = useState<string[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [manualCompletedTitles, setManualCompletedTitles] = useState<string[]>([]);
  const [rawRealTrainings, setRawRealTrainings] = useState<any[]>([]);
  
  const lastServerDataRef = useRef<string>('');
  const currentStatusRef = useRef(userStatus);
  
  useEffect(() => { currentStatusRef.current = userStatus; }, [userStatus]);

  useEffect(() => {
    if (!selectedTrainee) {
      setTableRows([]);
      setMilestoneEvaluations({});
      setUserStatus(null);
      setKaizenData(null);
      setHasLoadedData(false);
      return;
    }

    setIsLoadingProfile(true);
    
    const unsubStage = onSnapshot(doc(newDb, 'estagios', selectedTrainee.matricula), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const incomingRows = Array.isArray(data.tableRows) ? data.tableRows : [];
        setTableRows(incomingRows);
        setMilestoneEvaluations(data.milestoneEvaluations || {});
        const newStatus = data.status || null;
        if (newStatus !== null || currentStatusRef.current === null) {
          setUserStatus(newStatus);
        }
        setManualCompletedTitles(data.manualCompletedTitles || []);
        
        lastServerDataRef.current = JSON.stringify({
          tableRows: incomingRows,
          status: data.status || null,
          milestoneEvaluations: data.milestoneEvaluations || {},
          horasAcumuladas: data.horasAcumuladas || 0
        });
      } else {
        const initialRows = [
          { id: 1, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' },
          { id: 2, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' },
          { id: 3, local: '', equipamento: '', data: '', hora: '', duracao: '', instrutor: '', avaliacao: '' },
        ];
        setTableRows(initialRows);
        if (currentStatusRef.current === null) {
          setUserStatus(null);
        }
      }
      setIsLoadingProfile(false);
      setHasLoadedData(true);
    });

    const unsubReal = DataService.subscribeToRealTrainings(selectedTrainee, setRawRealTrainings);
    const unsubKaizen = DataService.subscribeToKaizenData(selectedTrainee, (data) => {
      setKaizenData(data);
      if (data?._debug) setKaizenDebugLog(data._debug);
    });

    return () => {
      unsubStage();
      unsubReal();
      unsubKaizen();
    };
  }, [selectedTrainee]);

  const realTrainings = useMemo(() => {
    return rawRealTrainings.map(t => ({
      ...t,
      status: manualCompletedTitles.includes(t.title) ? 'completed' : t.status
    }));
  }, [rawRealTrainings, manualCompletedTitles]);

  return {
    tableRows, setTableRows,
    milestoneEvaluations, setMilestoneEvaluations,
    userStatus, setUserStatus,
    realTrainings,
    kaizenData,
    kaizenDebugLog,
    isLoadingProfile,
    hasLoadedData,
    lastServerDataRef
  };
}
