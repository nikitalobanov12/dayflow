import { Task } from '@/types';
import { Button } from '@/components/ui/button';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Edit, Check } from 'lucide-react';
import { useState } from 'react';

interface TaskCardProps {
	task: Task;
	onMove: (taskId: number, status: Task['status']) => void;
	onEdit?: (task: Task) => void;
	onUpdateTimeEstimate?: (taskId: number, timeEstimate: number) => void;
	isDone?: boolean;
}

export const TaskCard = ({ task, onMove, onEdit, onUpdateTimeEstimate, isDone = false }: TaskCardProps) => {
	const [isEditingTime, setIsEditingTime] = useState(false);
	const [tempTimeEstimate, setTempTimeEstimate] = useState(task.timeEstimate.toString());
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: task.id.toString(),
	});

	const style = {
		transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
		transition: isDragging ? 'none' : 'transform 150ms ease-out',
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

	const handleEditClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onEdit?.(task);
	};

	const handleToggleComplete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (task.status === 'done') {
			// Move back to previous status (could be 'today' by default)
			onMove(task.id, 'today');
		} else {
			// Move to done
			onMove(task.id, 'done');
		}
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
	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			className={cn('touch-none transition-opacity duration-150 group', isDragging && 'opacity-30')}
		>
			<div className={cn('bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing', isDone && 'opacity-75 bg-gray-50')}>
				{/* Compact View */}
				<div className='relative p-3'>
					{/* Main Content */}
					<div className='flex items-start justify-between gap-2'>
						<div className='flex items-start gap-2 flex-1 min-w-0'>
							{/* Toggle Checkbox */}
							<button
								onClick={handleToggleComplete}
								className={cn('mt-0.5 shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer', task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-gray-400 bg-white')}
								title={task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
							>
								{task.status === 'done' && <Check className='h-2.5 w-2.5' />}
							</button>
							<div className='flex-1 min-w-0'>
								<h3 className={cn('text-sm font-medium line-clamp-2 leading-tight', isDone && 'line-through text-gray-500', !isDone && 'text-gray-800')}>{task.title}</h3>

								{/* Time Estimate - Always shown, bottom left under title */}
								<div className='mt-1'>
									{isEditingTime ? (
										<input
											type='number'
											value={tempTimeEstimate}
											onChange={e => setTempTimeEstimate(e.target.value)}
											onBlur={handleTimeEstimateSubmit}
											onKeyDown={handleTimeEstimateKeyDown}
											className='text-xs text-gray-500 bg-transparent border-none outline-none w-12 p-0'
											autoFocus
											min='0'
										/>
									) : (
										<button
											onClick={handleTimeEstimateClick}
											className={cn('text-xs text-gray-500 hover:text-gray-700 transition-colors', isDone && 'text-gray-400')}
											title='Click to edit time estimate'
										>
											{task.timeEstimate > 0 ? `${task.timeEstimate}m est` : '-- est'}
										</button>
									)}
								</div>
							</div>
						</div>{' '}
						{/* Edit button - Always visible in corner */}
						<div className='flex gap-1'>
							{/* Move buttons - Only visible on hover */}
							<div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
								{canMoveLeft && (
									<Button
										size='sm'
										variant='ghost'
										className='h-6 w-6 p-0 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 shadow-sm border border-gray-200'
										onClick={e => {
											e.stopPropagation();
											onMove(task.id, getPreviousStatus(task.status));
										}}
										title='Move left'
									>
										<ChevronLeft className='h-3 w-3' />
									</Button>
								)}
								{canMoveRight && (
									<Button
										size='sm'
										variant='ghost'
										className='h-6 w-6 p-0 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 shadow-sm border border-gray-200'
										onClick={e => {
											e.stopPropagation();
											onMove(task.id, getNextStatus(task.status));
										}}
										title='Move right'
									>
										<ChevronRight className='h-3 w-3' />
									</Button>
								)}
							</div>
							{/* Edit button - Always visible */}
							<Button
								size='sm'
								variant='ghost'
								className='h-6 w-6 p-0 text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 shadow-sm border border-gray-200'
								onClick={handleEditClick}
								title='Edit task'
							>
								<Edit className='h-3 w-3' />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
