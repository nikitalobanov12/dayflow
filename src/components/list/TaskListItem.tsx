import React, { useState } from 'react';
import { Task, Board, UserPreferences } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { TaskContextMenu } from '@/components/task/TaskContextMenu';
import { cn } from '@/lib/utils';
import { Edit } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface TaskListItemProps {
	task: Task;
	onToggleComplete: (taskId: number) => void;
	onEditTask: (task: Task) => void;
	onMoveTask?: (taskId: number, newStatus: Task['status']) => Promise<void>;
	onUpdateTask?: (id: number, updates: Partial<Task>) => Promise<void>;
	onUpdateTimeEstimate?: (taskId: number, timeEstimate: number) => Promise<void>;
	onDuplicateTask?: (task: Task) => Promise<void>;
	onDeleteTask?: (taskId: number) => Promise<void>;
	boardInfo?: Board | null;
	userPreferences?: UserPreferences;
	isDone?: boolean;
}

export function TaskListItem({ 
	task, 
	onToggleComplete, 
	onEditTask, 
	onMoveTask,
	onUpdateTask,
	onUpdateTimeEstimate,
	onDuplicateTask,
	onDeleteTask,
	boardInfo,
	userPreferences,
	isDone = false
}: TaskListItemProps) {
	const { formatDate } = useUserPreferences(userPreferences);
	const [isEditingTime, setIsEditingTime] = useState(false);
	const [tempTimeEstimate, setTempTimeEstimate] = useState(task.timeEstimate.toString());

	const handleCheckboxChange = () => {
		onToggleComplete(task.id);
	};

	const handleItemClick = () => {
		onEditTask(task);
	};

	const handleEditClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onEditTask(task);
	};

	const handleTimeEstimateClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsEditingTime(true);
	};

	const handleTimeEstimateSubmit = () => {
		const newEstimate = parseInt(tempTimeEstimate) || 0;
		onUpdateTimeEstimate?.(task.id, newEstimate);
		setIsEditingTime(false);
	};

	const handleTimeEstimateKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleTimeEstimateSubmit();
		} else if (e.key === 'Escape') {
			setTempTimeEstimate(task.timeEstimate.toString());
			setIsEditingTime(false);
		}
	};

	const priorityTextColors: Record<Task['priority'], string> = {
		1: 'text-green-500',
		2: 'text-yellow-500',
		3: 'text-orange-500',
		4: 'text-red-500',
	};

	return (
		<TaskContextMenu
			task={task}
			onEdit={onEditTask}
			onDuplicate={onDuplicateTask}
			onDelete={onDeleteTask}
			onUpdateTask={onUpdateTask}
			onMoveTask={onMoveTask}
			onUpdateTimeEstimate={onUpdateTimeEstimate}
			onToggleComplete={onToggleComplete}
			boardInfo={boardInfo}
			userPreferences={userPreferences}
		>
			<div
				className={cn(
					'grid items-center mb-3 px-4 py-2 bg-background rounded-md shadow-sm hover:bg-muted cursor-pointer transition-all duration-200 gap-x-2',
					task.status === 'done' ? 'opacity-60' : ''
				)}
				style={{ gridTemplateColumns: '2rem 1fr 8rem 8rem 6rem 8rem 3rem' }}
				onClick={handleItemClick}
			>
				{/* Checkbox */}
				<Checkbox
					checked={task.status === 'done'}
					onCheckedChange={handleCheckboxChange}
					onClick={e => e.stopPropagation()}
					className='mr-2'
					aria-label={`Mark task ${task.title} as ${task.status === 'done' ? 'incomplete' : 'complete'}`}
				/>

				{/* Title */}
				<span className='truncate font-medium text-left'>{task.title}</span>

				{/* Board Name */}
				{boardInfo && (
					<span className='text-sm text-muted-foreground text-center'>
						{boardInfo.name}
					</span>
				)}

				{/* Due Date */}
				<span className='text-sm text-muted-foreground text-center'>
					{task.dueDate ? formatDate(task.dueDate) : '--'}
				</span>

				{/* Priority */}
				<span
					className={cn('font-medium text-center', priorityTextColors[task.priority])}
					title={`Priority: ${task.priority}`}
				>
					{task.priority}
				</span>

				{/* Time Estimate */}
				{isEditingTime ? (
					<input
						placeholder='--'
						type='number'
						value={tempTimeEstimate}
						onChange={e => setTempTimeEstimate(e.target.value)}
						onBlur={handleTimeEstimateSubmit}
						onKeyDown={handleTimeEstimateKeyDown}
						className='text-sm text-muted-foreground bg-transparent border-none outline-none w-full p-0 focus:text-foreground text-center'
						autoFocus
						min='0'
					/>
				) : (
					<button
						onClick={e => { e.stopPropagation(); handleTimeEstimateClick(e); }}
						className={cn('text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium text-center', isDone && 'text-muted-foreground/60')}
						title='Click to edit time estimate'
					>
						{task.timeEstimate > 0 ? `${task.timeEstimate} min` : '--'}
					</button>
				)}

				{/* Edit Action */}
				<Button
					size='sm'
					variant='ghost'
					className='p-1 text-muted-foreground hover:text-foreground justify-self-center'
					onClick={handleEditClick}
					title='Edit task'
				>
					<Edit className='h-4 w-4' />
				</Button>
			</div>
		</TaskContextMenu>
	);
}
