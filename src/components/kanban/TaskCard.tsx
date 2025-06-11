import { Task, Board } from '@/types';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Edit, Check, Copy, Trash2, ArrowLeft, ArrowRight, ArrowUp, Calendar } from 'lucide-react';
import { useState } from 'react';
import { SubtasksContainer } from '@/components/subtasks/SubtasksContainer';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface TaskCardProps {
	task: Task;
	onMove: (taskId: number, status: Task['status']) => void;
	onEdit?: (task: Task) => void;
	onUpdateTimeEstimate?: (taskId: number, timeEstimate: number) => void;
	onDuplicate?: (task: Task) => void;
	onDelete?: (taskId: number) => void;
	isDone?: boolean;
	boardInfo?: Board | null; // Board information for display
	userPreferences?: any; // User preferences for date formatting
}

export function TaskCard({ task, onMove, onEdit, onUpdateTimeEstimate, onDuplicate, onDelete, isDone = false, boardInfo = null, userPreferences }: TaskCardProps) {
	const [isEditingTime, setIsEditingTime] = useState(false);
	const [tempTimeEstimate, setTempTimeEstimate] = useState(task.timeEstimate.toString());
	// Apply user preferences for date formatting
	const { formatDate } = useUserPreferences(userPreferences);
	// Helper function to get priority color and style
	const getPriorityStyle = (priority: Task['priority']) => {
		switch (priority) {
			case 1: // Low
				return {
					color: '#0ea5e9', // sky-500
					bgColor: '#e0f2fe', // sky-100
					darkBgColor: '#0c4a6e', // sky-900
				};
			case 2: // Medium
				return {
					color: '#eab308', // yellow-500
					bgColor: '#fefce8', // yellow-50
					darkBgColor: '#713f12', // yellow-900
				};
			case 3: // High
				return {
					color: '#f97316', // orange-500
					bgColor: '#fff7ed', // orange-50
					darkBgColor: '#9a3412', // orange-900
				};
			case 4: // Critical
				return {
					color: '#ef4444', // red-500
					bgColor: '#fef2f2', // red-50
					darkBgColor: '#7f1d1d', // red-900
				};
			default:
				return {
					color: '#64748b', // gray-500
					bgColor: '#f1f5f9', // gray-100
					darkBgColor: '#1e293b', // gray-800
				};
		}
	};

	const priorityStyle = getPriorityStyle(task.priority);

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

	const handleDuplicate = () => {
		onDuplicate?.(task);
	};

	const handleDelete = () => {
		onDelete?.(task.id);
	};

	const handleMoveToBacklog = () => {
		onMove(task.id, 'backlog');
	};

	const handleMoveToThisWeek = () => {
		onMove(task.id, 'this-week');
	};

	const handleMoveToToday = () => {
		onMove(task.id, 'today');
	};

	const handleMoveToDone = () => {
		onMove(task.id, 'done');
	};
	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<div
					className='transition-all duration-200 group'
					onClick={() => onEdit?.(task)}
				>
					<div className={cn('bg-card border border-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer', 'hover:border-border/80 hover:-translate-y-0.5', isDone && 'opacity-70 saturate-50')}>
						<div className='relative p-3'>
							{' '}
							{/* Top Row: Board/List Information */}
							<div className='flex items-center gap-2 mb-3'>
								<div
									className='w-2.5 h-2.5 rounded-full'
									style={{ backgroundColor: boardInfo?.color || '#3B82F6' }}
								/>
								<span className='text-xs text-muted-foreground font-medium truncate'>{boardInfo?.name}</span>

								{/* Priority Circle */}
								<div
									className='flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold'
									style={{
										backgroundColor: priorityStyle.bgColor,
										color: priorityStyle.color,
									}}
									title={`Priority: ${task.priority} (${task.priority === 1 ? 'Low' : task.priority === 2 ? 'Medium' : task.priority === 3 ? 'High' : 'Critical'})`}
								>
									{task.priority}
								</div>

								{/* Move buttons on hover */}
								<div className='flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300'>
									{canMoveLeft && (
										<Button
											size='sm'
											variant='ghost'
											className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground'
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
											className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground'
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
							</div>{' '}
							{/* Line 1: Title */}
							<div className='mb-2'>
								<h3 className={cn('text-sm font-medium leading-tight transition-all duration-200', isDone && 'line-through text-muted-foreground', !isDone && 'text-card-foreground')}>{task.title}</h3>
							</div>
							{/* Line 2: Description */}
							<div className='mb-2'>{task.description && task.description.trim() !== '' ? <p className={cn('text-xs text-muted-foreground leading-relaxed', isDone && 'text-muted-foreground/60')}>{task.description.length > 80 ? `${task.description.substring(0, 80)}...` : task.description}</p> : <p className='text-xs text-muted-foreground/50 italic'>No description</p>}</div>
							{/* Line 2.5: Dates (if any) */}
							{(task.dueDate || task.startDate || task.scheduledDate) && (
								<div className='mb-2 flex flex-wrap gap-1'>
									{task.dueDate && (
										<div className='flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 rounded text-xs'>
											<Calendar className='h-3 w-3' />
											<span>Due: {formatDate(task.dueDate)}</span>
										</div>
									)}
									{task.startDate && (
										<div className='flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 rounded text-xs'>
											<Calendar className='h-3 w-3' />
											<span>Start: {formatDate(task.startDate)}</span>
										</div>
									)}
									{task.scheduledDate && !task.startDate && (
										<div className='flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 rounded text-xs'>
											<Calendar className='h-3 w-3' />
											<span>Scheduled: {formatDate(task.scheduledDate)}</span>
										</div>
									)}
								</div>
							)}
							{/* Line 3: Time estimate + Checkbox + Edit button */}
							<div className='flex items-center justify-between'>
								<div className='flex items-center gap-2'>
									{/* Time estimate */}
									{isEditingTime ? (
										<input
											type='number'
											value={tempTimeEstimate}
											onChange={e => setTempTimeEstimate(e.target.value)}
											onBlur={handleTimeEstimateSubmit}
											onKeyDown={handleTimeEstimateKeyDown}
											className='text-xs text-muted-foreground bg-transparent border-none outline-none w-12 p-0 focus:text-foreground'
											autoFocus
											min='0'
										/>
									) : (
										<button
											onClick={handleTimeEstimateClick}
											className={cn('text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium', isDone && 'text-muted-foreground/60')}
											title='Click to edit time estimate'
										>
											{task.timeEstimate > 0 ? `${task.timeEstimate} min` : '--'}
										</button>
									)}
								</div>
								<div className='flex items-center gap-2'>
									{/* Checkbox */}
									<button
										onClick={handleToggleComplete}
										className={cn('shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 cursor-pointer', task.status === 'done' ? 'bg-primary border-primary text-primary-foreground shadow-sm' : 'border-border hover:border-primary/50 bg-background hover:bg-accent/30')}
										title={task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
									>
										{task.status === 'done' && <Check className='h-2.5 w-2.5' />}
									</button>

									{/* Edit button */}
									<Button
										size='sm'
										variant='ghost'
										className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground'
										onClick={handleEditClick}
										title='Edit task'
									>
										<Edit className='h-3 w-3' />{' '}
									</Button>
								</div>
							</div>
							{/* Subtasks List - Only render if not dragging to improve performance */}
							<SubtasksContainer taskId={task.id} />
						</div>
					</div>
				</div>
			</ContextMenuTrigger>
			<ContextMenuContent className='w-64'>
				<ContextMenuItem onClick={handleEditClick}>
					<Edit className='mr-2 h-4 w-4' />
					Edit Task
				</ContextMenuItem>
				<ContextMenuItem onClick={handleDuplicate}>
					<Copy className='mr-2 h-4 w-4' />
					Duplicate Task
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onClick={handleToggleComplete}>
					<Check className='mr-2 h-4 w-4' />
					{task.status === 'done' ? 'Mark as Incomplete' : 'Mark as Complete'}
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<ArrowRight className='mr-2 h-4 w-4' />
						Move to...
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{task.status !== 'backlog' && (
							<ContextMenuItem onClick={handleMoveToBacklog}>
								<ArrowLeft className='mr-2 h-4 w-4' />
								Backlog
							</ContextMenuItem>
						)}
						{task.status !== 'this-week' && (
							<ContextMenuItem onClick={handleMoveToThisWeek}>
								<ArrowUp className='mr-2 h-4 w-4' />
								This Week
							</ContextMenuItem>
						)}
						{task.status !== 'today' && (
							<ContextMenuItem onClick={handleMoveToToday}>
								<ArrowUp className='mr-2 h-4 w-4' />
								Today
							</ContextMenuItem>
						)}
						{task.status !== 'done' && (
							<ContextMenuItem onClick={handleMoveToDone}>
								<Check className='mr-2 h-4 w-4' />
								Done
							</ContextMenuItem>
						)}
					</ContextMenuSubContent>
				</ContextMenuSub>
				<ContextMenuSeparator />
				<ContextMenuItem
					onClick={handleDelete}
					className='text-destructive'
				>
					{' '}
					<Trash2 className='mr-2 h-4 w-4' />
					Delete Task
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
