import { useState, useEffect, useRef } from 'react';
import { Timer } from '@/types';

export const useTimer = () => {
  const [timer, setTimer] = useState<Timer>({
    isRunning: false,
    elapsedTime: 0,
    mode: 'stopwatch',
    pomodoroLength: 25
  });

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (timer.isRunning && !intervalRef.current) {
      startTimeRef.current = Date.now() - (timer.elapsedTime * 1000);
      intervalRef.current = window.setInterval(() => {
        if (startTimeRef.current) {
          const now = Date.now();
          const elapsed = Math.floor((now - startTimeRef.current) / 1000);
          setTimer(prev => ({ ...prev, elapsedTime: elapsed }));
        }
      }, 1000);
    } else if (!timer.isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timer.isRunning]);

  const startTimer = (taskId?: number) => {
    setTimer(prev => ({
      ...prev,
      isRunning: true,
      currentTaskId: taskId,
      startTime: new Date().toISOString()
    }));
  };

  const pauseTimer = () => {
    setTimer(prev => ({ ...prev, isRunning: false }));
  };

  const resetTimer = () => {
    setTimer(prev => ({
      ...prev,
      isRunning: false,
      elapsedTime: 0,
      currentTaskId: undefined,
      startTime: undefined
    }));
  };

  const switchMode = (mode: Timer['mode']) => {
    resetTimer();
    setTimer(prev => ({ ...prev, mode }));
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeRemaining = (): number => {
    if (timer.mode === 'pomodoro') {
      return Math.max(0, (timer.pomodoroLength * 60) - timer.elapsedTime);
    }
    return 0;
  };

  const isTimerComplete = (): boolean => {
    if (timer.mode === 'pomodoro') {
      return timer.elapsedTime >= (timer.pomodoroLength * 60);
    }
    return false;
  };

  return {
    timer,
    startTimer,
    pauseTimer,
    resetTimer,
    switchMode,
    formatTime,
    getTimeRemaining,
    isTimerComplete
  };
};
