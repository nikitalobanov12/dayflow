import { useState, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi';
import { Task } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TimerMode } from '@/components/timer/Timer';
import { SprintTimerType } from './SprintConfig';
import { Minimize2, Check, SkipForward, Maximize2, X, Play, Pause } from 'lucide-react';

interface SprintModeProps {
	tasks: Task[];
	timerType: SprintTimerType;
	pomodoroMinutes?: number;
	countdownMinutes?: number;
	onTaskComplete: (taskId: number) => void;
	onExit: () => void;
	onViewModeChange?: (mode: SprintViewMode) => void;
}

type SprintViewMode = 'fullscreen' | 'sidebar' | 'focus';

export function SprintMode({ tasks, timerType, pomodoroMinutes, countdownMinutes, onTaskComplete, onExit, onViewModeChange }: SprintModeProps) {
	const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
	const [completedTasks, setCompletedTasks] = useState<number[]>([]);
	const [isBreak, setIsBreak] = useState(false);
	const [sessionType, setSessionType] = useState<'work' | 'short-break' | 'long-break'>('work');
	const [viewMode, setViewMode] = useState<SprintViewMode>('sidebar');
	// Timer state for focus mode display
	const [timerSeconds, setTimerSeconds] = useState(0);
	const [isTimerRunning, setIsTimerRunning] = useState(false);
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	// Initialize timer when task or break changes
	useEffect(() => {
		const mode = getTimerMode();
		if (mode.type === 'stopwatch') {
			setTimerSeconds(0);
		} else {
			setTimerSeconds(mode.duration || 0);
		}
		setIsTimerRunning(true);
	}, [currentTaskIndex, isBreak, sessionType, timerType, pomodoroMinutes, countdownMinutes]);

	// Timer effect
	useEffect(() => {
		if (isTimerRunning) {
			timerRef.current = setInterval(() => {
				setTimerSeconds(prev => {
					const mode = getTimerMode();
					if (mode.type === 'stopwatch') {
						return prev + 1;
					} else {
						const newValue = prev - 1;
						if (newValue <= 0) {
							setIsTimerRunning(false);
							handleTimerComplete();
							return 0;
						}
						return newValue;
					}
				});
			}, 1000);
		} else {
			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		}

		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, [isTimerRunning]);

	const currentTask = tasks[currentTaskIndex];
	const totalTasks = tasks.length;
	const totalMinutes = tasks.reduce((sum, task) => sum + task.timeEstimate, 0);
	const completedMinutes = completedTasks.reduce((sum, taskId) => {
		const task = tasks.find(t => t.id === taskId);
		return sum + (task?.timeEstimate || 0);
	}, 0);
	const progress = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
	useEffect(() => {
		let intervalId: NodeJS.Timeout | undefined;

		const setupAlwaysOnTopMaintenance = async () => {
			try {
				const window = getCurrentWindow();

				// For sidebar and focus modes, aggressively maintain always-on-top status
				if (viewMode === 'sidebar' || viewMode === 'focus') {
					// Set initial always-on-top and visible on all workspaces for maximum visibility
					await window.setAlwaysOnTop(true);
					try {
						await window.setVisibleOnAllWorkspaces(true);
					} catch (error) {
						// Ignore if not supported on this platform
						console.debug('setVisibleOnAllWorkspaces not supported:', error);
					}

					// Aggressively check and re-apply always-on-top every 2 seconds
					intervalId = setInterval(async () => {
						try {
							const isAlwaysOnTop = await window.isAlwaysOnTop();
							if (!isAlwaysOnTop) {
								await window.setAlwaysOnTop(true);
								// Also try to bring window to front
								await window.setFocus();
							}
						} catch (error) {
							// Ignore errors - window might be closing
						}
					}, 2000); // Check every 2 seconds for more responsive behavior
				}
			} catch (error) {
				console.error('Failed to setup always-on-top maintenance:', error);
			}
		};

		setupAlwaysOnTopMaintenance();

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	}, [viewMode]);
	useEffect(() => {
		const resizeWindow = async () => {
			try {
				const window = getCurrentWindow();
				switch (viewMode) {
					case 'sidebar':
						await window.setSize(new LogicalSize(220, 500));
						await window.setResizable(false);
						await window.setPosition(new LogicalPosition(0, 0));
						await window.setAlwaysOnTop(true);
						try {
							await window.setVisibleOnAllWorkspaces(true);
						} catch (error) {
							// Ignore if not supported on this platform
						}
						await window.setMinimizable(true);
						await window.setFullscreen(false);
						break;
					case 'focus':
						await window.setSize(new LogicalSize(220, 60));
						await window.setResizable(false);
						await window.setPosition(new LogicalPosition(0, 0));
						await window.setAlwaysOnTop(true);
						try {
							await window.setVisibleOnAllWorkspaces(true);
						} catch (error) {
							// Ignore if not supported on this platform
						}
						await window.setMinimizable(true);
						await window.setDecorations(false);
						await window.setFullscreen(false);
						break;
					case 'fullscreen':
						await window.setSize(new LogicalSize(1376, 800));
						await window.setResizable(true);
						await window.setAlwaysOnTop(false);
						try {
							await window.setVisibleOnAllWorkspaces(false);
						} catch (error) {
							// Ignore if not supported on this platform
						}
						await window.setMinimizable(true);
						await window.setDecorations(true);
						await window.setFullscreen(false);
						await window.center();
						break;
				}
			} catch (error) {
				console.error('Failed to resize window:', error);
			}
		};

		resizeWindow();
	}, [viewMode]);

	useEffect(() => {
		onViewModeChange?.(viewMode);
	}, [viewMode, onViewModeChange]);
	const handleExitSprint = async () => {
		try {
			setViewMode('fullscreen');

			setTimeout(() => {
				onExit();
			}, 100);
		} catch (error) {
			console.error('Failed to restore window size:', error);
			onExit();
		}
	};
	const handleMinimize = async () => {
		try {
			const window = getCurrentWindow();
			// Temporarily disable always-on-top and workspace visibility before minimizing
			if (viewMode === 'sidebar' || viewMode === 'focus') {
				await window.setAlwaysOnTop(false);
				try {
					await window.setVisibleOnAllWorkspaces(false);
				} catch (error) {
					// Ignore if not supported on this platform
				}
			}
			await window.minimize();
			// Note: The interval-based maintenance will re-enable always-on-top when window is restored
		} catch (error) {
			console.error('Failed to minimize window:', error);
		}
	};
	useEffect(() => {
		if (completedTasks.length === totalTasks && totalTasks > 0) {
			// Set to fullscreen mode - this will trigger the window reset
			setViewMode('fullscreen');

			setTimeout(() => {
				// Session complete - show completion screen
				setCurrentTaskIndex(totalTasks); // This will trigger the completion screen
			}, 1000); // Give a moment for window transition
		}
	}, [completedTasks.length, totalTasks]);
	const getTimerMode = (): TimerMode => {
		if (isBreak) {
			return {
				type: 'countdown',
				duration: sessionType === 'long-break' ? 15 * 60 : 5 * 60, // 15min long break, 5min short break
				label: sessionType === 'long-break' ? 'Long Break' : 'Short Break',
			};
		}
		switch (timerType) {
			case 'pomodoro':
				return {
					type: 'pomodoro',
					duration: (pomodoroMinutes || 25) * 60,
					label: `Pomodoro: ${currentTask?.title || 'Work Session'}`,
				};
			case 'stopwatch':
				return {
					type: 'stopwatch',
					label: `Tracking: ${currentTask?.title || 'Work Session'}`,
				};
			case 'countdown':
			default:
				return {
					type: 'countdown',
					duration: countdownMinutes ? countdownMinutes * 60 : currentTask ? Math.max(currentTask.timeEstimate, 1) * 60 : 25 * 60,
					label: `Focus: ${currentTask?.title || 'Work Session'}`,
				};
		}
	}; // Format time for display (MM:SS)
	const formatTime = (seconds: number): string => {
		const mins = Math.floor(Math.abs(seconds) / 60);
		const secs = Math.abs(seconds) % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	// Timer control functions
	const handleTimerToggle = () => {
		setIsTimerRunning(!isTimerRunning);
	};

	const handleTimerComplete = () => {
		if (isBreak) {
			// Break is over, return to work
			setIsBreak(false);
			setSessionType('work');
		} else {
			// Work session is over
			if (currentTask) {
				handleTaskComplete(currentTask.id);
			}
		}
	};
	const handleTaskComplete = (taskId: number) => {
		// Prevent completing the same task multiple times
		if (completedTasks.includes(taskId)) {
			return;
		}

		const newCompletedTasks = [...completedTasks, taskId];
		setCompletedTasks(newCompletedTasks);
		onTaskComplete(taskId);

		// Check if all tasks are completed
		if (newCompletedTasks.length === totalTasks) {
			// All tasks completed - sprint is done
			return;
		}

		// Move to next task or break
		const nextIndex = currentTaskIndex + 1;
		if (nextIndex < totalTasks) {
			setCurrentTaskIndex(nextIndex);

			// Determine break type (every 4 tasks = long break)
			const completedCount = newCompletedTasks.length;
			const shouldTakeLongBreak = completedCount % 4 === 0;

			setIsBreak(true);
			setSessionType(shouldTakeLongBreak ? 'long-break' : 'short-break');
		}
	};

	const handleSkipTask = () => {
		const nextIndex = currentTaskIndex + 1;
		if (nextIndex < totalTasks) {
			setCurrentTaskIndex(nextIndex);
		}
	};

	const handleSkipBreak = () => {
		setIsBreak(false);
		setSessionType('work');
	};

	if (!currentTask && !isBreak) {
		return (
			<div className='min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/10 flex items-center justify-center p-4'>
				<Card className='max-w-md w-full'>
					<CardHeader className='text-center'>
						<CardTitle className='text-2xl text-primary'>🎉 Sprint Complete!</CardTitle>
						<CardDescription>Great job! You've completed all your tasks for today.</CardDescription>
					</CardHeader>
					<CardContent className='text-center space-y-4'>
						<div className='bg-accent/50 border border-primary/20 p-4 rounded-lg'>
							<p className='text-lg font-semibold text-primary'>{completedTasks.length} tasks completed</p>
							<p className='text-sm text-muted-foreground'>
								{Math.floor(completedMinutes / 60)}h {completedMinutes % 60}m of focused work
							</p>
						</div>
						<Button
							onClick={handleExitSprint}
							className='w-full'
						>
							Return to Dashboard
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const renderFullscreenMode = () => (
		<div className='min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/10 p-4'>
			<div className='max-w-lg mx-auto space-y-6'>
				<div className='flex justify-between items-center'>
					<div>
						<h1 className='text-2xl font-bold text-foreground'>Sprint Mode</h1>
						<p className='text-sm text-muted-foreground'>Stay focused and get things done</p>
					</div>
					<div className='flex gap-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={() => setViewMode('sidebar')}
						>
							<Minimize2 className='w-4 h-4' />
						</Button>
						<Button
							variant='outline'
							onClick={handleExitSprint}
						>
							Exit Sprint
						</Button>
					</div>
				</div>
				<Card>
					<CardHeader className='pb-3'>
						<div className='flex justify-between items-center'>
							<CardTitle className='text-lg'>Progress</CardTitle>
							<Badge variant='secondary'>
								{completedTasks.length} / {totalTasks} tasks
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className='space-y-3'>
							<div className='w-full bg-muted rounded-full h-3'>
								<div
									className='bg-primary h-3 rounded-full transition-all duration-500'
									style={{ width: `${progress}%` }}
								/>
							</div>
							<div className='flex justify-between text-sm text-muted-foreground'>
								<span>
									{Math.floor(completedMinutes / 60)}h {completedMinutes % 60}m completed
								</span>
								<span>
									{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
				{currentTask && !isBreak && (
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>🎯 Current Task</CardTitle>
							<CardDescription>{currentTask.title}</CardDescription>
						</CardHeader>
						<CardContent>
							{currentTask.description && <p className='text-sm text-muted-foreground mb-4'>{currentTask.description}</p>}{' '}
							<div className='flex gap-2'>
								<Button
									onClick={() => handleTaskComplete(currentTask.id)}
									disabled={completedTasks.includes(currentTask.id)}
									className='flex-1'
								>
									<Check className='w-4 h-4 mr-2' />
									{completedTasks.includes(currentTask.id) ? 'Completed' : 'Mark Complete'}
								</Button>
								<Button
									variant='outline'
									onClick={handleSkipTask}
									disabled={currentTaskIndex >= totalTasks - 1}
								>
									<SkipForward className='w-4 h-4' />
								</Button>
							</div>
						</CardContent>
					</Card>
				)}
				{isBreak && (
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								☕ Time for a Break
								<Badge variant='secondary'>{sessionType === 'long-break' ? 'Long Break' : 'Short Break'}</Badge>
							</CardTitle>
							<CardDescription>{sessionType === 'long-break' ? "Take a longer break, you've earned it!" : 'Take a quick break to recharge'}</CardDescription>
						</CardHeader>
						<CardContent>
							<div className='space-y-4'>
								<div className='text-center text-muted-foreground'>
									<p>• Stretch your body</p>
									<p>• Drink some water</p>
									<p>• Rest your eyes</p>
								</div>
								<Button
									variant='outline'
									onClick={handleSkipBreak}
									className='w-full'
								>
									Skip Break
								</Button>
							</div>
						</CardContent>{' '}
					</Card>
				)}{' '}
				{!isBreak && (
					<Card>
						<CardHeader>
							<CardTitle className='text-lg'>Up Next</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='space-y-2'>
								{tasks.slice(currentTaskIndex + 1, currentTaskIndex + 4).map(task => (
									<div
										key={task.id}
										className='flex justify-between items-center p-2 bg-accent/30 border border-border/30 rounded text-sm'
									>
										<span className='truncate text-foreground'>{task.title}</span>
										<Badge
											variant='outline'
											className='text-xs'
										>
											{task.timeEstimate}min
										</Badge>
									</div>
								))}
								{tasks.length > currentTaskIndex + 4 && <p className='text-xs text-muted-foreground text-center'>+{tasks.length - currentTaskIndex - 4} more tasks</p>}
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
	const renderSidebarMode = () => (
		<div className='fixed left-0 overflow-hidden top-0 w-full bg-background/95 backdrop-blur border-r border-border z-50 overflow-y-auto'>
			<div className='space-y-3'>
				<div
					className='flex justify-between items-center p-2 border-b border-border/30'
					data-tauri-drag-region
				>
					<h2 className='text-sm font-semibold text-foreground'>Sprint Mode</h2>
					<Button
						variant='ghost'
						size='sm'
						onClick={handleMinimize}
						className='h-6 w-6 p-0 opacity-50 hover:opacity-100'
						title='Minimize window'
					>
						<Minimize2 className='w-3 h-3' />
					</Button>
				</div>

				<div className='p-3 space-y-3'>
					<div className='space-y-2'>
						<div className='flex justify-between items-center'>
							<span className='text-xs text-muted-foreground'>Progress</span>
							<Badge
								variant='secondary'
								className='text-xs'
							>
								{completedTasks.length}/{totalTasks}
							</Badge>
						</div>
						<div className='w-full bg-muted rounded-full h-1.5'>
							<div
								className='bg-primary h-1.5 rounded-full transition-all duration-500'
								style={{ width: `${progress}%` }}
							/>
						</div>{' '}
					</div>
					{currentTask && !isBreak && (
						<div className='space-y-2'>
							<p className='text-xs font-medium text-foreground truncate'>Current Task: </p>
							<div className='text-sm font-medium text-foreground '>{currentTask.title}</div>
							<div className='grid grid-cols-2 gap-1'>
								{' '}
								<Button
									size='sm'
									onClick={() => handleTaskComplete(currentTask.id)}
									disabled={completedTasks.includes(currentTask.id)}
									className='h-7 text-xs'
								>
									{completedTasks.includes(currentTask.id) ? '✓ Done' : '✓ Done'}
								</Button>
								<Button
									variant='outline'
									size='sm'
									onClick={handleSkipTask}
									disabled={currentTaskIndex >= totalTasks - 1}
									className='h-7 text-xs'
								>
									Skip
								</Button>
							</div>
						</div>
					)}
					{isBreak && (
						<div className='space-y-2'>
							<div className='text-xs font-medium text-foreground'>Break Time</div>
							<Badge
								variant='secondary'
								className='text-xs'
							>
								{sessionType === 'long-break' ? 'Long' : 'Short'}
							</Badge>
							<Button
								variant='outline'
								size='sm'
								onClick={handleSkipBreak}
								className='w-full h-7 text-xs'
							>
								Skip Break
							</Button>
						</div>
					)}{' '}
					{/* Timer display */}
					<div className='space-y-2'>
						<div className='text-xs text-muted-foreground'>Timer</div>
						<div className='bg-accent/30 rounded p-2 text-center space-y-2'>
							<div className='text-lg font-mono text-primary font-bold'>{formatTime(timerSeconds)}</div>
							<Button
								size='sm'
								onClick={handleTimerToggle}
								className='h-6 w-full text-xs'
								variant={isTimerRunning ? 'outline' : 'default'}
							>
								{isTimerRunning ? <Pause className='w-3 h-3 mr-1' /> : <Play className='w-3 h-3 mr-1' />}
								{isTimerRunning ? 'Pause' : 'Start'}
							</Button>
						</div>
					</div>
					{!isBreak && tasks.slice(currentTaskIndex + 1, currentTaskIndex + 3).length > 0 && (
						<div className='space-y-1'>
							<div className='text-xs text-muted-foreground'>Coming Up</div>
							{tasks.slice(currentTaskIndex + 1, currentTaskIndex + 3).map(task => (
								<>
									<div
										key={task.id}
										className='text-xs bg-accent/30 rounded p-1.5 truncate text-foreground'
									>
										{task.title}
									</div>
								</>
							))}
						</div>
					)}
					<div className='pt-2 border-t border-border space-y-1'>
						<Button
							size='sm'
							onClick={() => setViewMode('focus')}
							className='w-full h-7 text-xs'
							variant='outline'
						>
							Focus Mode
						</Button>
						<Button
							size='sm'
							onClick={handleExitSprint}
							className='w-full h-7 text-xs'
							variant='outline'
						>
							Exit Sprint
						</Button>
					</div>
				</div>
			</div>{' '}
		</div>
	);
	// Render focus mode - minimal timer with hover controls (taskCard-sized)
	const renderFocusMode = () => {
		return (
			<div className={`w-full h-full border border-border rounded-lg shadow-lg group relative overflow-hidden ${isBreak ? 'bg-green-50 dark:bg-green-950' : 'bg-card'}`}>
				{/* Minimize button */}
				<Button
					variant='ghost'
					size='sm'
					onClick={handleMinimize}
					className='absolute top-0.5 right-0.5 h-3 w-3 p-0 opacity-20 hover:opacity-80 text-xs z-10'
					title='Minimize'
				>
					−
				</Button>

				<div
					className='w-full h-full flex items-center justify-between px-3 py-2 group-hover:opacity-0 transition-opacity duration-200'
					data-tauri-drag-region
				>
					<div className={`font-medium text-sm truncate flex-1 mr-2 ${isBreak ? 'text-green-700 dark:text-green-300' : 'text-foreground'}`}>{currentTask ? currentTask.title : isBreak ? `🌿 ${sessionType === 'long-break' ? 'Long Break' : 'Short Break'}` : 'Sprint'}</div>

					{/* Show actual timer progress */}
					<div className='text-sm font-mono text-primary font-bold'>{formatTime(timerSeconds)}</div>
				</div>

				<div className='absolute inset-0 bg-card/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center'>
					<div className='flex gap-1'>
						{currentTask && !isBreak && (
							<>
								<Button
									size='sm'
									onClick={() => handleTaskComplete(currentTask.id)}
									disabled={completedTasks.includes(currentTask.id)}
									className='h-6 w-6 p-0 text-xs'
									title='Mark Done'
								>
									<Check size={12} />
								</Button>
								<Button
									variant='outline'
									size='sm'
									onClick={handleSkipTask}
									disabled={currentTaskIndex >= totalTasks - 1}
									className='h-6 w-6 p-0 text-xs'
									title='Skip Task'
								>
									<SkipForward size={12} />
								</Button>
							</>
						)}
						{isBreak && (
							<Button
								variant='outline'
								size='sm'
								onClick={handleSkipBreak}
								className='h-6 w-6 p-0 text-xs'
								title='Skip Break'
							>
								<SkipForward size={12} />
							</Button>
						)}
						<Button
							variant='outline'
							size='sm'
							onClick={handleTimerToggle}
							className='h-6 w-6 p-0 text-xs'
							title={isTimerRunning ? 'Pause Timer' : 'Start Timer'}
						>
							{isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={() => setViewMode('sidebar')}
							className='h-6 w-6 p-0 text-xs'
							title='Expand to Sidebar'
						>
							<Maximize2 size={12} />
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={handleExitSprint}
							className='h-6 w-6 p-0 text-xs'
							title='End Sprint'
						>
							<X size={12} />
						</Button>
					</div>
				</div>
			</div>
		);
	};
	return (
		<>
			{/* Render the appropriate view mode */}
			{viewMode === 'sidebar' && renderSidebarMode()}
			{viewMode === 'focus' && renderFocusMode()}
			{viewMode === 'fullscreen' && renderFullscreenMode()}
		</>
	);
}
