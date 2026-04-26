import { useState, useEffect } from 'react';
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

  useEffect(() => {
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
  }, [trainees]);

  return { ranking, isLoading, error };
};
