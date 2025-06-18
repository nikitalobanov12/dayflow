import { CompactListView } from './CompactListView'; // Ensure file exists
import { Task, Board, UserPreferences, BoardViewType } from '@/types';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { GlobalSidebar } from '@/components/ui/global-sidebar';
import { UnifiedHeader } from '@/components/ui/unified-header';
import { TaskEditDialog } from '@/components/ui/task-edit-dialog';
import { useState } from 'react';

interface ListViewProps {
	board: Board;
	tasks: Task[];
	onBack: () => void;
	onSelectBoard?: (board: Board) => void;
	onMoveTask: (taskId: number, newStatus: Task['status']) => Promise<void>;
	onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
	onUpdateTask: (id: number, updates: Partial<Task>) => Promise<void>;
	onDeleteTask: (id: number) => Promise<void>;
	onDuplicateTask?: (task: Task) => Promise<void>;
	onUpdateTimeEstimate: (taskId: number, timeEstimate: number) => Promise<void>;
	isAllTasksBoard?: boolean;
	boards?: Board[];
	user?: any; // Consider using a more specific type for user
	onSignOut?: () => Promise<{ error: any }>;
	onViewChange?: (board: Board, viewType: BoardViewType) => Promise<void>;
	onOpenSettings?: () => void;
	userPreferences?: UserPreferences;
	onTaskClick?: (task: Task) => void;
}

export function ListView(props: ListViewProps) {
	const [isCreatingDetailedTask, setIsCreatingDetailedTask] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [isEditingTask, setIsEditingTask] = useState(false);

	// Handler for creating detailed task from header
	const handleCreateDetailedTaskFromHeader = () => {
		setIsCreatingDetailedTask(true);
	};

	// Handler for editing task
	const handleTaskEdit = (task: Task) => {
		setEditingTask(task);
		setIsEditingTask(true);
	};

	// Handler for saving edited task
	const handleEditTaskSave = async (id: number, updates: Partial<Task>) => {
		await props.onUpdateTask(id, updates);
		setIsEditingTask(false);
		setEditingTask(null);
	};

	// Handler for deleting task from edit dialog
	const handleEditTaskDelete = async (id: number) => {
		await props.onDeleteTask(id);
		setIsEditingTask(false);
		setEditingTask(null);
	};

	// Handler for duplicating task from edit dialog
	const handleEditTaskDuplicate = async (task: Task) => {
		if (props.onDuplicateTask) {
			await props.onDuplicateTask(task);
		}
		setIsEditingTask(false);
		setEditingTask(null);
	};

	// Handler for saving detailed task creation
	const handleCreateDetailedTaskSave = async (updates: Partial<Task>) => {
		const newTask: Omit<Task, 'id' | 'createdAt'> = {
			title: updates.title || '',
			description: updates.description || '',
			timeEstimate: updates.timeEstimate || 0,
			priority: updates.priority || 2,
			status: updates.status || 'backlog', // Default to backlog when created from header
			position: props.tasks.filter(t => t.status === (updates.status || 'backlog')).length,
			boardId: props.isAllTasksBoard ? updates.boardId : props.board.id,
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

		await props.onAddTask(newTask);
		setIsCreatingDetailedTask(false);
	};

	// GlobalSidebar requiring minimal props
	return (
		<SidebarProvider>
			<div className='h-screen bg-background flex w-full'>
				<GlobalSidebar
					boards={props.boards || []}
					currentBoard={props.board}
					currentView="list"
					tasks={props.tasks}
					onSelectBoard={(selectedBoard: Board) => {
						if (props.onSelectBoard) {
							props.onSelectBoard(selectedBoard);
						} else {
							props.onBack();
						}
					}}
					onSelectBoardView={(board: Board, view: BoardViewType) => {
						if (props.onViewChange) {
							props.onViewChange(board, view);
						} else if (props.onSelectBoard) {
							props.onSelectBoard(board);
						} else {
							props.onBack();
						}
					}}
					onCreateTask={(board: Board) => {
						// Set the board context and trigger task creation
						if (board.id !== props.board.id && props.onSelectBoard) {
							props.onSelectBoard(board);
						}
						// Trigger task creation
						setIsCreatingDetailedTask(true);
					}}
					onNavigateToBoards={() => {
						// Navigate back to board selection
						props.onBack();
					}}
					onTaskClick={(task: Task) => {
						// Open the task for editing when clicked from upcoming preview
						handleTaskEdit(task);
					}}
				/>
				<SidebarInset className='flex flex-col flex-1 overflow-y-auto'>
					{/* Header for List View */}
					<UnifiedHeader
						title={props.board.name}
						subtitle={props.board.description}
						board={props.board}
						currentView='list'
						onViewChange={props.onViewChange}
						onCreateDetailedTask={handleCreateDetailedTaskFromHeader}
						user={props.user}
						onSignOut={props.onSignOut}
						onOpenSettings={props.onOpenSettings}
					/>
					<CompactListView {...props} />
				</SidebarInset>
			</div>

			{/* Edit Task Dialog */}
			<TaskEditDialog
				task={editingTask}
				isOpen={isEditingTask}
				onClose={() => setIsEditingTask(false)}
				onSave={handleEditTaskSave}
				onDelete={handleEditTaskDelete}
				onDuplicate={props.onDuplicateTask ? handleEditTaskDuplicate : undefined}
				isAllTasksBoard={props.isAllTasksBoard}
				boards={props.boards}
				userPreferences={props.userPreferences}
			/>

			{/* Create Detailed Task Dialog */}
			<TaskEditDialog
				task={null}
				isOpen={isCreatingDetailedTask}
				onClose={() => setIsCreatingDetailedTask(false)}
				onCreate={handleCreateDetailedTaskSave}
				onDelete={async () => {}} // Not needed for creation
				isAllTasksBoard={props.isAllTasksBoard}
				boards={props.boards}
				isCreating={true}
				userPreferences={props.userPreferences}
			/>
		</SidebarProvider>
	);
}
