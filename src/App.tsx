import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { CustomTitlebar } from '@/components/ui/custom-titlebar';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { SprintMode } from '@/components/sprint/SprintMode';
import { Journal } from '@/components/journal/Journal';
import { Timer, TimerMode } from '@/components/timer/Timer';
import { useDatabase } from '@/hooks/useDatabase';
import { Task } from '@/types';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { TaskCard } from '@/components/kanban/TaskCard';
import './App.css';

function App() {
	const { tasks, addTask, deleteTask, moveTask, updateTask, reorderTasksInColumn, isLoading } = useDatabase();
	const [currentView, setCurrentView] = useState<'kanban' | 'sprint' | 'journal' | 'timer'>('kanban');
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

	const handleTaskComplete = async (taskId: number) => {
		await moveTask(taskId, 'done');
	};

	const handleEditTask = (task: Task) => {
		setEditingTask(task);
		setIsEditingTask(true);
	};
	const handleUpdateTimeEstimate = async (taskId: number, timeEstimate: number) => {
		try {
			await updateTask(taskId, { timeEstimate });
		} catch (error) {
			console.error('Failed to update time estimate:', error);
		}
	};

	const handleDeleteTask = async () => {
		if (!editingTask) return;
		try {
			await deleteTask(editingTask.id);
			setEditingTask(null);
			setIsEditingTask(false);
		} catch (error) {
			console.error('Failed to delete task:', error);
		}
	};

	const handleUpdateTask = async () => {
		if (!editingTask || !editingTask.title.trim()) return;

		try {
			await updateTask(editingTask.id, {
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
	const handleDragStart = (event: DragStartEvent) => {
		console.log('Drag started:', event.active.id);
		setActiveId(event.active.id as string);
	};
	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		console.log('Drag ended:', { activeId: active.id, overId: over?.id });

		// Clear active id immediately to remove drag overlay
		setActiveId(null);

		if (!over) {
			console.log('No drop target detected');
			return;
		}

		const taskId = parseInt(active.id as string);
		const draggedTask = tasks.find(task => task.id === taskId);

		if (!draggedTask) {
			console.log('Could not find dragged task');
			return;
		}

		// Check if we're dropping directly on a column (status change)
		if (['backlog', 'this-week', 'today', 'done'].includes(over.id as string)) {
			const newStatus = over.id as Task['status'];
			console.log('Moving task to new column:', { taskId, newStatus });

			// If moving to a different column, just move to the end
			if (draggedTask.status !== newStatus) {
				await moveTask(taskId, newStatus);
			}
			return;
		}

		// Check if we're dropping on another task
		const overId = parseInt(over.id as string);
		const overTask = tasks.find(task => task.id === overId);

		if (overTask) {
			// Same column - reorder within column
			if (draggedTask.status === overTask.status) {
				console.log('Reordering within same column:', { taskId, overTaskId: overId });

				// Get all tasks in the same column, sorted by position
				const columnTasks = tasks.filter(task => task.status === draggedTask.status).sort((a, b) => a.position - b.position);

				// Find the indices
				const oldIndex = columnTasks.findIndex(task => task.id === taskId);
				const newIndex = columnTasks.findIndex(task => task.id === overId);

				if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
					console.log('Moving from index', oldIndex, 'to index', newIndex);

					// Remove the dragged task from its old position
					const reorderedTasks = [...columnTasks];
					const [movedTask] = reorderedTasks.splice(oldIndex, 1);

					// Insert it at the new position
					reorderedTasks.splice(newIndex, 0, movedTask);

					// Extract task IDs in their new order
					const newOrderIds = reorderedTasks.map(task => task.id);

					console.log('New task order:', newOrderIds);

					// Update all positions in one batch operation
					try {
						await reorderTasksInColumn(newOrderIds, draggedTask.status);
					} catch (error) {
						console.error('Failed to reorder tasks:', error);
					}
				}
			} else {
				// Different column - move to that column
				console.log('Moving task to different column via task drop:', { taskId, newStatus: overTask.status });
				await moveTask(taskId, overTask.status);
			}
		}
	};

	const getActiveTask = () => {
		if (!activeId) return null;
		return tasks.find(task => task.id.toString() === activeId);
	};
	if (isLoading) {
		return (
			<div className='h-screen bg-background flex flex-col'>
				<CustomTitlebar />
				<div className='flex-1 flex items-center justify-center relative overflow-hidden pt-8'>
					<div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-pulse'></div>
					<div className='text-center relative z-10'>
						<div className='animate-spin rounded-full h-16 w-16 border-4 border-muted border-t-primary mx-auto'></div>
						<p className='mt-6 text-muted-foreground text-lg font-medium'>Loading DayFlow...</p>
						<div className='mt-2 flex items-center justify-center gap-1'>
							<div className='w-2 h-2 bg-primary rounded-full animate-bounce'></div>
							<div
								className='w-2 h-2 bg-primary rounded-full animate-bounce'
								style={{ animationDelay: '0.1s' }}
							></div>
							<div
								className='w-2 h-2 bg-primary rounded-full animate-bounce'
								style={{ animationDelay: '0.2s' }}
							></div>
						</div>
					</div>
				</div>
			</div>
		);
	}
	if (currentView === 'sprint') {
		const todayTasks = getTasksByStatus('today');
		return (
			<div className='h-screen bg-background flex flex-col'>
				<CustomTitlebar title='DayFlow - Sprint Mode' />
				<div className='flex-1 pt-8'>
					<SprintMode
						tasks={todayTasks}
						onTaskComplete={handleTaskComplete}
						onExit={() => setCurrentView('kanban')}
					/>
				</div>
			</div>
		);
	}
	if (currentView === 'journal') {
		return (
			<div className='h-screen bg-background flex flex-col'>
				<CustomTitlebar title='DayFlow - Daily Journal' />
				<div className='flex-1 p-6 relative overflow-hidden pt-8'>
					<div className='absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/5'></div>
					<div className='max-w-4xl mx-auto relative z-10'>
						<div className='flex justify-between items-center mb-8'>
							<h1 className='text-3xl font-bold text-foreground'>Daily Journal</h1>
							<Button
								variant='outline'
								onClick={() => setCurrentView('kanban')}
								className='shadow-sm hover:shadow-md transition-all duration-200'
							>
								Back to Dashboard
							</Button>
						</div>
						<Journal />
					</div>
				</div>
			</div>
		);
	}
	if (currentView === 'timer') {
		const pomodoroMode: TimerMode = {
			type: 'pomodoro',
			duration: 25 * 60,
			label: 'Pomodoro Session',
		};
		return (
			<div className='h-screen bg-background flex flex-col'>
				<CustomTitlebar title='DayFlow - Focus Timer' />
				<div className='flex-1 p-6 relative overflow-hidden pt-8'>
					<div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10'></div>
					<div className='max-w-2xl mx-auto relative z-10'>
						<div className='flex justify-between items-center mb-8'>
							<h1 className='text-3xl font-bold text-foreground'>Focus Timer</h1>
							<Button
								variant='outline'
								onClick={() => setCurrentView('kanban')}
								className='shadow-sm hover:shadow-md transition-all duration-200'
							>
								Back to Dashboard
							</Button>
						</div>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<Timer
								mode={pomodoroMode}
								onComplete={() => console.log('Pomodoro complete!')}
							/>
							<Timer mode={{ type: 'stopwatch', label: 'Track Time' }} />
						</div>
					</div>
				</div>
			</div>
		);
	}
	return (
		<div className='h-screen bg-background flex flex-col transition-colors duration-300'>
			<CustomTitlebar title='DayFlow' />

			<div className=' w-full p-4  bg-background backdrop-blur-sm pt-8'>
				{/* max-w-1376px because that's the max width that the kanban columns can have*/}
				<div className='mx-auto max-w-[1376px] flex justify-between items-center'>
					<div className='flex gap-2 '>
						<img
							src='/logo.svg'
							className='relative inline w-10 h-10'
							alt='DayFlow Logo'
						/>

						<h1 className='text-3xl font-bold text-foreground'>DayFlow</h1>
					</div>
					<div className='flex items-center gap-3'>
						<div className='flex gap-2'>
							<Button
								variant='outline'
								onClick={() => setCurrentView('sprint')}
								disabled={getTasksByStatus('today').length === 0}
								className='transition-all duration-200 hover:scale-105'
							>
								Start Sprint
							</Button>

							<Button
								variant='outline'
								onClick={() => setCurrentView('journal')}
								className='transition-all duration-200 hover:scale-105'
							>
								Journal
							</Button>

							<Button
								variant='outline'
								onClick={() => setCurrentView('timer')}
								className='transition-all duration-200 hover:scale-105'
							>
								Timer
							</Button>
						</div>
						<div className='h-6 w-px bg-border'></div>
						<ThemeToggle />
					</div>
				</div>
			</div>
			<Dialog
				open={isEditingTask}
				onOpenChange={setIsEditingTask}
			>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>Edit Task</DialogTitle>
						<DialogDescription>Update your task details.</DialogDescription>
					</DialogHeader>{' '}
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
								</Button>{' '}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<div className='flex-1 relative'>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
				>
					<div className='h-full flex justify-center overflow-x-auto w-full gap-8 p-4'>
						<KanbanColumn
							title='Backlog'
							status='backlog'
							tasks={getTasksByStatus('backlog')}
							onMoveTask={moveTask}
							onEditTask={handleEditTask}
							onAddTask={addTask}
							onUpdateTimeEstimate={handleUpdateTimeEstimate}
							showAddButton={true}
							showProgress={false}
							totalTimeEstimate={getTotalTimeForColumn('backlog')}
						/>
						<KanbanColumn
							title='This Week'
							status='this-week'
							tasks={getTasksByStatus('this-week')}
							onMoveTask={moveTask}
							onEditTask={handleEditTask}
							onAddTask={addTask}
							onUpdateTimeEstimate={handleUpdateTimeEstimate}
							showAddButton={true}
							showProgress={true}
							completedCount={Math.floor(getTasksByStatus('this-week').length * 0.3)}
							totalTimeEstimate={getTotalTimeForColumn('this-week')}
						/>{' '}
						<KanbanColumn
							title='Today'
							status='today'
							tasks={getTasksByStatus('today')}
							onMoveTask={moveTask}
							onEditTask={handleEditTask}
							onAddTask={addTask}
							onUpdateTimeEstimate={handleUpdateTimeEstimate}
							showAddButton={true}
							showProgress={true}
							completedCount={Math.floor(getTasksByStatus('today').length * 0.6)}
							totalTimeEstimate={getTotalTimeForColumn('today')}
						/>
						<KanbanColumn
							title='Done'
							status='done'
							tasks={getTasksByStatus('done')}
							onMoveTask={moveTask}
							onEditTask={handleEditTask}
							onAddTask={addTask}
							onUpdateTimeEstimate={handleUpdateTimeEstimate}
							showAddButton={false}
							showProgress={false}
						/>
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
		</div>
	);
}

export default App;
