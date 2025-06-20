import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, X } from 'lucide-react';

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
	compact?: boolean;
}

export function Timer({ mode, onComplete, onReset, autoStart = false, className = '', compact = false }: TimerProps) {
	const [timeLeft, setTimeLeft] = useState(mode.duration || 0);
	const [isRunning, setIsRunning] = useState(autoStart);
	const [isPaused, setIsPaused] = useState(false);
	const intervalRef = useRef<number | null>(null);
	useEffect(() => {
		if (mode.type === 'pomodoro' && !mode.duration) {
			setTimeLeft(25 * 60); // Default 25 minutes for pomodoro
		} else if (mode.type === 'stopwatch') {
			setTimeLeft(0);
		} else {
			// Always set timeLeft to the mode duration, even if it's 0
			setTimeLeft(mode.duration || 0);
		}
	}, [mode]);

	useEffect(() => {
		if (isRunning && !isPaused) {
			intervalRef.current = window.setInterval(() => {
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
		if (!isRunning) return 'text-muted-foreground';
		if (mode.type === 'countdown' || mode.type === 'pomodoro') {
			const progress = mode.duration ? timeLeft / mode.duration : 1;
			if (progress > 0.5) return 'text-green-500 dark:text-green-400';
			if (progress > 0.25) return 'text-yellow-500 dark:text-yellow-400';
			return 'text-red-500 dark:text-red-400';
		}
		return 'text-primary';
	};

	const getProgressPercentage = () => {
		if (mode.type === 'stopwatch') return 0;
		if (!mode.duration) return 0;
		return ((mode.duration - timeLeft) / mode.duration) * 100;
	};
	return (
		<Card className={`${className} ${compact ? 'p-0' : ''}`}>
			<CardHeader className={compact ? 'pb-1 px-2 pt-2' : 'pb-3'}>
				<div className='flex justify-between items-center'>
					<CardTitle className={compact ? 'text-xs' : 'text-lg'}>{compact ? 'Timer' : mode.label || mode.type.charAt(0).toUpperCase() + mode.type.slice(1)}</CardTitle>
					<Badge
						variant={isRunning ? 'default' : 'secondary'}
						className={compact ? 'text-xs px-1 py-0' : ''}
					>
						{isRunning ? (isPaused ? 'Paused' : 'Running') : 'Stopped'}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className={compact ? 'px-2 pb-2' : ''}>
				<div className='text-center'>
					<div className={`font-mono font-bold ${getTimerColor()} ${compact ? 'text-lg mb-2' : 'text-4xl mb-4'}`}>{formatTime(timeLeft)}</div>
					{(mode.type === 'countdown' || mode.type === 'pomodoro') && mode.duration && !compact && (
						<div className='w-full bg-muted rounded-full h-2 mb-4'>
							<div
								className='bg-primary h-2 rounded-full transition-all duration-1000'
								style={{ width: `${getProgressPercentage()}%` }}
							/>
						</div>
					)}

					<div className={`flex justify-center ${compact ? 'gap-1' : 'gap-2'}`}>
						{!isRunning ? (
							<Button
								onClick={handleStart}
								className='flex-1'
								size={compact ? 'sm' : 'default'}
							>
								{compact ? <Play className='w-3 h-3' /> : 'Start'}
							</Button>
						) : (
							<>
								{!isPaused ? (
									<Button
										onClick={handlePause}
										variant='outline'
										className='flex-1'
										size={compact ? 'sm' : 'default'}
									>
										{compact ? <Pause className='w-3 h-3' /> : 'Pause'}
									</Button>
								) : (
									<Button
										onClick={handleResume}
										className='flex-1'
										size={compact ? 'sm' : 'default'}
									>
										{compact ? <Play className='w-3 h-3' /> : 'Resume'}
									</Button>
								)}
								<Button
									onClick={handleStop}
									variant='destructive'
									className='flex-1'
									size={compact ? 'sm' : 'default'}
								>
									{compact ? <X className='w-3 h-3' /> : 'Stop'}
								</Button>
							</>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
