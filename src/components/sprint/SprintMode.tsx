import { useState, useEffect } from 'react';
import { Task } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timer, TimerMode } from '@/components/timer/Timer';

interface SprintModeProps {
	tasks: Task[];
	onTaskComplete: (taskId: number) => void;
	onExit: () => void;
}

export function SprintMode({ tasks, onTaskComplete, onExit }: SprintModeProps) {
	const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
	const [completedTasks, setCompletedTasks] = useState<number[]>([]);
	const [isBreak, setIsBreak] = useState(false);
	const [sessionType, setSessionType] = useState<'work' | 'short-break' | 'long-break'>('work');

	const currentTask = tasks[currentTaskIndex];
	const totalTasks = tasks.length;
	const totalMinutes = tasks.reduce((sum, task) => sum + task.timeEstimate, 0);
	const completedMinutes = completedTasks.reduce((sum, taskId) => {
		const task = tasks.find(t => t.id === taskId);
		return sum + (task?.timeEstimate || 0);
	}, 0);

	const progress = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

	useEffect(() => {
		// Auto-advance when all tasks are completed
		if (completedTasks.length === totalTasks && totalTasks > 0) {
			setTimeout(() => {
				// Session complete!
			}, 1000);
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

		return {
			type: 'countdown',
			duration: currentTask ? currentTask.timeEstimate * 60 : 25 * 60, // Convert minutes to seconds
			label: `Focus: ${currentTask?.title || 'Work Session'}`,
		};
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
		setCompletedTasks(prev => [...prev, taskId]);
		onTaskComplete(taskId);

		// Move to next task or break
		const nextIndex = currentTaskIndex + 1;
		if (nextIndex < totalTasks) {
			setCurrentTaskIndex(nextIndex);

			// Determine break type (every 4 tasks = long break)
			const completedCount = completedTasks.length + 1;
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
			<div className='min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4'>
				<Card className='max-w-md w-full'>
					<CardHeader className='text-center'>
						<CardTitle className='text-2xl text-green-600'>🎉 Sprint Complete!</CardTitle>
						<CardDescription>Great job! You've completed all your tasks for today.</CardDescription>
					</CardHeader>
					<CardContent className='text-center space-y-4'>
						<div className='bg-green-100 p-4 rounded-lg'>
							<p className='text-lg font-semibold text-green-700'>{completedTasks.length} tasks completed</p>
							<p className='text-sm text-green-600'>
								{Math.floor(completedMinutes / 60)}h {completedMinutes % 60}m of focused work
							</p>
						</div>
						<Button
							onClick={onExit}
							className='w-full'
						>
							Return to Dashboard
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
			<div className='max-w-lg mx-auto space-y-6'>
				{/* Header */}
				<div className='flex justify-between items-center'>
					<div>
						<h1 className='text-2xl font-bold text-gray-800'>Sprint Mode</h1>
						<p className='text-sm text-gray-600'>Stay focused and get things done</p>
					</div>
					<Button
						variant='outline'
						onClick={onExit}
					>
						Exit Sprint
					</Button>
				</div>

				{/* Progress Overview */}
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
							<div className='w-full bg-gray-200 rounded-full h-3'>
								<div
									className='bg-blue-600 h-3 rounded-full transition-all duration-500'
									style={{ width: `${progress}%` }}
								/>
							</div>
							<div className='flex justify-between text-sm text-gray-600'>
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

				{/* Current Focus */}
				{currentTask && !isBreak && (
					<Card>
						{' '}
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>🎯 Current Task</CardTitle>
							<CardDescription>{currentTask.title}</CardDescription>
						</CardHeader>
						<CardContent>
							{currentTask.description && <p className='text-sm text-gray-600 mb-4'>{currentTask.description}</p>}
							<div className='flex gap-2'>
								<Button
									onClick={() => handleTaskComplete(currentTask.id)}
									className='flex-1'
								>
									Mark Complete
								</Button>
								<Button
									variant='outline'
									onClick={handleSkipTask}
									disabled={currentTaskIndex >= totalTasks - 1}
								>
									Skip
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Break Mode */}
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
								<div className='text-center text-gray-600'>
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
						</CardContent>
					</Card>
				)}

				{/* Timer */}
				<Timer
					mode={getTimerMode()}
					onComplete={handleTimerComplete}
					autoStart={true}
				/>

				{/* Upcoming Tasks */}
				{!isBreak && (
					<Card>
						<CardHeader>
							<CardTitle className='text-lg'>Up Next</CardTitle>
						</CardHeader>
						<CardContent>
							{' '}
							<div className='space-y-2'>
								{tasks.slice(currentTaskIndex + 1, currentTaskIndex + 4).map(task => (
									<div
										key={task.id}
										className='flex justify-between items-center p-2 bg-gray-50 rounded text-sm'
									>
										<span className='truncate'>{task.title}</span>
										<Badge
											variant='outline'
											className='text-xs'
										>
											{task.timeEstimate}min
										</Badge>
									</div>
								))}
								{tasks.length > currentTaskIndex + 4 && <p className='text-xs text-gray-500 text-center'>+{tasks.length - currentTaskIndex - 4} more tasks</p>}
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
