import { useState, useEffect, useRef } from 'react';
import { Trainee } from '../types';
import { fetchDelayedTrainingsForClass } from '../services/dataService';

export const useDelayedTrainings = (trainees: Trainee[]) => {
  const [delayedMap, setDelayedMap] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Estabiliza a referência usando as matrículas como key
  const traineeKeyRef = useRef('');
  const traineesRef = useRef<Trainee[]>([]);

  const currentKey = trainees.map(t => t.matricula).sort().join(',');

  useEffect(() => {
    // Só re-executa se as matrículas mudaram de verdade
    if (currentKey === traineeKeyRef.current) return;
    traineeKeyRef.current = currentKey;
    traineesRef.current = trainees;

    let isMounted = true;

    const loadDelayed = async () => {
      if (!trainees || trainees.length === 0) {
        if (isMounted) setDelayedMap({});
        return;
      }

      setIsLoading(true);
      try {
        const results = await fetchDelayedTrainingsForClass(trainees);
        if (isMounted) {
          setDelayedMap(results);
        }
      } catch (error) {
        console.error('Failed to load delayed trainings:', error);
        if (isMounted) setDelayedMap({});
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDelayed();

    return () => {
      isMounted = false;
    };
  }, [currentKey]);

  return { delayedMap, isLoading };
};
