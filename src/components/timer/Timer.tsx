import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface TimerMode {
  type: 'pomodoro' | 'countdown' | 'stopwatch';
  duration?: number; // in seconds
  label?: string;
}

interface TimerProps {
  mode: TimerMode;
  onComplete?: () => void;
  onReset?: () => void;
  autoStart?: boolean;
  className?: string;
}

export function Timer({ mode, onComplete, onReset, autoStart = false, className = '' }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(mode.duration || 0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (mode.type === 'pomodoro' && !mode.duration) {
      setTimeLeft(25 * 60); // Default 25 minutes for pomodoro
    } else if (mode.type === 'stopwatch') {
      setTimeLeft(0);
    } else if (mode.duration) {
      setTimeLeft(mode.duration);
    }
  }, [mode]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (mode.type === 'stopwatch') {
            return prev + 1;
          } else {
            const newTime = prev - 1;
            if (newTime <= 0) {
              setIsRunning(false);
              onComplete?.();
              return 0;
            }
            return newTime;
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, mode.type, onComplete]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    onReset?.();
    
    if (mode.type === 'stopwatch') {
      setTimeLeft(0);
    } else {
      setTimeLeft(mode.duration || 0);
    }
  };

  const getTimerColor = () => {
    if (!isRunning) return 'text-gray-600';
    if (mode.type === 'countdown' || mode.type === 'pomodoro') {
      const progress = mode.duration ? (timeLeft / mode.duration) : 1;
      if (progress > 0.5) return 'text-green-600';
      if (progress > 0.25) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-blue-600';
  };

  const getProgressPercentage = () => {
    if (mode.type === 'stopwatch') return 0;
    if (!mode.duration) return 0;
    return ((mode.duration - timeLeft) / mode.duration) * 100;
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            {mode.label || mode.type.charAt(0).toUpperCase() + mode.type.slice(1)}
          </CardTitle>
          <Badge variant={isRunning ? 'default' : 'secondary'}>
            {isRunning ? (isPaused ? 'Paused' : 'Running') : 'Stopped'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <div className={`text-4xl font-mono font-bold mb-4 ${getTimerColor()}`}>
            {formatTime(timeLeft)}
          </div>
          
          {(mode.type === 'countdown' || mode.type === 'pomodoro') && mode.duration && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          )}

          <div className="flex justify-center gap-2">
            {!isRunning ? (
              <Button onClick={handleStart} className="flex-1">
                Start
              </Button>
            ) : (
              <>
                {!isPaused ? (
                  <Button onClick={handlePause} variant="outline" className="flex-1">
                    Pause
                  </Button>
                ) : (
                  <Button onClick={handleResume} className="flex-1">
                    Resume
                  </Button>
                )}
                <Button onClick={handleStop} variant="destructive" className="flex-1">
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
