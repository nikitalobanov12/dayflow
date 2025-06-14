import { useState, useMemo } from 'react';
import { Task, Board, UserPreferences } from '@/types';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit2, Trash2, Copy, CheckCircle, Circle } from 'lucide-react';
import { TaskEditDialog } from '@/components/ui/task-edit-dialog';
import { TaskListItem } from '@/components/list/TaskListItem';
// Use context menu primitives
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu';

interface CompactListViewProps {
	board: Board;
	tasks: Task[];
	onMoveTask: (taskId: number, newStatus: Task['status']) => Promise<void>;
	onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
	onUpdateTask: (id: number, updates: Partial<Task>) => Promise<void>;
	onDeleteTask: (id: number) => Promise<void>;
	onDuplicateTask?: (task: Task) => Promise<void>;
	onUpdateTimeEstimate: (taskId: number, timeEstimate: number) => Promise<void>;
	isAllTasksBoard?: boolean;
	boards?: Board[]; // For board selection in task creation/editing if isAllTasksBoard
	userPreferences?: UserPreferences;
	// Add any other props passed from ListView that CompactListView might need
	// Navigation and user session props
	onBack?: () => void;
	onSelectBoard?: (board: Board) => void;
	user?: any;
	onSignOut?: () => Promise<{ error: any }>;
	onOpenSettings?: () => void;
}

export function CompactListView({ board, tasks, onAddTask, onUpdateTask, onDeleteTask, onDuplicateTask, isAllTasksBoard = false, boards, userPreferences }: CompactListViewProps) {
	const [isCreatingTask, setIsCreatingTask] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [isEditingTask, setIsEditingTask] = useState(false);

	const { filterTasks, sortTasks } = useUserPreferences(userPreferences);
	const displayedTasks = useMemo(() => {
		const boardFilteredTasks = isAllTasksBoard ? tasks : tasks.filter(task => task.boardId === board.id);

		const filtered = filterTasks(boardFilteredTasks);
		return sortTasks(filtered);
	}, [tasks, filterTasks, sortTasks, isAllTasksBoard, board.id]);

	// Group tasks by status for organized display
	const groupedTasks = useMemo(() => {
		return {
			today: displayedTasks.filter(task => task.status === 'today'),
			thisWeek: displayedTasks.filter(task => task.status === 'this-week'),
			backlog: displayedTasks.filter(task => task.status === 'backlog'),
			done: displayedTasks.filter(task => task.status === 'done'),
		};
	}, [displayedTasks]);

	const handleCreateTask = () => {
		setIsCreatingTask(true);
	};

	const handleEditTask = (task: Task) => {
		setEditingTask(task);
		setIsEditingTask(true);
	};

	// Remove handleSaveTask, directly use onUpdateTask / onAddTask in dialog callbacks

	const handleDeleteTask = async (taskId: number) => {
		await onDeleteTask(taskId);
		setIsEditingTask(false);
		setEditingTask(null);
	};

	const handleDuplicateTask = async (task: Task) => {
		if (onDuplicateTask) {
			await onDuplicateTask(task);
		}
	};

	const handleToggleComplete = async (task: Task) => {
		const newStatus = task.status === 'done' ? 'today' : 'done';
		const completedAt = newStatus === 'done' ? new Date().toISOString() : undefined;
		// Optimistically update UI for status change before calling onUpdateTask
		// This might involve updating local state if `tasks` prop isn't immediately reactive
		await onUpdateTask(task.id, { status: newStatus, completedAt });
	};

	// Remove activeDialogTask

	return (
		<div className='flex flex-col h-full bg-muted/40'>
			{/* Header: Board name and Add Task */}
			<div className='p-4 border-b border-border flex justify-between items-center'>
				<h2 className='text-lg font-bold'>{isAllTasksBoard ? 'All Tasks - List View' : `${board.name} - List View`}</h2>
				<Button
					onClick={handleCreateTask}
					size='sm'
				>
					<PlusCircle className='mr-2 h-4 w-4' /> Add Task
				</Button>
			</div>{' '}
			<div className='flex-1 overflow-y-auto p-4'>
				{/* Today Section */}
				{groupedTasks.today.length > 0 && (
					<div className='mb-6'>
						<h3 className='text-lg font-semibold mb-3 text-foreground border-b border-border pb-2'>Today ({groupedTasks.today.length})</h3>
						<div className='space-y-3'>
							{groupedTasks.today.map(task => (
								<ContextMenu key={task.id}>
									<ContextMenuTrigger>
										<TaskListItem
											task={task}
											onToggleComplete={() => handleToggleComplete(task)}
											onEditTask={() => handleEditTask(task)}
										/>
									</ContextMenuTrigger>
									<ContextMenuContent>
										<ContextMenuItem onClick={() => handleEditTask(task)}>
											<Edit2 className='mr-2 h-4 w-4' /> Edit
										</ContextMenuItem>
										<ContextMenuItem onClick={() => handleToggleComplete(task)}>
											{task.status === 'done' ? <Circle className='mr-2 h-4 w-4' /> : <CheckCircle className='mr-2 h-4 w-4' />}
											{task.status === 'done' ? 'Mark Incomplete' : 'Mark Complete'}
										</ContextMenuItem>
										{onDuplicateTask && (
											<ContextMenuItem onClick={() => handleDuplicateTask(task)}>
												<Copy className='mr-2 h-4 w-4' /> Duplicate
											</ContextMenuItem>
										)}
										<ContextMenuItem
											onClick={() => handleDeleteTask(task.id)}
											className='text-red-600'
										>
											<Trash2 className='mr-2 h-4 w-4' /> Delete
										</ContextMenuItem>
									</ContextMenuContent>
								</ContextMenu>
							))}
						</div>
					</div>
				)}

				{/* This Week Section */}
				{groupedTasks.thisWeek.length > 0 && (
					<div className='mb-6'>
						<h3 className='text-lg font-semibold mb-3 text-foreground border-b border-border pb-2'>This Week ({groupedTasks.thisWeek.length})</h3>
						<div className='space-y-3'>
							{groupedTasks.thisWeek.map(task => (
								<ContextMenu key={task.id}>
									<ContextMenuTrigger>
										<TaskListItem
											task={task}
											onToggleComplete={() => handleToggleComplete(task)}
											onEditTask={() => handleEditTask(task)}
										/>
									</ContextMenuTrigger>
									<ContextMenuContent>
										<ContextMenuItem onClick={() => handleEditTask(task)}>
											<Edit2 className='mr-2 h-4 w-4' /> Edit
										</ContextMenuItem>
										<ContextMenuItem onClick={() => handleToggleComplete(task)}>
											{task.status === 'done' ? <Circle className='mr-2 h-4 w-4' /> : <CheckCircle className='mr-2 h-4 w-4' />}
											{task.status === 'done' ? 'Mark Incomplete' : 'Mark Complete'}
										</ContextMenuItem>
										{onDuplicateTask && (
											<ContextMenuItem onClick={() => handleDuplicateTask(task)}>
												<Copy className='mr-2 h-4 w-4' /> Duplicate
											</ContextMenuItem>
										)}
										<ContextMenuItem
											onClick={() => handleDeleteTask(task.id)}
											className='text-red-600'
										>
											<Trash2 className='mr-2 h-4 w-4' /> Delete
										</ContextMenuItem>
									</ContextMenuContent>
								</ContextMenu>
							))}
						</div>
					</div>
				)}

				{/* Backlog Section */}
				{groupedTasks.backlog.length > 0 && (
					<div className='mb-6'>
						<h3 className='text-lg font-semibold mb-3 text-foreground border-b border-border pb-2'>Backlog ({groupedTasks.backlog.length})</h3>
						<div className='space-y-3'>
							{groupedTasks.backlog.map(task => (
								<ContextMenu key={task.id}>
									<ContextMenuTrigger>
										<TaskListItem
											task={task}
											onToggleComplete={() => handleToggleComplete(task)}
											onEditTask={() => handleEditTask(task)}
										/>
									</ContextMenuTrigger>
									<ContextMenuContent>
										<ContextMenuItem onClick={() => handleEditTask(task)}>
											<Edit2 className='mr-2 h-4 w-4' /> Edit
										</ContextMenuItem>
										<ContextMenuItem onClick={() => handleToggleComplete(task)}>
											{task.status === 'done' ? <Circle className='mr-2 h-4 w-4' /> : <CheckCircle className='mr-2 h-4 w-4' />}
											{task.status === 'done' ? 'Mark Incomplete' : 'Mark Complete'}
										</ContextMenuItem>
										{onDuplicateTask && (
											<ContextMenuItem onClick={() => handleDuplicateTask(task)}>
												<Copy className='mr-2 h-4 w-4' /> Duplicate
											</ContextMenuItem>
										)}
										<ContextMenuItem
											onClick={() => handleDeleteTask(task.id)}
											className='text-red-600'
										>
											<Trash2 className='mr-2 h-4 w-4' /> Delete
										</ContextMenuItem>
									</ContextMenuContent>
								</ContextMenu>
							))}
						</div>
					</div>
				)}

				{/* Done Section */}
				{groupedTasks.done.length > 0 && (
					<div className='mb-6'>
						<h3 className='text-lg font-semibold mb-3 text-foreground border-b border-border pb-2'>Done ({groupedTasks.done.length})</h3>
						<div className='space-y-3'>
							{groupedTasks.done.map(task => (
								<ContextMenu key={task.id}>
									<ContextMenuTrigger>
										<TaskListItem
											task={task}
											onToggleComplete={() => handleToggleComplete(task)}
											onEditTask={() => handleEditTask(task)}
										/>
									</ContextMenuTrigger>
									<ContextMenuContent>
										<ContextMenuItem onClick={() => handleEditTask(task)}>
											<Edit2 className='mr-2 h-4 w-4' /> Edit
										</ContextMenuItem>
										<ContextMenuItem onClick={() => handleToggleComplete(task)}>
											{task.status === 'done' ? <Circle className='mr-2 h-4 w-4' /> : <CheckCircle className='mr-2 h-4 w-4' />}
											{task.status === 'done' ? 'Mark Incomplete' : 'Mark Complete'}
										</ContextMenuItem>
										{onDuplicateTask && (
											<ContextMenuItem onClick={() => handleDuplicateTask(task)}>
												<Copy className='mr-2 h-4 w-4' /> Duplicate
											</ContextMenuItem>
										)}
										<ContextMenuItem
											onClick={() => handleDeleteTask(task.id)}
											className='text-red-600'
										>
											<Trash2 className='mr-2 h-4 w-4' /> Delete
										</ContextMenuItem>
									</ContextMenuContent>
								</ContextMenu>
							))}
						</div>
					</div>
				)}

				{/* Empty state when no tasks */}
				{displayedTasks.length === 0 && (
					<div className='text-center text-muted-foreground py-8'>
						<p>No tasks in this list. Add some!</p>
					</div>
				)}
			</div>
			{(isCreatingTask || isEditingTask) && (
				<TaskEditDialog
					task={editingTask || null}
					isOpen={isCreatingTask || isEditingTask}
					onClose={() => {
						setIsCreatingTask(false);
						setIsEditingTask(false);
						setEditingTask(null);
					}}
					onSave={
						editingTask
							? async (id, updates) => {
									await onUpdateTask(id, updates);
							  }
							: undefined
					}
					onCreate={
						isCreatingTask
							? async updates => {
									await onAddTask({
										title: updates.title || '',
										description: updates.description || '',
										timeEstimate: updates.timeEstimate || 0,
										priority: updates.priority || 2,
										status: updates.status || 'backlog',
										position: groupedTasks.backlog.length, // Use backlog length for default positioning
										boardId: isAllTasksBoard ? updates.boardId : board.id,
										progressPercentage: updates.progressPercentage || 0,
										timeSpent: updates.timeSpent || 0,
										labels: updates.labels || [],
										attachments: updates.attachments || [],
									});
							  }
							: undefined
					}
					// Always pass onDelete handler (required by TaskEditDialogProps)
					onDelete={async (id: number) => {
						await handleDeleteTask(id);
					}}
					isAllTasksBoard={isAllTasksBoard}
					boards={boards || []}
					isCreating={isCreatingTask}
					userPreferences={userPreferences}
				/>
			)}
		</div>
	);
}
