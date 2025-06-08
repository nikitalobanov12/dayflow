import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { TaskCard } from '@/components/kanban/TaskCard';
import { Task, Board } from '@/types';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { ArrowLeft } from 'lucide-react';
import { ProfileDropdown } from '@/components/profile/ProfileDropdown';
import { SubtasksContainer } from '@/components/subtasks/SubtasksContainer';
import { isTauri } from '@/lib/platform';

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
}

export function KanbanBoardView({ board, tasks, onBack, onMoveTask, onAddTask, onUpdateTask, onDeleteTask, onDuplicateTask, onReorderTasksInColumn, onUpdateTimeEstimate, onStartSprint, isAllTasksBoard = false, boards = [], user, onSignOut }: KanbanBoardViewProps) {
	const [isEditingTask, setIsEditingTask] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
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
			return tasks.filter((task: Task) => task.status === status).sort((a, b) => a.position - b.position);
		},
		[tasks]
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
	const handleUpdateTask = async () => {
		if (!editingTask || !editingTask.title.trim()) return;

		try {
			await onUpdateTask(editingTask.id, {
				title: editingTask.title,
				description: editingTask.description,
				timeEstimate: editingTask.timeEstimate,
				boardId: editingTask.boardId,
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
			{' '}
			<div className={`${!isTauri ? 'pt-8' : ''} p-4 border-b border-border bg-card relative z-10`}>
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
					<ProfileDropdown
						user={user}
						onSignOut={onSignOut}
					/>
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
			<Dialog
				open={isEditingTask}
				onOpenChange={setIsEditingTask}
			>
				<DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>Edit Task</DialogTitle>
						<DialogDescription>Make changes to your task</DialogDescription>
					</DialogHeader>
					{editingTask && (
						<div className='space-y-6'>
							{/* Basic Information */}
							<div className='space-y-4'>
								<h4 className='text-sm font-medium text-foreground'>Basic Information</h4>
								<Input
									placeholder='Task title'
									value={editingTask.title}
									onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
								/>
								<Textarea
									placeholder='Task description'
									value={editingTask.description}
									onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
									rows={3}
								/>

								{/* Board selection for All Tasks board */}
								{isAllTasksBoard && boards && boards.length > 0 && (
									<div className='space-y-2'>
										<label className='text-sm font-medium'>Board</label>
										<Select
											value={editingTask.boardId?.toString() || ''}
											onValueChange={(value: string) => setEditingTask({ ...editingTask, boardId: value ? parseInt(value) : undefined })}
										>
											<SelectTrigger>
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
									</div>
								)}
							</div>

							{/* Priority and Category */}
							<div className='grid grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>Priority</label>
									<Select
										value={editingTask.priority?.toString() || '2'}
										onValueChange={(value: string) => setEditingTask({ ...editingTask, priority: parseInt(value) as 1 | 2 | 3 | 4 })}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='1'>🟢 Low Priority</SelectItem>
											<SelectItem value='2'>🟡 Medium Priority</SelectItem>
											<SelectItem value='3'>🟠 High Priority</SelectItem>
											<SelectItem value='4'>🔴 Critical Priority</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className='space-y-2'>
									<label className='text-sm font-medium'>Category</label>
									<Input
										placeholder='e.g., Development, Design'
										value={editingTask.category || ''}
										onChange={e => setEditingTask({ ...editingTask, category: e.target.value })}
									/>
								</div>
							</div>

							{/* Dates */}
							<div className='space-y-4'>
								<h4 className='text-sm font-medium text-foreground'>Scheduling</h4>
								<div className='grid grid-cols-2 gap-4'>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>Start Date</label>
										<Input
											type='date'
											value={editingTask.startDate ? editingTask.startDate.split('T')[0] : ''}
											onChange={e =>
												setEditingTask({
													...editingTask,
													startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
												})
											}
										/>
									</div>

									<div className='space-y-2'>
										<label className='text-sm font-medium'>Due Date</label>
										<Input
											type='date'
											value={editingTask.dueDate ? editingTask.dueDate.split('T')[0] : ''}
											onChange={e =>
												setEditingTask({
													...editingTask,
													dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
												})
											}
										/>
									</div>
								</div>
							</div>

							{/* Eisenhower Matrix Estimates */}
							<div className='space-y-4'>
								<h4 className='text-sm font-medium text-foreground'>Eisenhower Matrix</h4>
								<div className='grid grid-cols-2 gap-4'>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>Effort Level (Urgency)</label>
										<Select
											value={editingTask.effortEstimate?.toString() || '2'}
											onValueChange={(value: string) => setEditingTask({ ...editingTask, effortEstimate: parseInt(value) as 1 | 2 | 3 | 4 })}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='1'>Low Effort</SelectItem>
												<SelectItem value='2'>Medium Effort</SelectItem>
												<SelectItem value='3'>High Effort</SelectItem>
												<SelectItem value='4'>Very High Effort</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className='space-y-2'>
										<label className='text-sm font-medium'>Impact Level (Importance)</label>
										<Select
											value={editingTask.impactEstimate?.toString() || '2'}
											onValueChange={(value: string) => setEditingTask({ ...editingTask, impactEstimate: parseInt(value) as 1 | 2 | 3 | 4 })}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='1'>Low Impact</SelectItem>
												<SelectItem value='2'>Medium Impact</SelectItem>
												<SelectItem value='3'>High Impact</SelectItem>
												<SelectItem value='4'>Very High Impact</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>

							{/* Time and Progress */}
							<div className='space-y-4'>
								<h4 className='text-sm font-medium text-foreground'>Time & Progress</h4>
								<div className='grid grid-cols-2 gap-4'>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>Time Estimate (minutes)</label>
										<Input
											type='number'
											placeholder='30'
											value={editingTask.timeEstimate || ''}
											onChange={e => {
												const minutes = parseInt(e.target.value) || 0;
												setEditingTask({ ...editingTask, timeEstimate: minutes });
											}}
											min='0'
											max='999'
										/>
									</div>

									<div className='space-y-2'>
										<label className='text-sm font-medium'>Progress (%)</label>
										<Input
											type='number'
											placeholder='0'
											value={editingTask.progressPercentage || 0}
											onChange={e => {
												const progress = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
												setEditingTask({ ...editingTask, progressPercentage: progress });
											}}
											min='0'
											max='100'
										/>
									</div>
								</div>{' '}
							</div>

							{/* Subtasks */}
							<div className='space-y-4'>
								<h4 className='text-sm font-medium text-foreground'>Subtasks</h4>
								<div className='border rounded-lg p-3 bg-background/50'>
									<SubtasksContainer taskId={editingTask.id} />
								</div>
							</div>

							{/* Action Buttons */}
							<div className='flex gap-2 pt-4 border-t'>
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
