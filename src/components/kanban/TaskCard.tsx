import { Task } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

interface TaskCardProps {
	task: Task;
	onMove: (taskId: number, status: Task['status']) => void;
	onEdit?: (task: Task) => void;
	onDelete?: (taskId: number) => void;
	isDone?: boolean;
}

export const TaskCard = ({ task, onMove, onEdit, onDelete, isDone = false }: TaskCardProps) => {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id.toString() });
	const style = {
		transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
	};

	const canMoveLeft = task.status !== 'backlog';
	const canMoveRight = task.status !== 'done';

	const getNextStatus = (currentStatus: Task['status']): Task['status'] => {
		switch (currentStatus) {
			case 'backlog':
				return 'this-week';
			case 'this-week':
				return 'today';
			case 'today':
				return 'done';
			default:
				return 'done';
		}
	};

	const getPreviousStatus = (currentStatus: Task['status']): Task['status'] => {
		switch (currentStatus) {
			case 'done':
				return 'today';
			case 'today':
				return 'this-week';
			case 'this-week':
				return 'backlog';
			default:
				return 'backlog';
		}
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			className={cn('touch-none transition-all duration-200 group', isDragging && 'opacity-0')}
		>
			<div className={cn('bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200', isDone && 'opacity-75 bg-gray-50')}>
				<div className='pb-2 p-3 sm:p-4'>
					{' '}
					<div className='flex justify-between items-start gap-2'>
						<div className='flex items-start gap-2 flex-1 min-w-0'>
							<button
								{...listeners}
								className='cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 transition-opacity pt-0.5 shrink-0'
								title='Drag to move task'
							>
								<GripVertical className='h-3 w-3' />
							</button>
							<h3
								className={cn('text-xs sm:text-sm font-medium line-clamp-2 cursor-pointer hover:text-blue-600 flex-1 min-w-0', isDone && 'line-through text-gray-500')}
								onClick={e => {
									e.stopPropagation();
									onEdit?.(task);
								}}
							>
								{task.title}
							</h3>
						</div>
					</div>
				</div>
				<div className='pt-0 p-3 sm:p-4 space-y-2 sm:space-y-3'>
					{task.description && (
						<p
							className={cn('text-xs line-clamp-2 sm:line-clamp-3 cursor-pointer hover:text-blue-600 text-gray-600', isDone && 'line-through text-gray-400')}
							onClick={e => {
								e.stopPropagation();
								onEdit?.(task);
							}}
						>
							{task.description}
						</p>
					)}
					{task.tags && task.tags.length > 0 && (
						<div className='flex flex-wrap gap-1'>
							{task.tags.slice(0, 2).map((tag, index) => (
								<Badge
									key={index}
									variant='outline'
									className='text-xs px-1 py-0'
								>
									{tag}
								</Badge>
							))}
							{task.tags.length > 2 && (
								<Badge
									variant='outline'
									className='text-xs px-1 py-0'
								>
									+{task.tags.length - 2}
								</Badge>
							)}
						</div>
					)}{' '}
					<div className='flex justify-between items-center text-xs text-gray-500'>
						{' '}
						<div className='flex items-center gap-1 sm:gap-2 flex-wrap'>
							{task.timeEstimate > 0 && <span className='bg-blue-100 text-blue-700 px-1 sm:px-2 py-1 rounded text-xs whitespace-nowrap'>{task.timeEstimate}m</span>}
							{task.scheduledDate && <span className='text-gray-400 hidden sm:inline text-xs'>📅 {new Date(task.scheduledDate).toLocaleDateString()}</span>}
						</div>
						<div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
							{canMoveLeft && (
								<Button
									size='sm'
									variant='outline'
									className='h-5 w-5 sm:h-6 sm:w-6 p-0 text-xs'
									onClick={e => {
										e.stopPropagation();
										onMove(task.id, getPreviousStatus(task.status));
									}}
									title='Move left'
								>
									←
								</Button>
							)}
							{canMoveRight && (
								<Button
									size='sm'
									variant='outline'
									className='h-5 w-5 sm:h-6 sm:w-6 p-0 text-xs'
									onClick={e => {
										e.stopPropagation();
										onMove(task.id, getNextStatus(task.status));
									}}
									title='Move right'
								>
									→
								</Button>
							)}
							{onDelete && (
								<Button
									size='sm'
									variant='outline'
									className='h-5 w-5 sm:h-6 sm:w-6 p-0 text-xs text-red-500 hover:text-red-700'
									onClick={e => {
										e.stopPropagation();
										onDelete(task.id);
									}}
									title='Delete task'
								>
									×
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
