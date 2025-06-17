import { Task, Board } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle, Edit, Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';

interface TaskSidebarProps {
	tasks: Task[];
	completedTasks?: Task[];
	sidebarTitle: string;
	completedTitle?: string;
	onTaskClick: (task: Task) => void;
	onTaskEdit?: (task: Task) => void;
	onTaskDelete?: (taskId: number) => void;
	onTaskDuplicate?: (task: Task) => void;
	onTaskToggleComplete?: (task: Task) => void;
	isDraggable?: boolean;
	showActions?: boolean;
	emptyMessage?: string;
	boardInfo?: Board | null;
}

export function TaskSidebar({ tasks, completedTasks = [], sidebarTitle, completedTitle = 'Completed Tasks', onTaskClick, onTaskEdit, onTaskDelete, onTaskDuplicate, onTaskToggleComplete, isDraggable = true, showActions = true, emptyMessage = 'No tasks to display', boardInfo = null }: TaskSidebarProps) {
	const renderTaskCard = (task: Task, isCompleted = false) => (
		<ContextMenu key={task.id}>
			<ContextMenuTrigger asChild>
				<div
					className={cn('p-3 bg-background border border-border rounded-lg hover:shadow-sm transition-all duration-200 cursor-pointer group', isCompleted && 'opacity-70', isDraggable && !isCompleted && 'hover:border-border/80')}
					draggable={isDraggable && !isCompleted}
					onDragStart={e => {
						if (isDraggable && !isCompleted) {
							e.dataTransfer.setData('text/plain', task.id.toString());
						}
					}}
					onClick={() => onTaskClick(task)}
				>
					<div className='flex items-start justify-between'>
						<div className='flex-1 min-w-0'>
							{/* Board info if provided */}
							{boardInfo && (
								<div className='flex items-center gap-2 mb-2'>
									<div
										className='w-2 h-2 rounded-full'
										style={{ backgroundColor: boardInfo.color || '#3B82F6' }}
									/>
									<span className='text-xs text-muted-foreground font-medium truncate'>{boardInfo.name}</span>
								</div>
							)}

							{/* Title */}
							<div className='flex items-center gap-2'>
								{isCompleted && <CheckCircle className='h-4 w-4 text-green-600 flex-shrink-0' />}
								<h4 className={cn('text-sm font-medium truncate', isCompleted ? 'line-through text-muted-foreground' : 'text-card-foreground')}>{task.title}</h4>
							</div>

							{/* Description */}
							{task.description && <p className={cn('text-xs mt-1 line-clamp-2', isCompleted ? 'text-muted-foreground/60' : 'text-muted-foreground')}>{task.description}</p>}

							{/* Metadata */}
							<div className='flex items-center gap-2 mt-2 text-xs text-muted-foreground'>
								{/* Status badge */}
								<span className={cn('px-2 py-1 rounded-full text-xs font-medium', task.status === 'done' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', task.status === 'today' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', task.status === 'this-week' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', task.status === 'backlog' && 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300')}>
									{task.status.replace(/-/g, ' ')}
								</span>

								{/* Time estimate */}
								{task.timeEstimate && task.timeEstimate > 0 && (
									<span className='flex items-center gap-1'>
										<Clock className='h-3 w-3' />
										{task.timeEstimate}m
									</span>
								)}

								{/* Priority indicator */}
								{task.priority && task.priority > 2 && <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', task.priority === 4 && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', task.priority === 3 && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400')}>{task.priority === 4 ? 'Critical' : 'High'}</span>}
							</div>
						</div>

						{/* Action buttons */}
						{showActions && (
							<div className='flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
								{onTaskEdit && (
									<Button
										size='sm'
										variant='ghost'
										className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground'
										onClick={e => {
											e.stopPropagation();
											onTaskEdit(task);
										}}
									>
										<Edit className='h-3 w-3' />
									</Button>
								)}

								{onTaskToggleComplete && (
									<Button
										size='sm'
										variant='ghost'
										className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground'
										onClick={e => {
											e.stopPropagation();
											onTaskToggleComplete(task);
										}}
									>
										<CheckCircle className='h-3 w-3' />
									</Button>
								)}
							</div>
						)}
					</div>

					{/* Drag hint */}
					{isDraggable && !isCompleted && <div className='text-xs text-muted-foreground mt-2 pt-2 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity'>Drag to move or click to edit</div>}
				</div>
			</ContextMenuTrigger>

			{/* Context menu */}
			<ContextMenuContent className='w-48'>
				{onTaskEdit && (
					<ContextMenuItem onClick={() => onTaskEdit(task)}>
						<Edit className='mr-2 h-4 w-4' />
						Edit Task
					</ContextMenuItem>
				)}

				{onTaskDuplicate && (
					<ContextMenuItem onClick={() => onTaskDuplicate(task)}>
						<Copy className='mr-2 h-4 w-4' />
						Duplicate Task
					</ContextMenuItem>
				)}

				{onTaskToggleComplete && (
					<>
						<ContextMenuSeparator />
						<ContextMenuItem onClick={() => onTaskToggleComplete(task)}>
							<CheckCircle className='mr-2 h-4 w-4' />
							{task.status === 'done' ? 'Mark as Incomplete' : 'Mark as Complete'}
						</ContextMenuItem>
					</>
				)}

				{onTaskDelete && (
					<>
						<ContextMenuSeparator />
						<ContextMenuItem
							onClick={() => onTaskDelete(task.id)}
							className='text-destructive'
						>
							<Trash2 className='mr-2 h-4 w-4' />
							Delete Task
						</ContextMenuItem>
					</>
				)}
			</ContextMenuContent>
		</ContextMenu>
	);

	if (tasks.length === 0 && completedTasks.length === 0) {
		return null;
	}

	return (
		<div className='w-80 border-r border-border bg-muted/20 p-4 overflow-y-auto'>
			{/* Main tasks section */}
			{tasks.length > 0 && (
				<div className='mb-6'>
					<h3 className='text-sm font-semibold mb-3 flex items-center gap-2'>
						<Calendar className='h-4 w-4' />
						{sidebarTitle} ({tasks.length})
					</h3>
					<div className='space-y-2'>{tasks.map(task => renderTaskCard(task, false))}</div>
				</div>
			)}

			{/* Completed tasks section */}
			{completedTasks.length > 0 && (
				<div>
					<h3 className='text-sm font-semibold mb-3 flex items-center gap-2'>
						<CheckCircle className='h-4 w-4 text-green-600' />
						{completedTitle} ({completedTasks.length})
					</h3>
					<div className='space-y-2'>{completedTasks.map(task => renderTaskCard(task, true))}</div>
				</div>
			)}

			{/* Empty state */}
			{tasks.length === 0 && completedTasks.length === 0 && (
				<div className='text-center text-muted-foreground py-8'>
					<Calendar className='h-8 w-8 mx-auto mb-2 opacity-50' />
					<p className='text-sm'>{emptyMessage}</p>
				</div>
			)}
		</div>
	);
}
