import { useState } from 'react';
import { Task, Board } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { TaskContextMenu } from '@/components/task/TaskContextMenu';
import { TaskDisplay } from '@/components/task/TaskDisplay';
import { cn } from '@/lib/utils';
import { Edit } from 'lucide-react';

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
	userPreferences?: any;
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

	const priorityColors: Record<Task['priority'], string> = {
		1: 'border-l-green-500',
		2: 'border-l-yellow-500',
		3: 'border-l-orange-500',
		4: 'border-l-red-500',
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
					'flex items-center mb-3 px-2 py-4 bg-card rounded-md shadow-sm hover:bg-muted cursor-pointer border-l-4 transition-all duration-200',
					priorityColors[task.priority || 1],
					task.status === 'done' ? 'opacity-60' : ''
				)}
				onClick={handleItemClick}
			>
				<Checkbox
					checked={task.status === 'done'}
					onCheckedChange={handleCheckboxChange}
					onClick={e => e.stopPropagation()}
					className='mr-3'
					aria-label={`Mark task ${task.title} as ${task.status === 'done' ? 'incomplete' : 'complete'}`}
				/>
				
				<div className='flex-1'>
					<TaskDisplay
						task={task}
						boardInfo={boardInfo}
						userPreferences={userPreferences}
						showBoardInfo={!!boardInfo}
						showDates={true}
						showRecurring={true}
					/>
				</div>
				
				<div className='flex flex-col items-end ml-2 text-xs text-muted-foreground'>
					{/* Time estimate */}
					{isEditingTime ? (
						<input
							placeholder='--'
							type='number'
							value={tempTimeEstimate}
							onChange={e => setTempTimeEstimate(e.target.value)}
							onBlur={handleTimeEstimateSubmit}
							onKeyDown={handleTimeEstimateKeyDown}
							className='text-xs text-muted-foreground bg-transparent border-none outline-none w-12 p-0 focus:text-foreground mb-1'
							autoFocus
							min='0'
						/>
					) : (
						<button
							onClick={handleTimeEstimateClick}
							className={cn('text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium mb-1', isDone && 'text-muted-foreground/60')}
							title='Click to edit time estimate'
						>
							{task.timeEstimate > 0 ? `${task.timeEstimate} min` : '--'}
						</button>
					)}
					
					{/* Edit button */}
					<Button
						size='sm'
						variant='ghost'
						className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground'
						onClick={handleEditClick}
						title='Edit task'
					>
						<Edit className='h-3 w-3' />
					</Button>
				</div>
			</div>
		</TaskContextMenu>
	);
}
