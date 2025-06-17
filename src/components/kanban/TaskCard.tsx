import { Task, Board } from '@/types';
import { Button } from '@/components/ui/button';
import { TaskContextMenu } from '@/components/task/TaskContextMenu';
import { TaskDisplay } from '@/components/task/TaskDisplay';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Edit, Check } from 'lucide-react';
import { useState } from 'react';
import { SubtasksContainer } from '@/components/subtasks/SubtasksContainer';

interface TaskCardProps {
	task: Task;
	onMove: (taskId: number, status: Task['status']) => void;
	onEdit?: (task: Task) => void;
	onUpdateTimeEstimate?: (taskId: number, timeEstimate: number) => void;
	onDuplicate?: (task: Task) => void;
	onDelete?: (taskId: number) => void;
	isDone?: boolean;
	boardInfo?: Board | null;
	userPreferences?: any;
	onUpdateTask?: (id: number, updates: Partial<Task>) => Promise<void>;
}

export function TaskCard({ 
	task, 
	onMove, 
	onEdit, 
	onUpdateTimeEstimate, 
	onDuplicate, 
	onDelete, 
	isDone = false, 
	boardInfo = null, 
	userPreferences, 
	onUpdateTask 
}: TaskCardProps) {
	const [isEditingTime, setIsEditingTime] = useState(false);
	const [tempTimeEstimate, setTempTimeEstimate] = useState(task.timeEstimate.toString());
	const [isDragging, setIsDragging] = useState(false);

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
			onMove(task.id, 'today');
		} else {
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

	// Convert onMove to the format expected by TaskContextMenu
	const handleMoveTask = async (taskId: number, newStatus: Task['status']) => {
		onMove(taskId, newStatus);
	};

	const handleToggleCompleteForMenu = (taskId: number) => {
		if (task.status === 'done') {
			onMove(taskId, 'today');
		} else {
			onMove(taskId, 'done');
		}
	};

	return (
		<TaskContextMenu
			task={task}
			onEdit={onEdit || (() => {})}
			onDuplicate={onDuplicate}
			onDelete={onDelete}
			onUpdateTask={onUpdateTask}
			onMoveTask={handleMoveTask}
			onUpdateTimeEstimate={onUpdateTimeEstimate}
			onToggleComplete={handleToggleCompleteForMenu}
			boardInfo={boardInfo}
			userPreferences={userPreferences}
		>
			<div
				className='transition-all duration-200 group'
				onClick={() => onEdit?.(task)}
				draggable={!isDone}
				onDragStart={e => {
					if (!isDone) {
						e.dataTransfer.setData('text/plain', task.id.toString());
						e.dataTransfer.effectAllowed = 'move';
						setIsDragging(true);
					}
				}}
				onDragEnd={() => setIsDragging(false)}
			>
				<div className={cn(
					'bg-background border border-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300',
					isDone ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
					'hover:border-border/80 hover:-translate-y-0.5',
					isDone && 'opacity-70 saturate-50',
					isDragging && 'opacity-50 scale-95 rotate-2 cursor-grabbing'
				)}>
					<div className='relative p-3'>
						{/* Top Row: Board/List Information */}
						{boardInfo && (
							<div className='flex items-center gap-2 mb-2'>
								<TaskDisplay
									task={task}
									boardInfo={boardInfo}
									userPreferences={userPreferences}
									showBoardInfo={true}
									showTitle={false}
									showDescription={false}
									showDates={false}
									showRecurring={false}
									className="flex-1"
								/>

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
							</div>
						)}

						{/* Task Content */}
						<div className='mb-3'>
							<TaskDisplay
								task={task}
								boardInfo={null}
								userPreferences={userPreferences}
								showBoardInfo={false}
								showTitle={true}
								showDescription={true}
								showDates={true}
								showRecurring={true}
							/>
						</div>

						{/* Bottom Row: Time estimate + Checkbox + Edit button */}
						<div className='flex items-center justify-between'>
							<div className='flex items-center gap-2'>
								{/* Time estimate */}
								{isEditingTime ? (
									<input
										placeholder='--'
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
									<Edit className='h-3 w-3' />
								</Button>
							</div>
						</div>

						{/* Subtasks List */}
						<SubtasksContainer taskId={task.id} />
						
						{/* Drag hint - only show when not dragging and not completed */}
						{!isDragging && !isDone && (
							<div className='text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
								Drag to move or click to edit
							</div>
						)}
					</div>
				</div>
			</div>
		</TaskContextMenu>
	);
}
