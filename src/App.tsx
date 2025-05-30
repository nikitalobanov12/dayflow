import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
	const { tasks, addTask, deleteTask, moveTask, updateTask, isLoading } = useDatabase();
	const [currentView, setCurrentView] = useState<'kanban' | 'sprint' | 'journal' | 'timer'>('kanban');
	const [isEditingTask, setIsEditingTask] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [activeId, setActiveId] = useState<string | null>(null);

	// Configure sensors for drag and drop
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		})
	);
	const getTasksByStatus = (status: Task['status']) => {
		return tasks.filter((task: Task) => task.status === status);
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
		const newStatus = over.id as Task['status'];
		console.log('Moving task:', { taskId, newStatus });

		if (newStatus && ['backlog', 'this-week', 'today', 'done'].includes(newStatus)) {
			console.log('Calling moveTask with:', taskId, newStatus);
			await moveTask(taskId, newStatus);
		} else {
			console.log('Invalid status or missing newStatus:', newStatus);
		}
	};

	const getActiveTask = () => {
		if (!activeId) return null;
		return tasks.find(task => task.id.toString() === activeId);
	};

	if (isLoading) {
		return (
			<div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
				<div className='text-center'>
					<div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto'></div>
					<p className='mt-4 text-gray-600'>Loading DayFlow...</p>
				</div>
			</div>
		);
	}

	// Sprint Mode View
	if (currentView === 'sprint') {
		const todayTasks = getTasksByStatus('today');
		return (
			<SprintMode
				tasks={todayTasks}
				onTaskComplete={handleTaskComplete}
				onExit={() => setCurrentView('kanban')}
			/>
		);
	}

	// Journal View
	if (currentView === 'journal') {
		return (
			<div className='min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6'>
				<div className='max-w-4xl mx-auto'>
					<div className='flex justify-between items-center mb-8'>
						<h1 className='text-3xl font-bold text-gray-800'>Daily Journal</h1>
						<Button
							variant='outline'
							onClick={() => setCurrentView('kanban')}
						>
							Back to Dashboard
						</Button>
					</div>
					<Journal />
				</div>
			</div>
		);
	}

	// Timer View
	if (currentView === 'timer') {
		const pomodoroMode: TimerMode = {
			type: 'pomodoro',
			duration: 25 * 60,
			label: 'Pomodoro Session',
		};

		return (
			<div className='min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-6'>
				<div className='max-w-2xl mx-auto'>
					<div className='flex justify-between items-center mb-8'>
						<h1 className='text-3xl font-bold text-gray-800'>Focus Timer</h1>
						<Button
							variant='outline'
							onClick={() => setCurrentView('kanban')}
						>
							Back to Dashboard
						</Button>
					</div>{' '}
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
						<Timer
							mode={pomodoroMode}
							onComplete={() => console.log('Pomodoro complete!')}
						/>
						<Timer mode={{ type: 'stopwatch', label: 'Track Time' }} />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col'>
			<div className='flex-shrink-0 p-6 border-b bg-white/80 backdrop-blur-sm'>
				<div className='max-w-7xl mx-auto flex justify-between items-center'>
					<h1 className='text-3xl font-bold text-gray-800'>DayFlow</h1>
					<div className='flex gap-3'>
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
										/>{' '}
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
										/>{' '}
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

						<Button
							variant='outline'
							onClick={() => setCurrentView('sprint')}
							disabled={getTasksByStatus('today').length === 0}
						>
							Start Sprint
						</Button>

						<Button
							variant='outline'
							onClick={() => setCurrentView('journal')}
						>
							Journal
						</Button>

						<Button
							variant='outline'
							onClick={() => setCurrentView('timer')}
						>
							Timer
						</Button>
					</div>
				</div>
			</div>{' '}
			<div className='flex-1 relative'>
				{' '}
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
				>
					{' '}
					<div className='h-full flex justify-center overflow-x-auto w-full gap-8 p-4'>
						{' '}
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
						/>{' '}
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
						/>{' '}
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
					</div>{' '}
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
