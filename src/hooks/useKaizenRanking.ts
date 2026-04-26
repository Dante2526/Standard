import { useState, useEffect, useRef } from 'react';
import { Trainee } from '../types';
import * as DataService from '../services/dataService';

export interface KaizenRankingItem {
  trainee: Trainee;
  total: number;
  implementados: number;
  submetidos: number;
}

export const useKaizenRanking = (trainees: Trainee[]) => {
  const [ranking, setRanking] = useState<KaizenRankingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estabiliza a referência usando as matrículas como key
  const traineeKeyRef = useRef('');

  const currentKey = trainees.map(t => t.matricula).sort().join(',');

  useEffect(() => {
    // Só re-executa se as matrículas mudaram de verdade
    if (currentKey === traineeKeyRef.current) return;
    traineeKeyRef.current = currentKey;

    let isMounted = true;

    const fetchRanking = async () => {
      if (!trainees || trainees.length === 0) {
        setRanking([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await DataService.fetchKaizenRankingForClass(trainees);
        if (isMounted) {
          setRanking(result);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Erro ao carregar ranking de Kaizen:", err);
          setError(err.message || 'Erro ao carregar ranking');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchRanking();

    return () => {
      isMounted = false;
    };
  }, [currentKey]);

  return { ranking, isLoading, error };
};
