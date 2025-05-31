import { Task } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface KanbanColumnProps {
	title: string;
	status: Task['status'];
	tasks: Task[];
	onMoveTask: (taskId: number, newStatus: Task['status']) => void;
	onEditTask?: (task: Task) => void;
	onAddTask?: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
	onUpdateTimeEstimate?: (taskId: number, timeEstimate: number) => void;
	showAddButton?: boolean;
	showProgress?: boolean;
	completedCount?: number; // For progress calculation
	totalTimeEstimate?: number; // Total time in minutes for cumulative display
}

export function KanbanColumn({ title, status, tasks, onMoveTask, onEditTask, onAddTask, onUpdateTimeEstimate, showAddButton = true, showProgress = false, completedCount = 0, totalTimeEstimate = 0 }: KanbanColumnProps) {
	const { isOver, setNodeRef } = useDroppable({
		id: status,
	});
	const [isAdding, setIsAdding] = useState(false);
	const [newTaskTitle, setNewTaskTitle] = useState('');
	const [newTaskTime, setNewTaskTime] = useState('');
	// Calculate progress percentage
	const progressPercentage = showProgress && tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

	// Utility function to format minutes as HH:MM
	const formatTime = (minutes: number): string => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 100) return '100+ Hr';
		return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
	};

	const handleAddTask = async () => {
		if (!newTaskTitle.trim() || !onAddTask) return;

		// Parse time estimate in minutes - if empty, default to 0
		const timeInMinutes = parseInt(newTaskTime) || 0;
		try {
			await onAddTask({
				title: newTaskTitle,
				description: '',
				timeEstimate: timeInMinutes,
				status: status,
				position: tasks.length, // Add to end of current column
			});
			setNewTaskTitle('');
			setNewTaskTime('');
			// Don't close the form - keep isAdding true for easier multiple task creation
		} catch (error) {
			console.error('Failed to add task:', error);
		}
	};
	return (
		<div className='flex-none rounded-xl w-80 bg-card border border-border shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full backdrop-blur-sm'>
			<div className='p-4 border-b border-border/50 flex-shrink-0'>
				<div className='flex justify-between items-center mb-2'>
					<h3 className='font-semibold text-lg text-card-foreground'>{title}</h3>
					{totalTimeEstimate > 0 && <span className='text-sm font-mono text-muted-foreground px-2 py-1 rounded-md ml-2 '>{formatTime(totalTimeEstimate)} Remaining</span>}

					{showAddButton && (
						<Button
							size='sm'
							variant='ghost'
							onClick={() => setIsAdding(!isAdding)}
							className='h-8 w-8 p-0 hover:bg-accent/80 rounded-full transition-all duration-200 hover:scale-105'
						>
							<Plus className='h-4 w-4' />
						</Button>
					)}
				</div>{' '}
				<div className='flex items-center justify-between'>
					{showProgress ? (
						<div className='space-y-1 flex-1'>
							<div className='flex justify-between text-xs text-muted-foreground'>
								<span>Progress</span>
								<span>{Math.round(progressPercentage)}%</span>
							</div>
							<div className='w-full bg-muted rounded-full h-2.5 overflow-hidden'>
								<div
									className='bg-primary h-full rounded-full transition-all duration-500 ease-out'
									style={{ width: `${progressPercentage}%` }}
								/>
							</div>
						</div>
					) : (
						<span className='text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full inline-block font-medium border border-border/30'>{tasks.length}</span>
					)}
				</div>{' '}
				{isAdding && showAddButton && (
					<div className='mt-3 space-y-2'>
						<Input
							placeholder='Task title'
							value={newTaskTitle}
							onChange={e => setNewTaskTitle(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && handleAddTask()}
							className='text-sm'
						/>{' '}
						<div className='flex gap-2'>
							<Input
								type='number'
								placeholder='Minutes (optional)'
								value={newTaskTime}
								onChange={e => setNewTaskTime(e.target.value)}
								className='text-sm flex-1'
								min='0'
								max='999'
							/>
							<Button
								size='sm'
								onClick={handleAddTask}
								disabled={!newTaskTitle.trim()}
							>
								Add
							</Button>
							<Button
								size='sm'
								variant='outline'
								onClick={() => {
									setIsAdding(false);
									setNewTaskTitle('');
									setNewTaskTime('');
								}}
							>
								Done
							</Button>
						</div>
					</div>
				)}
			</div>{' '}
			<div
				ref={setNodeRef}
				className={cn('flex-1 overflow-y-auto p-3 space-y-3 transition-all duration-300 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent', isOver && 'bg-accent/20 ring-2 ring-primary/20 ring-inset')}
			>
				<SortableContext
					items={tasks.map(task => task.id.toString())}
					strategy={verticalListSortingStrategy}
				>
					{tasks.map(task => (
						<TaskCard
							key={task.id}
							task={task}
							onMove={onMoveTask}
							onEdit={onEditTask}
							onUpdateTimeEstimate={onUpdateTimeEstimate}
							isDone={status === 'done'}
						/>
					))}
				</SortableContext>
				{tasks.length === 0 && (
					<div className='text-center text-muted-foreground py-8 border-2 border-dashed border-border/30 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors duration-300'>
						<p className='text-sm font-medium'>No tasks</p>
						<p className='text-xs mt-1 opacity-70'>Drag tasks here or add new ones</p>
					</div>
				)}
			</div>
		</div>
	);
}
