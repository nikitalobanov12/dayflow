import React, { useState } from 'react';
import { Task, Board, UserPreferences } from '@/types';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isTauri } from '@/lib/platform';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
	title: string;
	status: Task['status'];
	tasks: Task[];
	onMoveTask: (taskId: number, newStatus: Task['status']) => void;
	onEditTask?: (task: Task) => void;
	onAddTask?: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
	onUpdateTimeEstimate?: (taskId: number, timeEstimate: number) => void;
	onDuplicateTask?: (task: Task) => Promise<void>;
	onDeleteTask?: (taskId: number) => Promise<void>;
	onUpdateTask?: (id: number, updates: Partial<Task>) => Promise<void>; // Add this for granular updates
	showAddButton?: boolean;
	showProgress?: boolean;
	completedCount?: number; // For progress calculation
	totalTimeEstimate?: number; // Total time in minutes for cumulative display
	onStartSprint?: () => void; // For sprint functionality
	isAllTasksBoard?: boolean; // Whether this is the "All Tasks" board
	boards?: Board[]; // Available boards for board selection
	getBoardInfo?: (boardId: number) => Board | null; // Function to get board info
	currentBoard?: Board; // Current board information to display when task has no specific board
	userPreferences?: UserPreferences; // User preferences for date formatting
}

export function KanbanColumn({ title, status, tasks, onMoveTask, onEditTask, onAddTask, onUpdateTimeEstimate, onDuplicateTask, onDeleteTask, onUpdateTask, showAddButton = true, showProgress = false, completedCount = 0, totalTimeEstimate = 0, onStartSprint, isAllTasksBoard = false, boards = [], getBoardInfo, currentBoard, userPreferences }: KanbanColumnProps) {
	const [isAdding, setIsAdding] = useState(false);
	const [newTaskTitle, setNewTaskTitle] = useState('');
	const [newTaskTime, setNewTaskTime] = useState('');
	const [newTaskBoardId, setNewTaskBoardId] = useState<number | null>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	// Apply user preferences for date formatting
	const { formatDate } = useUserPreferences(userPreferences);

	// Reset drag state when drag ends anywhere on the page
	useEffect(() => {
		const handleGlobalDragEnd = () => {
			setIsDragOver(false);
		};

		// Listen for drag end events globally
		document.addEventListener('dragend', handleGlobalDragEnd);
		return () => {
			document.removeEventListener('dragend', handleGlobalDragEnd);
		};
	}, []);

	// Calculate progress percentage
	const progressPercentage = showProgress && status === 'today' ? (completedCount / (tasks.length + completedCount)) * 100 || 0 : showProgress && tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
	// Utility function to format minutes as HH:MM
	const formatTime = (minutes: number): string => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 100) return '100+ Hr';
		return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
	};

	const groupTasksByCompletionDate = (tasks: Task[]) => {
		const grouped: { [date: string]: Task[] } = {};

		tasks.forEach(task => {
			if (task.completedAt) {
				const completionDate = new Date(task.completedAt).toDateString();
				if (!grouped[completionDate]) {
					grouped[completionDate] = [];
				}
				grouped[completionDate].push(task);
			} else {
				if (!grouped['Unknown']) {
					grouped['Unknown'] = [];
				}
				grouped['Unknown'].push(task);
			}
		});

		const sortedEntries = Object.entries(grouped).sort(([dateA], [dateB]) => {
			if (dateA === 'Unknown') return 1;
			if (dateB === 'Unknown') return -1;
			return new Date(dateB).getTime() - new Date(dateA).getTime();
		});

		return sortedEntries;
	};
	const formatDateLabel = (dateString: string): string => {
		if (dateString === 'Unknown') return 'Unknown Date';

		const date = new Date(dateString);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return 'Today';
		} else if (date.toDateString() === yesterday.toDateString()) {
			return 'Yesterday';
		} else {
			// Use user's date format preference for older dates
			return formatDate(dateString);
		}
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
				status,
				position: tasks.length, // Add to end of current column
				boardId: isAllTasksBoard ? newTaskBoardId || undefined : undefined, // Add board selection for All Tasks board
				// Add required new properties with default values
				priority: 2, // Medium priority
				progressPercentage: 0,
				timeSpent: 0,
				labels: [],
				attachments: [],
			});
			setNewTaskTitle('');
			setNewTaskTime('');
			setNewTaskBoardId(null); // Reset board selection
			// Don't close the form - keep isAdding true for easier multiple task creation
		} catch (error) {
			console.error('Failed to add task:', error);
		}
	};

	// Handle task drop
	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		
		const taskId = e.dataTransfer.getData('text/plain');
		if (taskId) {
			const taskIdNum = parseInt(taskId);
			await onMoveTask(taskIdNum, status);
		}
	};

	// Handle drag over
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setIsDragOver(true);
	};

	// Handle drag leave - simplified and more reliable
	const handleDragLeave = (e: React.DragEvent) => {
		// Check if we're leaving the column container by examining the related target
		const relatedTarget = e.relatedTarget as Element;
		const currentTarget = e.currentTarget as Element;
		
		// If the related target is not a child of the current target, we're leaving the column
		if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
			setIsDragOver(false);
		}
	};

	return (
		<div
			className={cn(
				'flex-none rounded-lg w-80 bg-card border border-border shadow-sm hover:shadow-md transition-all duration-300 flex flex-col backdrop-blur-sm',
				isDragOver && 'border-primary/50 bg-primary/5 shadow-lg'
			)}
			style={{ height: 'calc(100vh - 120px)' }}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
		>
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
							title='Quick add task'
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
						/>
						{/* Board selection for All Tasks board */}
						{isAllTasksBoard && boards.length > 0 && (
							<Select
								value={newTaskBoardId?.toString() || ''}
								onValueChange={value => setNewTaskBoardId(value ? parseInt(value) : null)}
							>
								<SelectTrigger className='text-sm'>
									<SelectValue placeholder='Select board (optional)' />
								</SelectTrigger>
								<SelectContent>
									{boards
										.filter(board => !board.isDefault)
										.map(board => (
											<SelectItem
												key={board.id}
												value={board.id.toString()}
											>
												<div className='flex items-center gap-2'>
													<div
														className='w-3 h-3 rounded-full'
														style={{ backgroundColor: board.color || '#3B82F6' }}
													/>
													{board.name}
												</div>
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						)}{' '}
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
									setNewTaskBoardId(null);
								}}
							>
								Done
							</Button>
						</div>
					</div>
				)}
			</div>{' '}
			<div className={cn(
				'flex-1 overflow-y-auto kanban-scroll-container p-3 space-y-3 transition-all duration-300 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent',
				isDragOver && 'bg-primary/5'
			)}>
				{status === 'done' ? (
					// Grouped view for done tasks
					<div className='space-y-4'>
						{groupTasksByCompletionDate(tasks).map(([date, dateTasks]) => (
							<div
								key={date}
								className='space-y-2'
							>
								<div className='flex items-center gap-2'>
									<h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>{formatDateLabel(date)}</h4>
									<div className='flex-1 h-px bg-border/30'></div>
									<span className='text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full'>{dateTasks.length}</span>
								</div>{' '}
								<div className='space-y-3'>
									{' '}
									{dateTasks.map(task => (
										<TaskCard
											key={task.id}
											task={task}
											onMove={onMoveTask}
											onEdit={onEditTask}
											onUpdateTimeEstimate={onUpdateTimeEstimate}
											onDuplicate={onDuplicateTask}
											onDelete={onDeleteTask}
											onUpdateTask={onUpdateTask}
											isDone={task.status === 'done'}
											userPreferences={userPreferences}
											boardInfo={(() => {
												// For All Tasks view, try to get task's specific board, otherwise use current board
												if (isAllTasksBoard && getBoardInfo && task.boardId) {
													const taskBoard = getBoardInfo(task.boardId);
													if (taskBoard) return taskBoard;
												}
												// For regular board views or as fallback, always use current board
												return currentBoard;
											})()}
										/>
									))}
								</div>
							</div>
						))}
					</div> // Regular view for other columns
				) : (
					<div className='space-y-3'>
						{/* Drag indicator when dragging over column with tasks */}
						{isDragOver && tasks.length > 0 && (
							<div className='h-2 bg-primary/20 border-2 border-dashed border-primary/50 rounded-lg mx-1 transition-all duration-200'>
								<div className='h-full bg-primary/10 rounded'></div>
							</div>
						)}
						
						{tasks.map(task => (
							<TaskCard
								key={task.id}
								task={task}
								onMove={onMoveTask}
								onEdit={onEditTask}
								onUpdateTimeEstimate={onUpdateTimeEstimate}
								onDuplicate={onDuplicateTask}
								onDelete={onDeleteTask}
								onUpdateTask={onUpdateTask}
								isDone={task.status === 'done'}
								userPreferences={userPreferences}
								boardInfo={(() => {
									// For All Tasks view, try to get task's specific board, otherwise use current board
									if (isAllTasksBoard && getBoardInfo && task.boardId) {
										const taskBoard = getBoardInfo(task.boardId);
										if (taskBoard) return taskBoard;
									}
									// For regular board views or as fallback, always use current board
									return currentBoard;
								})()}
							/>
						))}
					</div>
				)}
				{tasks.length === 0 && (
					<div className={cn(
						'text-center text-muted-foreground py-8 border-2 border-dashed border-border/30 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors duration-300',
						isDragOver && 'border-primary/50 bg-primary/10 text-primary'
					)}>
						<p className='text-sm font-medium'>
							{isDragOver ? 'Drop task here' : 'No tasks'}
						</p>
						<p className='text-xs mt-1 opacity-70'>
							{isDragOver ? `Move to ${title}` : 'Drag tasks here or add new ones'}
						</p>
					</div>
				)}{' '}
				{/* Sprint button - only show on desktop (Tauri) app */}
				{status === 'today' && tasks.length > 0 && onStartSprint && isTauri() && (
					<div className='pt-2 border-t border-border/30 mt-4'>
						<Button
							onClick={onStartSprint}
							className='w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all duration-200'
							size='sm'
						>
							Start Sprint
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
