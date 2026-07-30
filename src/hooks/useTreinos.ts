import { useState, useEffect } from 'react';
import { Workout, WorkoutSession } from '../types';
import { treinoService } from '../services/treinoService';

export function useTreinos(userId: string) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!userId) return;
      setIsLoading(true);
      try {
        const [workoutsResponse, sessionsResponse] = await Promise.all([
          treinoService.getWorkoutsByStudent(userId),
          treinoService.getSessionsByStudent(userId)
        ]);

        if (workoutsResponse.data) setWorkouts(workoutsResponse.data as any);
        if (sessionsResponse.data) setSessions(sessionsResponse.data as any);
      } catch (err) {
        console.error('Error loading treinos:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [userId]);

  return { workouts, sessions, isLoading, setWorkouts, setSessions };
}
