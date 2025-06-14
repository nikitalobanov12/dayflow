import { useState, useMemo } from 'react';
import { Task, Board, UserPreferences } from '@/types';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { TaskEditDialog } from '@/components/ui/task-edit-dialog';
import { TaskListItem } from '@/components/list/TaskListItem';

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

export function CompactListView({ 
	board, 
	tasks, 
	onUpdateTask, 
	onDeleteTask, 
	onDuplicateTask, 
	onMoveTask,
	onUpdateTimeEstimate,
	isAllTasksBoard = false, 
	boards, 
	userPreferences 
}: CompactListViewProps) {
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

	const handleEditTask = (task: Task) => {
		setEditingTask(task);
		setIsEditingTask(true);
	};

	const handleDeleteTask = async (taskId: number) => {
		await onDeleteTask(taskId);
		setIsEditingTask(false);
		setEditingTask(null);
	};

	const handleToggleComplete = async (task: Task) => {
		const newStatus = task.status === 'done' ? 'today' : 'done';
		const completedAt = newStatus === 'done' ? new Date().toISOString() : undefined;
		await onUpdateTask(task.id, { status: newStatus, completedAt });
	};

	const handleMoveTask = async (taskId: number, newStatus: Task['status']) => {
		await onMoveTask(taskId, newStatus);
	};

	return (
		<div className='flex flex-col h-full bg-muted/40'>
			<div className='flex-1 overflow-y-auto p-4'>
				{/* Today Section */}
				{groupedTasks.today.length > 0 && (
					<div className='mb-6'>
						<h3 className='text-lg font-semibold mb-3 text-foreground border-b border-border pb-2'>Today ({groupedTasks.today.length})</h3>
						<div className='space-y-3'>
							{groupedTasks.today.map(task => (
								<TaskListItem
									key={task.id}
									task={task}
									onToggleComplete={() => handleToggleComplete(task)}
									onEditTask={() => handleEditTask(task)}
									onMoveTask={handleMoveTask}
									onUpdateTask={onUpdateTask}
									onUpdateTimeEstimate={onUpdateTimeEstimate}
									onDuplicateTask={onDuplicateTask}
									onDeleteTask={handleDeleteTask}
									boardInfo={isAllTasksBoard ? boards?.find(b => b.id === task.boardId) : board}
									userPreferences={userPreferences}
								/>
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
								<TaskListItem
									key={task.id}
									task={task}
									onToggleComplete={() => handleToggleComplete(task)}
									onEditTask={() => handleEditTask(task)}
									onMoveTask={handleMoveTask}
									onUpdateTask={onUpdateTask}
									onUpdateTimeEstimate={onUpdateTimeEstimate}
									onDuplicateTask={onDuplicateTask}
									onDeleteTask={handleDeleteTask}
									boardInfo={isAllTasksBoard ? boards?.find(b => b.id === task.boardId) : board}
									userPreferences={userPreferences}
								/>
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
								<TaskListItem
									key={task.id}
									task={task}
									onToggleComplete={() => handleToggleComplete(task)}
									onEditTask={() => handleEditTask(task)}
									onMoveTask={handleMoveTask}
									onUpdateTask={onUpdateTask}
									onUpdateTimeEstimate={onUpdateTimeEstimate}
									onDuplicateTask={onDuplicateTask}
									onDeleteTask={handleDeleteTask}
									boardInfo={isAllTasksBoard ? boards?.find(b => b.id === task.boardId) : board}
									userPreferences={userPreferences}
								/>
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
								<TaskListItem
									key={task.id}
									task={task}
									onToggleComplete={() => handleToggleComplete(task)}
									onEditTask={() => handleEditTask(task)}
									onMoveTask={handleMoveTask}
									onUpdateTask={onUpdateTask}
									onUpdateTimeEstimate={onUpdateTimeEstimate}
									onDuplicateTask={onDuplicateTask}
									onDeleteTask={handleDeleteTask}
									boardInfo={isAllTasksBoard ? boards?.find(b => b.id === task.boardId) : board}
									userPreferences={userPreferences}
									isDone={true}
								/>
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
			{isEditingTask && (
				<TaskEditDialog
					task={editingTask || null}
					isOpen={isEditingTask}
					onClose={() => {
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
					// Always pass onDelete handler (required by TaskEditDialogProps)
					onDelete={async (id: number) => {
						await handleDeleteTask(id);
					}}
					isAllTasksBoard={isAllTasksBoard}
					boards={boards || []}
					isCreating={false}
					userPreferences={userPreferences}
				/>
			)}
		</div>
	);
}
