import { useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, View, Event } from 'react-big-calendar';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task, Board } from '@/types';
import { Trash2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react';
import { SubtasksContainer } from '@/components/subtasks/SubtasksContainer';
import { ViewHeader } from '@/components/ui/view-header';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface CalendarViewProps {
	board: Board;
	tasks: Task[];
	onBack: () => void;
	onMoveTask: (taskId: number, newStatus: Task['status']) => Promise<void>;
	onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
	onUpdateTask: (id: number, updates: Partial<Task>) => Promise<void>;
	onDeleteTask: (id: number) => Promise<void>;
	onDuplicateTask?: (task: Task) => Promise<void>;
	onUpdateTimeEstimate: (taskId: number, timeEstimate: number) => Promise<void>;
	isAllTasksBoard?: boolean;
	boards?: Board[];
	user?: any;
	onSignOut?: () => Promise<{ error: any }>;
	onViewChange?: (board: Board, viewType: 'kanban' | 'calendar' | 'eisenhower' | 'gantt') => Promise<void>;
}

interface CalendarEvent extends Event {
	resource: Task;
}

export function CalendarView({ board, tasks, onBack, onAddTask, onUpdateTask, onDeleteTask, isAllTasksBoard = false, user, onSignOut, onViewChange }: CalendarViewProps) {
	const [currentView, setCurrentView] = useState<View>('week');
	const [currentDate, setCurrentDate] = useState(new Date());
	const [isEditingTask, setIsEditingTask] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [isCreatingTask, setIsCreatingTask] = useState(false);
	const [newTaskStart, setNewTaskStart] = useState<Date | null>(null);
	const [newTaskData, setNewTaskData] = useState({
		title: '',
		description: '',
		timeEstimate: 60,
		priority: 2 as 1 | 2 | 3 | 4,
		status: 'backlog' as Task['status'],
	});

	// Convert tasks to calendar events
	const events: CalendarEvent[] = useMemo(() => {
		return tasks
			.filter(task => task.scheduledDate || task.startDate || task.dueDate)
			.map(task => {
				let start: Date;
				let end: Date;

				if (task.scheduledDate) {
					start = new Date(task.scheduledDate);
				} else if (task.startDate) {
					start = new Date(task.startDate);
				} else if (task.dueDate) {
					start = new Date(task.dueDate);
				} else {
					start = new Date();
				}

				// Calculate end time based on time estimate
				end = new Date(start);
				if (task.timeEstimate && task.timeEstimate > 0) {
					end.setMinutes(end.getMinutes() + task.timeEstimate);
				} else {
					end.setHours(end.getHours() + 1);
				}

				// If task has both start and due date, use them
				if (task.startDate && task.dueDate) {
					start = new Date(task.startDate);
					end = new Date(task.dueDate);
				}

				return {
					id: task.id,
					title: task.title,
					start,
					end,
					resource: task,
					allDay: false,
				};
			});
	}, [tasks]);
	// Get unscheduled tasks (tasks without scheduledDate, startDate, or dueDate)
	const unscheduledTasks = useMemo(() => {
		return tasks.filter(task => !task.scheduledDate && !task.startDate && !task.dueDate && task.status !== 'done');
	}, [tasks]);

	// Get completed unscheduled tasks
	const completedUnscheduledTasks = useMemo(() => {
		return tasks.filter(task => !task.scheduledDate && !task.startDate && !task.dueDate && task.status === 'done');
	}, [tasks]);

	const handleScheduleTask = async (task: Task, date: Date) => {
		// Determine the appropriate status based on scheduled date
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const scheduledDate = new Date(date);
		scheduledDate.setHours(0, 0, 0, 0);

		// Calculate week boundaries
		const startOfWeek = new Date(today);
		startOfWeek.setDate(today.getDate() - today.getDay()); // Start of this week (Sunday)

		const endOfWeek = new Date(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 6); // End of this week (Saturday)

		let taskStatus: Task['status'] = 'backlog';

		if (scheduledDate.getTime() === today.getTime()) {
			taskStatus = 'today';
		} else if (scheduledDate >= startOfWeek && scheduledDate <= endOfWeek) {
			taskStatus = 'this-week';
		} else if (task.status !== 'done') {
			taskStatus = 'backlog';
		}

		await onUpdateTask(task.id, {
			scheduledDate: date.toISOString(),
			status: taskStatus,
		});
	};

	const handleSelectSlot = useCallback(({ start }: { start: Date; end: Date }) => {
		setNewTaskStart(start);
		setIsCreatingTask(true);
	}, []);

	const handleSelectEvent = useCallback((event: CalendarEvent) => {
		setEditingTask(event.resource);
		setIsEditingTask(true);
	}, []);
	const handleCreateTask = async () => {
		if (!newTaskData.title.trim() || !newTaskStart) return;

		try {
			// Determine the appropriate status based on scheduled date
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const scheduledDate = new Date(newTaskStart);
			scheduledDate.setHours(0, 0, 0, 0);

			// Calculate week boundaries
			const startOfWeek = new Date(today);
			startOfWeek.setDate(today.getDate() - today.getDay()); // Start of this week (Sunday)

			const endOfWeek = new Date(startOfWeek);
			endOfWeek.setDate(startOfWeek.getDate() + 6); // End of this week (Saturday)

			let taskStatus: Task['status'] = 'backlog';

			if (scheduledDate.getTime() === today.getTime()) {
				// Scheduled for today
				taskStatus = 'today';
			} else if (scheduledDate >= startOfWeek && scheduledDate <= endOfWeek) {
				// Scheduled for this week
				taskStatus = 'this-week';
			} else {
				// Scheduled for future or past - put in backlog
				taskStatus = 'backlog';
			}

			const taskToCreate = {
				...newTaskData,
				status: taskStatus, // Use the automatically determined status
				scheduledDate: newTaskStart.toISOString(),
				startDate: newTaskStart.toISOString(),
				position: tasks.length,
				progressPercentage: 0,
				effortEstimate: 2 as 1 | 2 | 3 | 4,
				impactEstimate: 2 as 1 | 2 | 3 | 4,
				labels: [],
				attachments: [],
				timeSpent: 0,
				boardId: isAllTasksBoard ? undefined : board.id,
			};

			await onAddTask(taskToCreate);
			setIsCreatingTask(false);
			setNewTaskData({
				title: '',
				description: '',
				timeEstimate: 60,
				priority: 2,
				status: 'backlog',
			});
			setNewTaskStart(null);
		} catch (error) {
			console.error('Failed to create task:', error);
		}
	};
	const handleUpdateTask = async () => {
		if (!editingTask || !editingTask.title.trim()) return;

		try {
			// Determine the appropriate status based on scheduled date
			let updatedStatus = editingTask.status; // Keep current status by default

			if (editingTask.scheduledDate) {
				const today = new Date();
				today.setHours(0, 0, 0, 0);

				const scheduledDate = new Date(editingTask.scheduledDate);
				scheduledDate.setHours(0, 0, 0, 0);

				// Calculate week boundaries
				const startOfWeek = new Date(today);
				startOfWeek.setDate(today.getDate() - today.getDay()); // Start of this week (Sunday)

				const endOfWeek = new Date(startOfWeek);
				endOfWeek.setDate(startOfWeek.getDate() + 6); // End of this week (Saturday)

				if (scheduledDate.getTime() === today.getTime()) {
					// Scheduled for today
					updatedStatus = 'today';
				} else if (scheduledDate >= startOfWeek && scheduledDate <= endOfWeek) {
					// Scheduled for this week
					updatedStatus = 'this-week';
				} else {
					// Scheduled for future or past - put in backlog (unless already done)
					if (editingTask.status !== 'done') {
						updatedStatus = 'backlog';
					}
				}
			}

			await onUpdateTask(editingTask.id, {
				title: editingTask.title,
				description: editingTask.description,
				timeEstimate: editingTask.timeEstimate,
				priority: editingTask.priority,
				scheduledDate: editingTask.scheduledDate,
				startDate: editingTask.startDate,
				dueDate: editingTask.dueDate,
				status: updatedStatus, // Use the automatically determined status
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

	const eventStyleGetter = useCallback((event: CalendarEvent) => {
		const task = event.resource;
		let backgroundColor = '#3b82f6';
		let borderColor = '#2563eb';

		// Color by priority
		switch (task.priority) {
			case 4:
				backgroundColor = '#ef4444';
				borderColor = '#dc2626';
				break;
			case 3:
				backgroundColor = '#f59e0b';
				borderColor = '#d97706';
				break;
			case 2:
				backgroundColor = '#3b82f6';
				borderColor = '#2563eb';
				break;
			case 1:
				backgroundColor = '#10b981';
				borderColor = '#059669';
				break;
		}

		// Dim completed tasks
		if (task.status === 'done') {
			backgroundColor = '#6b7280';
			borderColor = '#4b5563';
		}

		return {
			style: {
				backgroundColor,
				borderColor,
				color: 'white',
				border: `2px solid ${borderColor}`,
				borderRadius: '6px',
				fontSize: '12px',
				fontWeight: '500',
			},
		};
	}, []);

	const renderTaskCard = (task: Task, isCompleted = false) => (
		<div
			key={task.id}
			className={`p-3 bg-background rounded-lg border border-border hover:shadow-sm transition-shadow cursor-pointer ${isCompleted ? 'opacity-70' : ''}`}
			draggable={!isCompleted}
			onDragStart={e => {
				if (!isCompleted) {
					e.dataTransfer.setData('text/plain', task.id.toString());
				}
			}}
			onClick={() => {
				setEditingTask(task);
				setIsEditingTask(true);
			}}
		>
			<div className='flex items-start justify-between'>
				<div className='flex-1 min-w-0'>
					<div className='flex items-center gap-2'>
						{isCompleted && <CheckCircle className='h-4 w-4 text-green-600 flex-shrink-0' />}
						<h4 className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{task.title}</h4>
					</div>
					{task.description && <p className={`text-xs mt-1 line-clamp-2 ${isCompleted ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{task.description}</p>}
					<div className='flex items-center gap-2 mt-2 text-xs text-muted-foreground'>
						<span className={`px-2 py-1 rounded-full text-xs font-medium ${task.status === 'done' ? 'bg-green-100 text-green-800' : task.status === 'today' ? 'bg-red-100 text-red-800' : task.status === 'this-week' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{task.status.replace('-', ' ')}</span>
						{task.timeEstimate && task.timeEstimate > 0 && (
							<span className='flex items-center gap-1'>
								<Clock className='h-3 w-3' />
								{task.timeEstimate}m
							</span>
						)}
					</div>
				</div>
			</div>
			{!isCompleted && <div className='text-xs text-muted-foreground mt-2 pt-2 border-t border-border'>Drag to calendar or click to edit</div>}
		</div>
	);

	return (
		<div className='h-full bg-background flex flex-col'>
			{/* Header */}
			<ViewHeader
				board={board}
				currentView='calendar'
				onBack={onBack}
				onViewChange={onViewChange}
				user={user}
				onSignOut={onSignOut}
			/>

			{/* Main Content Area */}
			<div className='flex-1 flex'>
				{' '}
				{/* Sidebar for unscheduled and completed tasks */}
				{(unscheduledTasks.length > 0 || completedUnscheduledTasks.length > 0) && (
					<div className='w-80 border-r border-border bg-muted/20 p-4 overflow-y-auto'>
						{/* Unscheduled Tasks Section */}
						{unscheduledTasks.length > 0 && (
							<div className='mb-6'>
								<h3 className='text-sm font-semibold mb-3 flex items-center gap-2'>
									<CalendarIcon className='h-4 w-4' />
									Unscheduled Tasks ({unscheduledTasks.length})
								</h3>
								<div className='space-y-2'>{unscheduledTasks.map(task => renderTaskCard(task, false))}</div>
							</div>
						)}

						{/* Completed Unscheduled Tasks Section */}
						{completedUnscheduledTasks.length > 0 && (
							<div>
								<h3 className='text-sm font-semibold mb-3 flex items-center gap-2'>
									<CheckCircle className='h-4 w-4 text-green-600' />
									Completed Tasks ({completedUnscheduledTasks.length})
								</h3>
								<div className='space-y-2'>{completedUnscheduledTasks.map(task => renderTaskCard(task, true))}</div>
							</div>
						)}
					</div>
				)}
				{/* Calendar */}
				<div
					className='flex-1 p-4'
					onDrop={async e => {
						e.preventDefault();
						const taskId = e.dataTransfer.getData('text/plain');
						const task = tasks.find(t => t.id === parseInt(taskId));
						if (task) {
							// For now, schedule for today - in a more advanced implementation,
							// you could detect which calendar cell was dropped on
							await handleScheduleTask(task, new Date());
						}
					}}
					onDragOver={e => {
						e.preventDefault();
					}}
				>
					<div className='h-full calendar-wrapper'>
						<Calendar
							localizer={localizer}
							events={events}
							startAccessor='start'
							endAccessor='end'
							view={currentView}
							onView={setCurrentView}
							date={currentDate}
							onNavigate={setCurrentDate}
							onSelectSlot={handleSelectSlot}
							onSelectEvent={handleSelectEvent}
							selectable
							eventPropGetter={eventStyleGetter}
							components={{
								toolbar: ({ label, onNavigate }) => (
									<div className='flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg border border-border'>
										<div className='flex items-center gap-2'>
											<Button
												variant='outline'
												size='sm'
												onClick={() => onNavigate('PREV')}
											>
												<ChevronLeft className='h-4 w-4' />
											</Button>
											<Button
												variant='outline'
												size='sm'
												onClick={() => onNavigate('TODAY')}
											>
												Today
											</Button>
											<Button
												variant='outline'
												size='sm'
												onClick={() => onNavigate('NEXT')}
											>
												<ChevronRight className='h-4 w-4' />
											</Button>
										</div>
										<h2 className='text-lg font-semibold'>{label}</h2>
										<div className='flex gap-1'>
											{(['month', 'week', 'day'] as View[]).map(view => (
												<Button
													key={view}
													variant={currentView === view ? 'default' : 'outline'}
													size='sm'
													onClick={() => setCurrentView(view)}
													className='capitalize'
												>
													{view}
												</Button>
											))}
										</div>{' '}
									</div>
								),
							}}
						/>
					</div>
				</div>
			</div>

			{/* Create Task Dialog */}
			<Dialog
				open={isCreatingTask}
				onOpenChange={setIsCreatingTask}
			>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>Create New Task</DialogTitle>
						<DialogDescription>{newTaskStart && `Scheduled for ${moment(newTaskStart).format('MMMM Do, YYYY [at] h:mm A')}`}</DialogDescription>
					</DialogHeader>
					<div className='space-y-4'>
						<div>
							<Input
								placeholder='Task title'
								value={newTaskData.title}
								onChange={e => setNewTaskData(prev => ({ ...prev, title: e.target.value }))}
								className='w-full'
							/>
						</div>
						<div>
							<Textarea
								placeholder='Description (optional)'
								value={newTaskData.description}
								onChange={e => setNewTaskData(prev => ({ ...prev, description: e.target.value }))}
								className='w-full'
								rows={3}
							/>
						</div>
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<label className='text-sm font-medium'>Time Estimate (minutes)</label>
								<Input
									type='number'
									value={newTaskData.timeEstimate}
									onChange={e => setNewTaskData(prev => ({ ...prev, timeEstimate: parseInt(e.target.value) || 0 }))}
									min='0'
									step='15'
								/>
							</div>
							<div>
								<label className='text-sm font-medium'>Priority</label>
								<Select
									value={newTaskData.priority.toString()}
									onValueChange={value => setNewTaskData(prev => ({ ...prev, priority: parseInt(value) as 1 | 2 | 3 | 4 }))}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='1'>Low</SelectItem>
										<SelectItem value='2'>Medium</SelectItem>
										<SelectItem value='3'>High</SelectItem>
										<SelectItem value='4'>Critical</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className='flex justify-end gap-2'>
							<Button
								variant='outline'
								onClick={() => setIsCreatingTask(false)}
							>
								Cancel
							</Button>
							<Button onClick={handleCreateTask}>Create Task</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Task Dialog */}
			<Dialog
				open={isEditingTask}
				onOpenChange={setIsEditingTask}
			>
				<DialogContent className='sm:max-w-2xl max-h-[80vh] overflow-y-auto'>
					{editingTask && (
						<>
							<DialogHeader>
								<DialogTitle>Edit Task</DialogTitle>
								<DialogDescription>Modify task details and scheduling</DialogDescription>
							</DialogHeader>
							<div className='space-y-4'>
								<div>
									<label className='text-sm font-medium'>Title</label>
									<Input
										value={editingTask.title}
										onChange={e => setEditingTask(prev => (prev ? { ...prev, title: e.target.value } : null))}
										className='w-full'
									/>
								</div>
								<div>
									<label className='text-sm font-medium'>Description</label>
									<Textarea
										value={editingTask.description || ''}
										onChange={e => setEditingTask(prev => (prev ? { ...prev, description: e.target.value } : null))}
										className='w-full'
										rows={3}
									/>
								</div>
								<div className='grid grid-cols-2 gap-4'>
									<div>
										<label className='text-sm font-medium'>Time Estimate (minutes)</label>
										<Input
											type='number'
											value={editingTask.timeEstimate}
											onChange={e => setEditingTask(prev => (prev ? { ...prev, timeEstimate: parseInt(e.target.value) || 0 } : null))}
											min='0'
											step='15'
										/>
									</div>
									<div>
										<label className='text-sm font-medium'>Priority</label>
										<Select
											value={editingTask.priority.toString()}
											onValueChange={value => setEditingTask(prev => (prev ? { ...prev, priority: parseInt(value) as 1 | 2 | 3 | 4 } : null))}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='1'>Low</SelectItem>
												<SelectItem value='2'>Medium</SelectItem>
												<SelectItem value='3'>High</SelectItem>
												<SelectItem value='4'>Critical</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
								<div className='grid grid-cols-2 gap-4'>
									<div>
										<label className='text-sm font-medium'>Start Date</label>
										<Input
											type='datetime-local'
											value={editingTask.startDate ? moment(editingTask.startDate).format('YYYY-MM-DDTHH:mm') : ''}
											onChange={e =>
												setEditingTask(prev =>
													prev
														? {
																...prev,
																startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
														  }
														: null
												)
											}
										/>
									</div>
									<div>
										<label className='text-sm font-medium'>Due Date</label>
										<Input
											type='datetime-local'
											value={editingTask.dueDate ? moment(editingTask.dueDate).format('YYYY-MM-DDTHH:mm') : ''}
											onChange={e =>
												setEditingTask(prev =>
													prev
														? {
																...prev,
																dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
														  }
														: null
												)
											}
										/>
									</div>
								</div>

								{/* Subtasks */}
								{editingTask.subtasks && editingTask.subtasks.length > 0 && (
									<div>
										<label className='text-sm font-medium'>Subtasks</label>
										<SubtasksContainer taskId={editingTask.id} />
									</div>
								)}

								<div className='flex justify-between'>
									<Button
										variant='destructive'
										onClick={handleDeleteTask}
									>
										<Trash2 className='h-4 w-4 mr-2' />
										Delete Task
									</Button>
									<div className='flex gap-2'>
										<Button
											variant='outline'
											onClick={() => setIsEditingTask(false)}
										>
											Cancel
										</Button>
										<Button onClick={handleUpdateTask}>Save Changes</Button>
									</div>
								</div>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* Dark mode calendar styles */}
			<style>{`
				.calendar-wrapper .rbc-calendar {
					background-color: hsl(var(--background));
					color: hsl(var(--foreground));
					border: 1px solid hsl(var(--border));
					border-radius: 8px;
				}

				.calendar-wrapper .rbc-header {
					background-color: hsl(var(--muted));
					color: hsl(var(--muted-foreground));
					border-bottom: 1px solid hsl(var(--border));
					padding: 12px 8px;
					font-weight: 600;
				}

				.calendar-wrapper .rbc-month-view,
				.calendar-wrapper .rbc-time-view {
					background-color: hsl(var(--background));
				}

				.calendar-wrapper .rbc-day-bg {
					background-color: hsl(var(--background));
					border-right: 1px solid hsl(var(--border));
				}

				.calendar-wrapper .rbc-day-bg.rbc-off-range-bg {
					background-color: hsl(var(--muted) / 0.3);
				}

				.calendar-wrapper .rbc-today {
					background-color: hsl(var(--primary) / 0.1);
				}

				.calendar-wrapper .rbc-time-slot {
					border-top: 1px solid hsl(var(--border));
				}

				.calendar-wrapper .rbc-timeslot-group {
					border-bottom: 1px solid hsl(var(--border));
				}

				.calendar-wrapper .rbc-time-header-gutter,
				.calendar-wrapper .rbc-time-header-cell {
					background-color: hsl(var(--muted));
					border-bottom: 1px solid hsl(var(--border));
					color: hsl(var(--muted-foreground));
				}

				.calendar-wrapper .rbc-allday-cell {
					background-color: hsl(var(--muted) / 0.5);
				}

				.calendar-wrapper .rbc-row-bg {
					border-bottom: 1px solid hsl(var(--border));
				}

				.calendar-wrapper .rbc-date-cell {
					color: hsl(var(--foreground));
					border-right: 1px solid hsl(var(--border));
				}

				.calendar-wrapper .rbc-button-link {
					color: hsl(var(--foreground));
				}

				.calendar-wrapper .rbc-show-more {
					color: hsl(var(--primary));
					background-color: hsl(var(--background));
					border: 1px solid hsl(var(--border));
				}

				.calendar-wrapper .rbc-event {
					border-radius: 4px;
					border: none;
					font-size: 12px;
					padding: 2px 5px;
				}

				.calendar-wrapper .rbc-slot-selection {
					background-color: hsl(var(--primary) / 0.2);
					border: 2px solid hsl(var(--primary));
				}

				.calendar-wrapper .rbc-time-content {
					border-top: 1px solid hsl(var(--border));
				}

				.calendar-wrapper .rbc-time-gutter,
				.calendar-wrapper .rbc-time-gutter .rbc-timeslot-group {
					background-color: hsl(var(--muted) / 0.3);
					border-right: 1px solid hsl(var(--border));
				}

				.calendar-wrapper .rbc-current-time-indicator {
					background-color: hsl(var(--primary));
				}
			`}</style>
		</div>
	);
}
