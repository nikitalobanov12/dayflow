import { Task } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
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
	onDeleteTask?: (taskId: number) => void;
	onAddTask?: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
	showAddButton?: boolean;
	showProgress?: boolean;
	completedCount?: number; // For progress calculation
}

export function KanbanColumn({ title, status, tasks, onMoveTask, onEditTask, onDeleteTask, onAddTask, showAddButton = true, showProgress = false, completedCount = 0 }: KanbanColumnProps) {
	const { isOver, setNodeRef } = useDroppable({
		id: status,
	});
	const [isAdding, setIsAdding] = useState(false);
	const [newTaskTitle, setNewTaskTitle] = useState('');
	const [newTaskTime, setNewTaskTime] = useState('');

	// Calculate progress percentage
	const progressPercentage = showProgress && tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
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
			});
			setNewTaskTitle('');
			setNewTaskTime('');
			// Don't close the form - keep isAdding true for easier multiple task creation
		} catch (error) {
			console.error('Failed to add task:', error);
		}
	};
	return (
		<div className='flex-none w-80 bg-white border border-gray-200 flex flex-col h-full'>
			{/* Column Header */}
			<div className='p-4 border-b border-gray-200 flex-shrink-0'>
				<div className='flex justify-between items-center mb-2'>
					<h3 className='font-semibold text-lg text-gray-800'>{title}</h3>
					{showAddButton && (
						<Button
							size='sm'
							variant='ghost'
							onClick={() => setIsAdding(!isAdding)}
							className='h-8 w-8 p-0'
						>
							<Plus className='h-4 w-4' />
						</Button>
					)}
				</div>
				{showProgress ? (
					<div className='space-y-1'>
						<div className='flex justify-between text-xs text-gray-600'>
							<span>Progress</span>
							<span>{Math.round(progressPercentage)}%</span>
						</div>
						<div className='w-full bg-gray-200 rounded-full h-2'>
							<div
								className='bg-blue-600 h-2 rounded-full transition-all duration-300'
								style={{ width: `${progressPercentage}%` }}
							/>
						</div>
					</div>
				) : (
					<span className='text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block'>{tasks.length}</span>
				)}{' '}
				{/* Add Task Form */}
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
			</div>
			{/* Scrollable Task List */}
			<div
				ref={setNodeRef}
				className={cn('flex-1 overflow-y-auto p-3 space-y-3 min-h-full transition-colors', isOver && 'bg-blue-50')}
			>
				{tasks.map(task => (
					<TaskCard
						key={task.id}
						task={task}
						onMove={onMoveTask}
						onEdit={onEditTask}
						onDelete={onDeleteTask}
						isDone={status === 'done'}
					/>
				))}

				{tasks.length === 0 && (
					<div className='text-center text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-lg'>
						<p className='text-sm'>No tasks</p>
						<p className='text-xs mt-1'>Drag tasks here</p>
					</div>
				)}
			</div>
		</div>
	);
}
