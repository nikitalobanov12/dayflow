import { useState, useCallback } from 'react';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { TaskEditDialog } from '@/components/ui/task-edit-dialog';
import { Task, Board, BoardViewType, UserPreferences } from '@/types';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { GlobalSidebar } from '@/components/ui/global-sidebar';
import { UnifiedHeader } from '@/components/ui/unified-header';

interface KanbanBoardViewProps {
	board: Board;
	tasks: Task[];
	onBack: () => void;
	onSelectBoard?: (board: Board) => void;
	onMoveTask: (taskId: number, newStatus: Task['status']) => Promise<void>;
	onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
	onUpdateTask: (id: number, updates: Partial<Task>) => Promise<void>;
	onDeleteTask: (id: number) => Promise<void>;
	onDuplicateTask?: (task: Task) => Promise<void>;
	onReorderTasksInColumn: (taskIds: number[], status: Task['status']) => Promise<void>;
	onUpdateTimeEstimate: (taskId: number, timeEstimate: number) => Promise<void>;
	onStartSprint?: () => void;
	isAllTasksBoard?: boolean;
	boards?: Board[]; // Available boards for board selection
	user?: {
		id: string;
		email?: string;
		created_at?: string;
	};
	onSignOut?: () => Promise<{ error: unknown }>;
	onViewChange?: (board: Board, viewType: 'kanban' | 'calendar' | 'list') => Promise<void>;
	onOpenSettings?: () => void;
	userPreferences?: UserPreferences;
	onTaskClick?: (task: Task) => void;
}

export function KanbanBoardView({ board, tasks, onBack, onSelectBoard, onMoveTask, onAddTask, onUpdateTask, onDeleteTask, onDuplicateTask, onUpdateTimeEstimate, onStartSprint, isAllTasksBoard = false, boards = [], user, onSignOut, onViewChange, onOpenSettings, userPreferences }: KanbanBoardViewProps) {
	const [isEditingTask, setIsEditingTask] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [isCreatingDetailedTask, setIsCreatingDetailedTask] = useState(false);

	// Apply user preferences for filtering and sorting
	const { filterTasks, sortTasks } = useUserPreferences(userPreferences);
	// Memoize functions to prevent unnecessary re-renders
	const getTasksByStatus = useCallback(
		(status: Task['status']) => {
			// First filter by board if not viewing all tasks
			const boardFilteredTasks = isAllTasksBoard ? tasks : tasks.filter(task => task.boardId === board.id);

			// Then filter by status
			const statusTasks = boardFilteredTasks.filter((task: Task) => task.status === status);

			// Apply user preferences: filter out completed tasks if disabled
			const filteredTasks = filterTasks(statusTasks);

			// Apply user sorting preferences only - no position-based override
			return sortTasks(filteredTasks);
		},
		[tasks, filterTasks, sortTasks, isAllTasksBoard, board.id]
	);
	const getTotalTimeForColumn = useCallback(
		(status: Task['status']): number => {
			return getTasksByStatus(status).reduce((total, task) => total + (task.timeEstimate || 0), 0);
		},
		[getTasksByStatus]
	);
	const getTodayCompletedCount = useCallback((): number => {
		const today = new Date().toISOString().split('T')[0];
		return getTasksByStatus('done').filter(task => task.completedAt && task.completedAt.startsWith(today)).length;
	}, [getTasksByStatus]);
	const handleEditTask = (task: Task) => {
		setEditingTask(task);
		setIsEditingTask(true);
	};

	// Wrapper functions for the unified dialog
	const handleEditTaskSave = async (id: number, updates: Partial<Task>) => {
		await onUpdateTask(id, updates);
		setIsEditingTask(false);
		setEditingTask(null);
	};

	const handleEditTaskDelete = async (id: number) => {
		await onDeleteTask(id);
		setIsEditingTask(false);
		setEditingTask(null);
	};

	const handleEditTaskDuplicate = async (task: Task) => {
		if (onDuplicateTask) {
			await onDuplicateTask(task);
		}
	};
	const handleAddTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
		// Add boardId to the task if not all tasks board
		const taskWithBoard = isAllTasksBoard ? task : { ...task, boardId: board.id };
		await onAddTask(taskWithBoard);
	};

	// Handler for creating detailed task from header
	const handleCreateDetailedTaskFromHeader = () => {
		setIsCreatingDetailedTask(true);
	};

	// Handler for saving detailed task creation
	const handleCreateDetailedTaskSave = async (updates: Partial<Task>) => {
		const newTask: Omit<Task, 'id' | 'createdAt'> = {
			title: updates.title || '',
			description: updates.description || '',
			timeEstimate: updates.timeEstimate || 0,
			priority: updates.priority || 2,
			status: updates.status || 'backlog', // Default to backlog when created from header
			position: tasks.filter(t => t.status === (updates.status || 'backlog')).length,
			boardId: isAllTasksBoard ? updates.boardId : board.id,
			progressPercentage: updates.progressPercentage || 0,
			timeSpent: updates.timeSpent || 0,
			labels: updates.labels || [],
			attachments: updates.attachments || [],
			category: updates.category || '',
			scheduledDate: updates.scheduledDate,
			startDate: updates.startDate,
			dueDate: updates.dueDate,
			recurring: updates.recurring,
		};

		await onAddTask(newTask);
		setIsCreatingDetailedTask(false);
	};

	// Helper function to get board information by ID
	const getBoardInfo = (boardId: number): Board | null => {
		if (!isAllTasksBoard || !boards) return null;
		return boards.find(b => b.id === boardId) || null;
	};

	return (
		<SidebarProvider>
			<div className='h-screen bg-background flex w-full'>
				<GlobalSidebar
					boards={boards}
					currentBoard={board}
					currentView="kanban"
					tasks={tasks}
					userPreferences={userPreferences}
					onSelectBoard={selectedBoard => {
						// Use the proper board selection handler if available, otherwise fallback to onBack
						if (onSelectBoard) {
							onSelectBoard(selectedBoard);
						} else {
							onBack();
						}
					}}
					onSelectBoardView={(selectedBoard: Board, view: BoardViewType) => {
						if (onViewChange) {
							onViewChange(selectedBoard, view);
						} else if (onSelectBoard) {
							onSelectBoard(selectedBoard);
						} else {
							onBack();
						}
					}}
					onCreateTask={(selectedBoard: Board) => {
						// Set the board context and trigger task creation
						if (selectedBoard.id !== board.id && onSelectBoard) {
							onSelectBoard(selectedBoard);
						}
						// Trigger task creation
						setIsCreatingDetailedTask(true);
					}}
					onNavigateToBoards={() => {
						// Navigate back to board selection
						onBack();
					}}
					onTaskClick={(task: Task) => {
						// Open the task for editing when clicked from upcoming preview
						handleEditTask(task);
					}}
				/>
				<SidebarInset>
					<UnifiedHeader
						title={board.name}
						subtitle={board.description}
						board={board}
						currentView='kanban'
						tasks={tasks}
						boards={boards}
						userPreferences={userPreferences}
						onViewChange={onViewChange}
						onCreateDetailedTask={handleCreateDetailedTaskFromHeader}
						user={user}
						onSignOut={onSignOut}
						onOpenSettings={onOpenSettings}
					/>
					{/* Kanban Board */}
					<div className='flex-1 flex flex-col min-h-0'>
						<div className='flex-1 overflow-x-auto overflow-y-hidden kanban-scroll-container'>
							<div className='flex justify-center gap-8 p-4 min-w-fit h-full'>
								<KanbanColumn
									title='Backlog'
									status='backlog'
									tasks={getTasksByStatus('backlog')}
									onMoveTask={onMoveTask}
									onEditTask={handleEditTask}
									onAddTask={handleAddTask}
									onUpdateTimeEstimate={onUpdateTimeEstimate}
									onDuplicateTask={onDuplicateTask}
									onDeleteTask={onDeleteTask}
									onUpdateTask={onUpdateTask}
									showAddButton={true}
									showProgress={false}
									totalTimeEstimate={getTotalTimeForColumn('backlog')}
									isAllTasksBoard={isAllTasksBoard}
									boards={boards}
									getBoardInfo={getBoardInfo}
									currentBoard={board}
									userPreferences={userPreferences}
								/>
								<KanbanColumn
									title='This Week'
									status='this-week'
									tasks={getTasksByStatus('this-week')}
									onMoveTask={onMoveTask}
									onEditTask={handleEditTask}
									onAddTask={handleAddTask}
									onUpdateTimeEstimate={onUpdateTimeEstimate}
									onDuplicateTask={onDuplicateTask}
									onDeleteTask={onDeleteTask}
									onUpdateTask={onUpdateTask}
									showAddButton={true}
									showProgress={false}
									totalTimeEstimate={getTotalTimeForColumn('this-week')}
									isAllTasksBoard={isAllTasksBoard}
									boards={boards}
									getBoardInfo={getBoardInfo}
									currentBoard={board}
									userPreferences={userPreferences}
								/>
								<KanbanColumn
									title='Today'
									status='today'
									tasks={getTasksByStatus('today')}
									onMoveTask={onMoveTask}
									onEditTask={handleEditTask}
									onAddTask={handleAddTask}
									onUpdateTimeEstimate={onUpdateTimeEstimate}
									onDuplicateTask={onDuplicateTask}
									onDeleteTask={onDeleteTask}
									onUpdateTask={onUpdateTask}
									showAddButton={true}
									showProgress={true}
									completedCount={getTodayCompletedCount()}
									totalTimeEstimate={getTotalTimeForColumn('today')}
									onStartSprint={onStartSprint}
									isAllTasksBoard={isAllTasksBoard}
									boards={boards}
									getBoardInfo={getBoardInfo}
									currentBoard={board}
									userPreferences={userPreferences}
								/>
								<KanbanColumn
									title='Done'
									status='done'
									tasks={getTasksByStatus('done')}
									onMoveTask={onMoveTask}
									onEditTask={handleEditTask}
									onAddTask={handleAddTask}
									onUpdateTimeEstimate={onUpdateTimeEstimate}
									onDuplicateTask={onDuplicateTask}
									onDeleteTask={onDeleteTask}
									onUpdateTask={onUpdateTask}
									showAddButton={false}
									showProgress={false}
									isAllTasksBoard={isAllTasksBoard}
									boards={boards}
									getBoardInfo={getBoardInfo}
									currentBoard={board}
									userPreferences={userPreferences}
								/>
							</div>
						</div>
					</div>
				</SidebarInset>
			</div>

			{/* Edit Task Dialog */}
			<TaskEditDialog
				task={editingTask}
				isOpen={isEditingTask}
				onClose={() => setIsEditingTask(false)}
				onSave={handleEditTaskSave}
				onDelete={handleEditTaskDelete}
				onDuplicate={onDuplicateTask ? handleEditTaskDuplicate : undefined}
				isAllTasksBoard={isAllTasksBoard}
				boards={boards}
				userPreferences={userPreferences}
			/>

			{/* Create Detailed Task Dialog */}
			<TaskEditDialog
				task={null}
				isOpen={isCreatingDetailedTask}
				onClose={() => setIsCreatingDetailedTask(false)}
				onCreate={handleCreateDetailedTaskSave}
				onDelete={async () => {}} // Not needed for creation
				isAllTasksBoard={isAllTasksBoard}
				boards={boards}
				isCreating={true}
				userPreferences={userPreferences}
			/>
		</SidebarProvider>
	);
}
