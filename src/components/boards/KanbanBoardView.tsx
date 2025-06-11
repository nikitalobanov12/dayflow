import { useState, useCallback } from 'react';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { TaskCard } from '@/components/kanban/TaskCard';
import { ViewHeader } from '@/components/ui/view-header';
import { TaskEditDialog } from '@/components/ui/task-edit-dialog';
import { Task, Board } from '@/types';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface KanbanBoardViewProps {
	board: Board;
	tasks: Task[];
	onBack: () => void;
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
	user?: any;
	onSignOut?: () => Promise<{ error: any }>;
	onViewChange?: (board: Board, viewType: 'kanban' | 'calendar') => Promise<void>;
	onOpenSettings?: () => void;
	userPreferences?: any; // Add user preferences prop
}

export function KanbanBoardView({ board, tasks, onBack, onMoveTask, onAddTask, onUpdateTask, onDeleteTask, onDuplicateTask, onReorderTasksInColumn, onUpdateTimeEstimate, onStartSprint, isAllTasksBoard = false, boards = [], user, onSignOut, onViewChange, onOpenSettings, userPreferences }: KanbanBoardViewProps) {
	const [isEditingTask, setIsEditingTask] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	// Apply user preferences for filtering and sorting
	const { filterTasks, sortTasks } = useUserPreferences(userPreferences);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 3, // Reduced from 8 for more responsive dragging
			},
		})
	);

	// Memoize functions to prevent unnecessary re-renders
	const getTasksByStatus = useCallback(
		(status: Task['status']) => {
			// First filter by status
			const statusTasks = tasks.filter((task: Task) => task.status === status);

			// Apply user preferences: filter out completed tasks if disabled
			const filteredTasks = filterTasks(statusTasks);

			// Apply user sorting preferences
			const sortedTasks = sortTasks(filteredTasks);

			// Keep position-based sorting within each status for drag & drop consistency
			return sortedTasks.sort((a, b) => a.position - b.position);
		},
		[tasks, filterTasks, sortTasks]
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

	// Helper function to get board information by ID
	const getBoardInfo = (boardId: number): Board | null => {
		if (!isAllTasksBoard || !boards) return null;
		return boards.find(b => b.id === boardId) || null;
	};

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);

		if (!over) return;

		const taskId = parseInt(active.id as string);
		const draggedTask = tasks.find(task => task.id === taskId);
		if (!draggedTask) return;

		// Handle column drops
		if (['backlog', 'this-week', 'today', 'done'].includes(over.id as string)) {
			const newStatus = over.id as Task['status'];
			if (draggedTask.status !== newStatus) {
				await onMoveTask(taskId, newStatus);
			}
			return;
		}

		// Handle task reordering
		const overId = parseInt(over.id as string);
		const overTask = tasks.find(task => task.id === overId);

		if (overTask && draggedTask.status === overTask.status) {
			const columnTasks = tasks.filter(task => task.status === draggedTask.status).sort((a, b) => a.position - b.position);
			const oldIndex = columnTasks.findIndex(task => task.id === taskId);
			const newIndex = columnTasks.findIndex(task => task.id === overId);

			if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
				const reorderedTasks = [...columnTasks];
				const [movedTask] = reorderedTasks.splice(oldIndex, 1);
				reorderedTasks.splice(newIndex, 0, movedTask);
				await onReorderTasksInColumn(
					reorderedTasks.map(task => task.id),
					draggedTask.status
				);
			}
		}
	};

	const getActiveTask = () => {
		if (!activeId) return null;
		return tasks.find(task => task.id.toString() === activeId);
	};
	return (
		<div className='h-screen bg-background flex flex-col'>
			{/* Header */}{' '}
			<ViewHeader
				board={board}
				currentView='kanban'
				onBack={onBack}
				onViewChange={onViewChange}
				user={user}
				onSignOut={onSignOut}
				onOpenSettings={onOpenSettings}
			/>
			{/* Kanban Board */}
			<div className='flex-1 flex flex-col min-h-0'>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
				>
					<div className='flex-1 overflow-x-auto overflow-y-hidden kanban-scroll-container'>
						<div className='flex justify-center gap-8 p-4 min-w-fit h-full'>
							{' '}
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
								showAddButton={true}
								showProgress={false}
								totalTimeEstimate={getTotalTimeForColumn('backlog')}
								isAllTasksBoard={isAllTasksBoard}
								boards={boards}
								getBoardInfo={getBoardInfo}
								currentBoard={board}
							/>{' '}
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
								showAddButton={true}
								showProgress={false}
								totalTimeEstimate={getTotalTimeForColumn('this-week')}
								isAllTasksBoard={isAllTasksBoard}
								boards={boards}
								getBoardInfo={getBoardInfo}
								currentBoard={board}
							/>{' '}
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
								showAddButton={true}
								showProgress={true}
								completedCount={getTodayCompletedCount()}
								totalTimeEstimate={getTotalTimeForColumn('today')}
								onStartSprint={onStartSprint}
								isAllTasksBoard={isAllTasksBoard}
								boards={boards}
								getBoardInfo={getBoardInfo}
								currentBoard={board}
							/>{' '}
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
								showAddButton={false}
								showProgress={false}
								isAllTasksBoard={isAllTasksBoard}
								boards={boards}
								getBoardInfo={getBoardInfo}
								currentBoard={board}
							/>
						</div>
					</div>{' '}
					<DragOverlay dropAnimation={null}>
						{activeId ? (
							<div className='rotate-2 scale-105 shadow-2xl opacity-95'>
								<TaskCard
									task={getActiveTask()!}
									onMove={() => {}}
									onEdit={() => {}}
									boardInfo={getActiveTask()?.boardId ? getBoardInfo(getActiveTask()!.boardId!) : board}
								/>
							</div>
						) : null}
					</DragOverlay>
				</DndContext>
			</div>{' '}
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
			/>
		</div>
	);
}
