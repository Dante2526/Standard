import { useState, useEffect } from 'react';
import { Trainee } from '../types';
import { fetchDelayedTrainingsForClass } from '../services/dataService';

export const useDelayedTrainings = (trainees: Trainee[]) => {
  const [delayedMap, setDelayedMap] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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
  }, [trainees]);

  return { delayedMap, isLoading };
};
