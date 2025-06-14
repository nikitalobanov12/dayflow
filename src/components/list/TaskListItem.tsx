import { Task } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface TaskListItemProps {
	task: Task;
	onToggleComplete: (taskId: number) => void;
	onEditTask: (task: Task) => void; // Or (taskId: number) => void
	// Add other props like onSelect, etc., if needed
}

export function TaskListItem({ task, onToggleComplete, onEditTask }: TaskListItemProps) {
	const handleCheckboxChange = () => {
		onToggleComplete(task.id);
	};

	const handleItemClick = () => {
		onEditTask(task);
	};

	const priorityColors: Record<Task['priority'], string> = {
		1: 'border-l-red-500',
		2: 'border-l-orange-500',
		3: 'border-l-yellow-500',
		4: 'border-l-gray-400',
	};

	return (
		<div
			className={cn(
				'flex items-center mb-3 p-3 bg-card rounded-md shadow-sm hover:bg-muted cursor-pointer border-l-4',
				priorityColors[task.priority || 1], // Default to lowest priority color if undefined
				task.status === 'done' ? 'opacity-60' : ''
			)}
			onClick={handleItemClick}
		>
			<Checkbox
				checked={task.status === 'done'}
				onCheckedChange={handleCheckboxChange}
				onClick={e => e.stopPropagation()} // Prevent item click when checkbox is clicked
				className='mr-3'
				aria-label={`Mark task ${task.title} as ${task.status === 'done' ? 'incomplete' : 'complete'}`}
			/>
			<div className='flex-1'>
				<p className={cn('font-medium', task.status === 'done' ? 'line-through text-muted-foreground' : '')}>{task.title}</p>
				{task.description && <p className='text-sm text-muted-foreground truncate max-w-md'>{task.description}</p>}
			</div>
			<div className='flex flex-col items-end ml-2 text-xs text-muted-foreground'>
				{task.dueDate && <span>Due: {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}</span>}
				{task.timeEstimate > 0 && <span>Est: {task.timeEstimate}m</span>}
			</div>
		</div>
	);
}
