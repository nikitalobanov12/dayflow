import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { TaskCard } from '@/components/kanban/TaskCard';
import { Task, Board } from '@/types';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { ArrowLeft } from 'lucide-react';

interface KanbanBoardViewProps {
	board: Board;
	tasks: Task[];
	onBack: () => void;
	onMoveTask: (taskId: number, newStatus: Task['status']) => Promise<void>;
	onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
	onUpdateTask: (id: number, updates: Partial<Task>) => Promise<void>;
	onDeleteTask: (id: number) => Promise<void>;
	onReorderTasksInColumn: (taskIds: number[], status: Task['status']) => Promise<void>;
	onUpdateTimeEstimate: (taskId: number, timeEstimate: number) => Promise<void>;
	onStartSprint?: () => void;
	isAllTasksBoard?: boolean;
}

export function KanbanBoardView({ board, tasks, onBack, onMoveTask, onAddTask, onUpdateTask, onDeleteTask, onReorderTasksInColumn, onUpdateTimeEstimate, onStartSprint, isAllTasksBoard = false }: KanbanBoardViewProps) {
	const [isEditingTask, setIsEditingTask] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		})
	);

	const getTasksByStatus = (status: Task['status']) => {
		return tasks.filter((task: Task) => task.status === status).sort((a, b) => a.position - b.position);
	};

	const getTotalTimeForColumn = (status: Task['status']): number => {
		switch (status) {
			case 'today':
				return getTasksByStatus('today').reduce((sum, task) => sum + task.timeEstimate, 0);
			case 'this-week':
				return [...getTasksByStatus('today'), ...getTasksByStatus('this-week')].reduce((sum, task) => sum + task.timeEstimate, 0);
			case 'backlog':
				return [...getTasksByStatus('today'), ...getTasksByStatus('this-week'), ...getTasksByStatus('backlog')].reduce((sum, task) => sum + task.timeEstimate, 0);
			case 'done':
				return getTasksByStatus('done').reduce((sum, task) => sum + task.timeEstimate, 0);
			default:
				return 0;
		}
	};

	const getTodayCompletedCount = (): number => {
		const today = new Date().toISOString().split('T')[0];
		return getTasksByStatus('done').filter(task => task.completedAt && task.completedAt.startsWith(today)).length;
	};

	const handleEditTask = (task: Task) => {
		setEditingTask(task);
		setIsEditingTask(true);
	};

	const handleUpdateTask = async () => {
		if (!editingTask || !editingTask.title.trim()) return;

		try {
			await onUpdateTask(editingTask.id, {
				title: editingTask.title,
				description: editingTask.description,
				timeEstimate: editingTask.timeEstimate,
			});
			setEditingTask(null);
			setIsEditingTask(false);
		} catch (error) {
			console.error('Failed to update task:', error);
		}
	};

	const handleDeleteTask = async () => {
		if (!editingTask) return;
		try {
			await onDeleteTask(editingTask.id);
			setEditingTask(null);
			setIsEditingTask(false);
		} catch (error) {
			console.error('Failed to delete task:', error);
		}
	};

	const handleAddTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
		// Add boardId to the task if not all tasks board
		const taskWithBoard = isAllTasksBoard ? task : { ...task, boardId: board.id };
		await onAddTask(taskWithBoard);
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
			{' '}
			{/* Header with proper titlebar spacing */}
			<div className='pt-8 p-4 border-b border-border bg-card relative z-10'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-4'>
						{' '}
						<Button
							variant='ghost'
							size='sm'
							onClick={onBack}
							className='gap-2 relative z-[60] pointer-events-auto'
						>
							<ArrowLeft className='h-4 w-4' />
							Back to Boards
						</Button>{' '}
						<div className='flex items-center gap-3'>
							<div
								className='w-8 h-8 rounded-lg flex items-center justify-center text-xl'
								style={{ backgroundColor: board.color || '#3B82F6' }}
							>
								{board.icon || '📋'}
							</div>
							<div>
								<h1 className='text-xl font-bold text-foreground'>{board.name}</h1>
								{board.description && <p className='text-sm text-muted-foreground'>{board.description}</p>}
							</div>
						</div>
					</div>
				</div>
			</div>
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
							<KanbanColumn
								title='Backlog'
								status='backlog'
								tasks={getTasksByStatus('backlog')}
								onMoveTask={onMoveTask}
								onEditTask={handleEditTask}
								onAddTask={handleAddTask}
								onUpdateTimeEstimate={onUpdateTimeEstimate}
								showAddButton={true}
								showProgress={false}
								totalTimeEstimate={getTotalTimeForColumn('backlog')}
							/>
							<KanbanColumn
								title='This Week'
								status='this-week'
								tasks={getTasksByStatus('this-week')}
								onMoveTask={onMoveTask}
								onEditTask={handleEditTask}
								onAddTask={handleAddTask}
								onUpdateTimeEstimate={onUpdateTimeEstimate}
								showAddButton={true}
								showProgress={false}
								totalTimeEstimate={getTotalTimeForColumn('this-week')}
							/>
							<KanbanColumn
								title='Today'
								status='today'
								tasks={getTasksByStatus('today')}
								onMoveTask={onMoveTask}
								onEditTask={handleEditTask}
								onAddTask={handleAddTask}
								onUpdateTimeEstimate={onUpdateTimeEstimate}
								showAddButton={true}
								showProgress={true}
								completedCount={getTodayCompletedCount()}
								totalTimeEstimate={getTotalTimeForColumn('today')}
								onStartSprint={onStartSprint}
							/>
							<KanbanColumn
								title='Done'
								status='done'
								tasks={getTasksByStatus('done')}
								onMoveTask={onMoveTask}
								onEditTask={handleEditTask}
								onAddTask={handleAddTask}
								onUpdateTimeEstimate={onUpdateTimeEstimate}
								showAddButton={false}
								showProgress={false}
							/>
						</div>
					</div>
					<DragOverlay dropAnimation={null}>
						{activeId ? (
							<div className='rotate-2 scale-105 shadow-2xl opacity-95'>
								<TaskCard
									task={getActiveTask()!}
									onMove={() => {}}
									onEdit={() => {}}
								/>
							</div>
						) : null}
					</DragOverlay>
				</DndContext>
			</div>
			{/* Edit Task Dialog */}
			<Dialog
				open={isEditingTask}
				onOpenChange={setIsEditingTask}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Task</DialogTitle>
						<DialogDescription>Make changes to your task</DialogDescription>
					</DialogHeader>
					{editingTask && (
						<div className='space-y-4'>
							<Input
								placeholder='Task title'
								value={editingTask.title}
								onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
							/>
							<Textarea
								placeholder='Task description'
								value={editingTask.description}
								onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
							/>
							<Input
								type='number'
								placeholder='Minutes (optional)'
								value={editingTask.timeEstimate || ''}
								onChange={e => {
									const minutes = parseInt(e.target.value) || 0;
									setEditingTask({ ...editingTask, timeEstimate: minutes });
								}}
								className='w-full'
								min='0'
								max='999'
							/>
							<div className='flex gap-2'>
								<Button
									onClick={handleUpdateTask}
									className='flex-1'
								>
									Update Task
								</Button>
								<Button
									variant='destructive'
									onClick={handleDeleteTask}
									className='px-4'
								>
									Delete
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
