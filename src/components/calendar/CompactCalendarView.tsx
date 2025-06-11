import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday, addMinutes, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Task, Board } from '@/types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle, ZoomIn, ZoomOut, Edit, Copy, Trash2, ArrowLeft, ArrowRight, ArrowUp, Check } from 'lucide-react';
import { TaskEditDialog } from '@/components/ui/task-edit-dialog';
import { ViewHeader } from '@/components/ui/view-header';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface CompactCalendarViewProps {
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
	onViewChange?: (board: Board, viewType: 'kanban' | 'calendar') => Promise<void>;
	onOpenSettings?: () => void;
	userPreferences?: any;
}

interface CalendarEvent {
	id: number;
	task: Task;
	start: Date;
	end: Date;
	title: string;
}

type ViewMode = '3-day' | 'week';

const ZOOM_LEVELS = [
	{ label: 'Compact', height: 60, timeInterval: 60 }, // 1 hour per 60px
	{ label: 'Comfortable', height: 80, timeInterval: 60 }, // 1 hour per 80px
	{ label: 'Spacious', height: 120, timeInterval: 60 }, // 1 hour per 120px
	{ label: 'Detailed', height: 160, timeInterval: 30 }, // 30 min per 80px (160px per hour)
];

export function CompactCalendarView({ board, tasks, onBack, onAddTask, onUpdateTask, onDeleteTask, onDuplicateTask, isAllTasksBoard = false, user, onSignOut, onViewChange, onOpenSettings, userPreferences }: CompactCalendarViewProps) {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [viewMode, setViewMode] = useState<ViewMode>('3-day');
	const [zoomLevel, setZoomLevel] = useState(1); // Start with comfortable view
	const [isEditingTask, setIsEditingTask] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [isCreatingTask, setIsCreatingTask] = useState(false);
	const [newTaskStart, setNewTaskStart] = useState<Date | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [newTaskData, setNewTaskData] = useState({
		title: '',
		description: '',
		timeEstimate: 60,
		priority: 2 as 1 | 2 | 3 | 4,
		status: 'backlog' as Task['status'],
	});

	const calendarContainerRef = useRef<HTMLDivElement>(null);

	// Apply user preferences
	const { filterTasks, sortTasks, weekStartsOn } = useUserPreferences(userPreferences);

	// Get current zoom configuration
	const currentZoom = ZOOM_LEVELS[zoomLevel];
	// Calculate visible dates based on view mode
	const visibleDates = useMemo(() => {
		if (viewMode === '3-day') {
			// Show current day and 2 days after it
			return Array.from({ length: 3 }, (_, i) => addDays(currentDate, i));
		} else {
			const start = startOfWeek(currentDate, { weekStartsOn });
			return Array.from({ length: 7 }, (_, i) => addDays(start, i));
		}
	}, [currentDate, viewMode, weekStartsOn]);

	// Convert tasks to calendar events
	const events: CalendarEvent[] = useMemo(() => {
		const filteredTasks = filterTasks(tasks);
		return filteredTasks
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
					end = addMinutes(start, task.timeEstimate);
				} else {
					end = addMinutes(start, 60); // Default 1 hour
				}

				// If task has both start and due date, use them
				if (task.startDate && task.dueDate) {
					start = new Date(task.startDate);
					end = new Date(task.dueDate);
				}

				return {
					id: task.id,
					task,
					start,
					end,
					title: task.title,
				};
			})
			.filter(event => {
				// Only show events that fall within visible dates
				return visibleDates.some(date => isSameDay(event.start, date) || isSameDay(event.end, date) || (event.start <= startOfDay(date) && event.end >= endOfDay(date)));
			});
	}, [tasks, filterTasks, visibleDates]);
	// Get unscheduled tasks
	const unscheduledTasks = useMemo(() => {
		const allUnscheduledTasks = tasks.filter(task => !task.scheduledDate && !task.startDate && !task.dueDate && task.status !== 'done');
		const filteredTasks = filterTasks(allUnscheduledTasks);

		// Sort by status priority first (today > this-week > backlog), then apply user preferences
		const statusPriority = { 'today': 0, 'this-week': 1, 'backlog': 2 };

		return filteredTasks.sort((a, b) => {
			// First, sort by status priority
			const statusA = statusPriority[a.status as keyof typeof statusPriority] ?? 2;
			const statusB = statusPriority[b.status as keyof typeof statusPriority] ?? 2;

			if (statusA !== statusB) {
				return statusA - statusB;
			}

			// If same status, apply user's sort preference
			const sortBy = userPreferences?.taskSortBy || 'priority';
			const sortOrder = userPreferences?.taskSortOrder || 'asc';

			let comparison = 0;
			switch (sortBy) {
				case 'priority':
					comparison = (b.priority || 2) - (a.priority || 2);
					break;
				case 'dueDate':
					const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
					const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
					comparison = aDate - bDate;
					break;
				case 'created':
					const aCreated = new Date(a.createdAt).getTime();
					const bCreated = new Date(b.createdAt).getTime();
					comparison = bCreated - aCreated;
					break;
				case 'alphabetical':
					comparison = a.title.localeCompare(b.title);
					break;
				default:
					comparison = 0;
			}

			return sortOrder === 'desc' ? -comparison : comparison;
		});
	}, [tasks, filterTasks, userPreferences?.taskSortBy, userPreferences?.taskSortOrder]);
	// Generate time slots for the day
	const timeSlots = useMemo(() => {
		const slots = [];
		const startHour = 0; // Start at 12 AM (midnight)
		const endHour = 23; // End at 11 PM
		const interval = currentZoom.timeInterval;

		for (let hour = startHour; hour <= endHour; hour++) {
			if (interval === 30) {
				slots.push({ hour, minute: 0, label: format(new Date().setHours(hour, 0), 'h:mm a') });
				if (hour < endHour) {
					slots.push({ hour, minute: 30, label: format(new Date().setHours(hour, 30), 'h:mm a') });
				}
			} else {
				slots.push({ hour, minute: 0, label: format(new Date().setHours(hour, 0), 'h a') });
			}
		}

		return slots;
	}, [currentZoom.timeInterval]);
	// Calculate event positions
	const getEventPosition = (event: CalendarEvent, dateIndex: number) => {
		const dayStart = startOfDay(visibleDates[dateIndex]);
		const slotStart = new Date(dayStart).setHours(0, 0, 0, 0); // 12 AM start (midnight)

		const eventStart = Math.max(event.start.getTime(), slotStart);
		const eventEnd = Math.min(event.end.getTime(), new Date(dayStart).setHours(23, 59, 59, 999)); // End at 11:59:59 PM

		const startMinutes = (eventStart - slotStart) / (1000 * 60);
		const durationMinutes = (eventEnd - eventStart) / (1000 * 60);
		const top = (startMinutes / currentZoom.timeInterval) * currentZoom.height;
		const height = Math.max((durationMinutes / currentZoom.timeInterval) * currentZoom.height, 24);

		return { top, height };
	};
	// Handle time slot click for creating new tasks
	const handleTimeSlotClick = (date: Date, hour: number, minute: number) => {
		const clickedTime = new Date(date);
		clickedTime.setHours(hour, minute, 0, 0);
		setNewTaskStart(clickedTime);
		setIsCreatingTask(true);
	};

	// Handle task drop on time slots
	const handleTaskDrop = async (date: Date, hour: number, minute: number, taskId: string) => {
		try {
			const task = tasks.find(t => t.id === parseInt(taskId));
			if (!task) return;

			const newScheduledDate = new Date(date);
			newScheduledDate.setHours(hour, minute, 0, 0);

			// Calculate new status based on scheduled date
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const scheduledDateDay = new Date(newScheduledDate);
			scheduledDateDay.setHours(0, 0, 0, 0);

			const startOfWeekDate = startOfWeek(today, { weekStartsOn });
			const endOfWeekDate = endOfWeek(today, { weekStartsOn });

			let newStatus: Task['status'] = 'backlog';
			if (scheduledDateDay.getTime() === today.getTime()) {
				newStatus = 'today';
			} else if (scheduledDateDay >= startOfWeekDate && scheduledDateDay <= endOfWeekDate) {
				newStatus = 'this-week';
			}

			// Update task with new schedule
			await onUpdateTask(task.id, {
				scheduledDate: newScheduledDate.toISOString(),
				startDate: newScheduledDate.toISOString(),
				status: newStatus,
			});
		} catch (error) {
			console.error('Failed to move task:', error);
		}
	};
	// Handle drag over for time slots
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		// Add visual feedback
		const target = e.currentTarget as HTMLElement;
		target.classList.add('bg-primary/20', 'border-primary/50');
	};

	// Handle drag leave for time slots
	const handleDragLeave = (e: React.DragEvent) => {
		const target = e.currentTarget as HTMLElement;
		target.classList.remove('bg-primary/20', 'border-primary/50');
	};

	// Handle task creation
	const handleCreateTask = async () => {
		if (!newTaskData.title.trim() || !newTaskStart) return;

		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const scheduledDate = new Date(newTaskStart);
			scheduledDate.setHours(0, 0, 0, 0);

			const startOfWeekDate = startOfWeek(today, { weekStartsOn });
			const endOfWeekDate = endOfWeek(today, { weekStartsOn });

			let taskStatus: Task['status'] = 'backlog';

			if (scheduledDate.getTime() === today.getTime()) {
				taskStatus = 'today';
			} else if (scheduledDate >= startOfWeekDate && scheduledDate <= endOfWeekDate) {
				taskStatus = 'this-week';
			}

			const taskToCreate = {
				...newTaskData,
				status: taskStatus,
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

	// Handle task editing
	const handleEditTaskSave = async (id: number, updates: Partial<Task>) => {
		try {
			let updatedStatus = updates.status;

			if (updates.scheduledDate) {
				const today = new Date();
				today.setHours(0, 0, 0, 0);

				const scheduledDate = new Date(updates.scheduledDate);
				scheduledDate.setHours(0, 0, 0, 0);

				const startOfWeekDate = startOfWeek(today, { weekStartsOn });
				const endOfWeekDate = endOfWeek(today, { weekStartsOn });

				if (scheduledDate.getTime() === today.getTime()) {
					updatedStatus = 'today';
				} else if (scheduledDate >= startOfWeekDate && scheduledDate <= endOfWeekDate) {
					updatedStatus = 'this-week';
				} else if (updates.status !== 'done') {
					updatedStatus = 'backlog';
				}
			}

			await onUpdateTask(id, {
				...updates,
				status: updatedStatus,
			});
		} catch (error) {
			console.error('Failed to update task:', error);
			throw error;
		}
	};

	const handleEditTaskDelete = async (id: number) => {
		try {
			await onDeleteTask(id);
		} catch (error) {
			console.error('Failed to delete task:', error);
			throw error;
		}
	};

	// Context menu handlers
	const handleTaskEdit = (task: Task) => {
		setEditingTask(task);
		setIsEditingTask(true);
	};

	const handleTaskDuplicate = async (task: Task) => {
		if (onDuplicateTask) {
			await onDuplicateTask(task);
		}
	};

	const handleTaskDelete = async (taskId: number) => {
		await onDeleteTask(taskId);
	};

	const handleTaskToggleComplete = async (task: Task) => {
		const newStatus = task.status === 'done' ? 'today' : 'done';
		const updates: Partial<Task> = {
			status: newStatus,
			completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
			progressPercentage: newStatus === 'done' ? 100 : task.progressPercentage,
		};
		await onUpdateTask(task.id, updates);
	};

	const handleTaskMove = async (task: Task, newStatus: Task['status']) => {
		await onUpdateTask(task.id, { status: newStatus });
	};
	// Navigation handlers
	const handlePrevious = () => {
		if (viewMode === '3-day') {
			setCurrentDate(prev => addDays(prev, -1));
		} else {
			setCurrentDate(prev => addDays(prev, -7));
		}
	};

	const handleNext = () => {
		if (viewMode === '3-day') {
			setCurrentDate(prev => addDays(prev, 1));
		} else {
			setCurrentDate(prev => addDays(prev, 7));
		}
	};

	// Zoom handlers
	const handleZoomIn = () => {
		setZoomLevel(prev => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
	};

	const handleZoomOut = () => {
		setZoomLevel(prev => Math.max(prev - 1, 0));
	};
	// Task card rendering
	const renderTaskCard = (task: Task, isCompleted = false) => (
		<TaskContextMenu task={task}>
			<div
				key={task.id}
				className={`p-3 bg-background rounded-lg border border-border hover:shadow-sm transition-shadow cursor-pointer ${isCompleted ? 'opacity-70' : ''}`}
				draggable={!isCompleted}
				onDragStart={e => {
					if (!isCompleted) {
						e.dataTransfer.setData('text/plain', task.id.toString());
						e.dataTransfer.effectAllowed = 'move';
						setIsDragging(true);
					}
				}}
				onDragEnd={() => setIsDragging(false)}
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
		</TaskContextMenu>
	);

	// Get task color based on priority
	const getTaskColor = (task: Task) => {
		if (task.status === 'done') {
			return 'bg-gray-400 border-gray-500';
		}

		switch (task.priority) {
			case 4:
				return 'bg-red-500 border-red-600';
			case 3:
				return 'bg-orange-500 border-orange-600';
			case 2:
				return 'bg-blue-500 border-blue-600';
			case 1:
				return 'bg-green-500 border-green-600';
			default:
				return 'bg-gray-500 border-gray-600';
		}
	};

	// Context Menu Component
	const TaskContextMenu = ({ task, children }: { task: Task; children: React.ReactNode }) => (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className='w-64'>
				<ContextMenuItem onClick={() => handleTaskEdit(task)}>
					<Edit className='mr-2 h-4 w-4' />
					Edit Task
				</ContextMenuItem>
				{onDuplicateTask && (
					<ContextMenuItem onClick={() => handleTaskDuplicate(task)}>
						<Copy className='mr-2 h-4 w-4' />
						Duplicate Task
					</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				<ContextMenuItem onClick={() => handleTaskToggleComplete(task)}>
					<Check className='mr-2 h-4 w-4' />
					{task.status === 'done' ? 'Mark as Incomplete' : 'Mark as Complete'}
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuSub>
					<ContextMenuSubTrigger>
						<ArrowRight className='mr-2 h-4 w-4' />
						Move to...
					</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						{task.status !== 'backlog' && (
							<ContextMenuItem onClick={() => handleTaskMove(task, 'backlog')}>
								<ArrowLeft className='mr-2 h-4 w-4' />
								Backlog
							</ContextMenuItem>
						)}
						{task.status !== 'this-week' && (
							<ContextMenuItem onClick={() => handleTaskMove(task, 'this-week')}>
								<ArrowUp className='mr-2 h-4 w-4' />
								This Week
							</ContextMenuItem>
						)}
						{task.status !== 'today' && (
							<ContextMenuItem onClick={() => handleTaskMove(task, 'today')}>
								<ArrowUp className='mr-2 h-4 w-4' />
								Today
							</ContextMenuItem>
						)}
						{task.status !== 'done' && (
							<ContextMenuItem onClick={() => handleTaskMove(task, 'done')}>
								<Check className='mr-2 h-4 w-4' />
								Done
							</ContextMenuItem>
						)}
					</ContextMenuSubContent>
				</ContextMenuSub>
				<ContextMenuSeparator />
				<ContextMenuItem
					onClick={() => handleTaskDelete(task.id)}
					className='text-destructive'
				>
					<Trash2 className='mr-2 h-4 w-4' />
					Delete Task
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
	// Scroll to current time function (can be called manually)
	const scrollToCurrentTime = useCallback(() => {
		const container = calendarContainerRef.current;
		if (!container) return;

		const now = new Date();
		const currentHour = now.getHours();
		const currentMinute = now.getMinutes();

		// Calculate the position based on current time
		// Each hour takes up currentZoom.height pixels
		// Each minute within an hour is a fraction of that
		const hourPosition = currentHour * currentZoom.height;
		const minutePosition = (currentMinute / 60) * currentZoom.height;
		const totalPosition = hourPosition + minutePosition;

		// Scroll to position with some offset to show the current time in the upper portion
		const containerHeight = container.clientHeight;
		const targetScroll = Math.max(0, totalPosition - containerHeight / 4);

		console.log('Current time:', `${currentHour}:${currentMinute}`);
		console.log('Zoom height:', currentZoom.height);
		console.log('Total position:', totalPosition);
		console.log('Target scroll:', targetScroll);

		container.scrollTo({
			top: targetScroll,
			behavior: 'smooth',
		});
	}, [currentZoom.height, currentZoom.timeInterval]);

	// Auto-scroll to current time
	useEffect(() => {
		if (!calendarContainerRef.current) return;

		// Add a small delay to ensure the component is fully rendered
		const timeoutId = setTimeout(() => scrollToCurrentTime(), 100);

		return () => clearTimeout(timeoutId);
	}, [currentZoom.height, currentZoom.timeInterval, viewMode, currentDate, scrollToCurrentTime]);

	return (
		<div className='h-screen bg-background flex flex-col overflow-hidden'>
			{/* Header */}
			<div className='flex-shrink-0'>
				<ViewHeader
					board={board}
					currentView='calendar'
					onBack={onBack}
					onViewChange={onViewChange}
					user={user}
					onSignOut={onSignOut}
					onOpenSettings={onOpenSettings}
				/>
			</div>
			{/* Calendar Controls */}
			<div className='flex-shrink-0 flex items-center justify-between p-4 border-b border-border'>
				{' '}
				<h2 className='text-lg font-semibold'>{viewMode === '3-day' ? `${format(currentDate, 'MMM d')} - ${format(addDays(currentDate, 2), 'MMM d, yyyy')}` : `${format(startOfWeek(currentDate, { weekStartsOn }), 'MMM d')} - ${format(endOfWeek(currentDate, { weekStartsOn }), 'MMM d, yyyy')}`}</h2>
				<div className='flex items-center gap-2'>
					{/* Zoom Controls */}
					<div className='flex items-center gap-1 mr-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={handleZoomOut}
							disabled={zoomLevel === 0}
						>
							<ZoomOut className='h-4 w-4' />
						</Button>
						<span className='text-xs text-muted-foreground px-2'>{currentZoom.label}</span>
						<Button
							variant='outline'
							size='sm'
							onClick={handleZoomIn}
							disabled={zoomLevel === ZOOM_LEVELS.length - 1}
						>
							<ZoomIn className='h-4 w-4' />{' '}
						</Button>
					</div>

					{/* Scroll to Now Button */}
					<Button
						variant='outline'
						size='sm'
						onClick={scrollToCurrentTime}
						className='mr-2'
						title='Scroll to current time'
					>
						<Clock className='h-4 w-4 mr-1' />
						Now
					</Button>

					{/* View Mode Toggle */}
					<div className='flex gap-1'>
						{(['3-day', 'week'] as ViewMode[]).map(mode => (
							<Button
								key={mode}
								variant={viewMode === mode ? 'default' : 'outline'}
								size='sm'
								onClick={() => setViewMode(mode)}
								className='capitalize'
							>
								{mode}
							</Button>
						))}
					</div>
				</div>
			</div>{' '}
			{/* Main Content */}
			<div className='flex-1 flex min-h-0 overflow-hidden'>
				{/* Unscheduled Tasks Sidebar */}
				{unscheduledTasks.length > 0 && (
					<div className='w-80 border-r border-border bg-muted/20 flex flex-col overflow-hidden'>
						{' '}
						<div className='flex-shrink-0 p-4 border-b border-border'>
							<h3 className='text-sm font-semibold flex items-center gap-2'>
								<CalendarIcon className='h-4 w-4' />
								Unscheduled Tasks ({unscheduledTasks.length})
							</h3>
							{isDragging && <p className='text-xs text-muted-foreground mt-1'>Drop on a time slot to schedule the task</p>}
						</div>
						<div className='flex-1 p-4 overflow-y-auto'>
							<div className='space-y-2'>{unscheduledTasks.map(task => renderTaskCard(task, false))}</div>
						</div>
					</div>
				)}{' '}
				{/* Calendar Grid */}
				<div className='flex-1 flex flex-col min-h-0 overflow-hidden'>
					{/* Calendar Header */}
					<div className='flex border-b border-border bg-muted/30 flex-shrink-0 items-center'>
						<div className='w-16 border-r border-border p-2 text-xs text-muted-foreground text-center'>Time</div>
						<Button
							variant='ghost'
							size='lg'
							onClick={handlePrevious}
						>
							<ChevronLeft />
						</Button>
						{visibleDates.map((date, index) => (
							<div
								key={index}
								className='flex-1  p-2 text-center'
							>
								{' '}
								<div className={`text-sm font-medium ${isToday(date) ? 'text-primary' : ''}`}>{format(date, viewMode === '3-day' ? 'EEEE' : 'EEE')}</div>
								<div className={`text-xs ${isToday(date) ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{format(date, viewMode === '3-day' ? 'MMM d' : 'd')}</div>
							</div>
						))}
						<Button
							variant='ghost'
							size='lg'
							onClick={handleNext}
						>
							<ChevronRight />
						</Button>
					</div>
					{/* Calendar Body */}
					<div
						className='flex-1 overflow-y-auto min-h-0'
						ref={calendarContainerRef}
					>
						<div className='flex min-h-full'>
							{/* Time Labels */}
							<div className='w-16 border-r border-border bg-muted/10'>
								{timeSlots.map((slot, index) => (
									<div
										key={index}
										className='border-b border-border text-xs text-muted-foreground text-center py-1'
										style={{ height: `${currentZoom.height}px` }}
									>
										{slot.minute === 0 ? slot.label : ''}
									</div>
								))}
							</div>

							{/* Calendar Days */}
							{visibleDates.map((date, dateIndex) => (
								<div
									key={dateIndex}
									className='flex-1 border-r border-border relative'
								>
									{' '}
									{/* Time Slots */}
									{timeSlots.map((slot, slotIndex) => (
										<div
											key={slotIndex}
											className={`border-b border-border hover:bg-muted/20 cursor-pointer transition-colors ${isDragging ? 'border-dashed border-primary/30 hover:bg-primary/10' : ''}`}
											style={{ height: `${currentZoom.height}px` }}
											onClick={() => handleTimeSlotClick(date, slot.hour, slot.minute)}
											onDragOver={handleDragOver}
											onDragLeave={handleDragLeave}
											onDrop={e => {
												e.preventDefault();
												const target = e.currentTarget as HTMLElement;
												target.classList.remove('bg-primary/20', 'border-primary/50');
												const taskId = e.dataTransfer.getData('text/plain');
												if (taskId) {
													handleTaskDrop(date, slot.hour, slot.minute, taskId);
												}
											}}
										>
											{/* Current time indicator */}
											{isToday(date) &&
												(() => {
													const now = new Date();
													const currentHour = now.getHours();
													const currentMinute = now.getMinutes();

													if (slot.hour === currentHour && ((currentZoom.timeInterval === 60 && slot.minute === 0) || (currentZoom.timeInterval === 30 && Math.abs(slot.minute - (currentMinute >= 30 ? 30 : 0)) < 15))) {
														const offsetMinutes = currentMinute - slot.minute;
														const offsetPixels = (offsetMinutes / currentZoom.timeInterval) * currentZoom.height;

														return (
															<div
																className='absolute left-0 right-0 h-0.5 bg-red-500 z-10'
																style={{ top: `${offsetPixels}px` }}
															/>
														);
													}
													return null;
												})()}
										</div>
									))}{' '}
									{/* Events */}
									{events
										.filter(event => isSameDay(event.start, date))
										.map(event => {
											const position = getEventPosition(event, dateIndex);
											const colorClass = getTaskColor(event.task);

											// Better responsive breakpoints
											const isVerySmall = position.height < 30;
											const isSmall = position.height < 50;
											const isMedium = position.height >= 50 && position.height < 80;
											const isLarge = position.height >= 80;

											return (
												<TaskContextMenu
													key={event.id}
													task={event.task}
												>
													<div
														className={`absolute left-1 right-1 ${colorClass} text-white rounded cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 overflow-hidden ${isVerySmall ? 'hover:scale-105' : 'hover:scale-[1.02]'}`}
														style={{
															top: `${position.top}px`,
															height: `${position.height}px`,
															zIndex: 5,
														}}
														draggable={event.task.status !== 'done'}
														onDragStart={e => {
															if (event.task.status !== 'done') {
																e.dataTransfer.setData('text/plain', event.task.id.toString());
																e.dataTransfer.effectAllowed = 'move';
																setIsDragging(true);
															}
														}}
														onDragEnd={() => setIsDragging(false)}
														onClick={() => {
															setEditingTask(event.task);
															setIsEditingTask(true);
														}}
													>
														{/* Very Small Cards (< 30px) - Just title, minimal padding */}
														{isVerySmall && (
															<div className='px-1.5 py-0.5 h-full flex items-center'>
																<div className='text-xs font-medium truncate leading-none'>{event.title}</div>
																{event.task.status === 'done' && <CheckCircle className='h-3 w-3 text-green-300 ml-1 flex-shrink-0' />}
															</div>
														)}

														{/* Small Cards (30-50px) - Title + time on same line */}
														{isSmall && !isVerySmall && (
															<div className='p-1.5 h-full flex flex-col justify-center'>
																<div className='flex items-center justify-between'>
																	<div className='text-xs font-semibold truncate flex-1 leading-tight'>{event.title}</div>
																	{event.task.status === 'done' && <CheckCircle className='h-3 w-3 text-green-300 ml-1 flex-shrink-0' />}
																</div>
																<div className='text-xs opacity-90 leading-none mt-0.5'>{format(event.start, 'h:mm a')}</div>
															</div>
														)}

														{/* Medium Cards (50-80px) - Title, time, basic info */}
														{isMedium && (
															<div className='p-2 h-full flex flex-col'>
																<div className='flex items-start justify-between mb-1'>
																	<div className='font-semibold text-sm leading-tight truncate flex-1'>{event.title}</div>
																	{event.task.status === 'done' && <CheckCircle className='h-4 w-4 text-green-300 ml-1 flex-shrink-0' />}
																</div>
																<div className='text-xs opacity-90 mb-1'>
																	{format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
																</div>
																<div className='mt-auto flex items-center justify-between text-xs'>
																	{event.task.timeEstimate && event.task.timeEstimate > 0 && (
																		<div className='flex items-center gap-1 opacity-90'>
																			<Clock className='h-3 w-3' />
																			<span>{event.task.timeEstimate}m</span>
																		</div>
																	)}
																</div>
															</div>
														)}

														{/* Large Cards (80px+) - Full info */}
														{isLarge && (
															<div className='p-2 h-full flex flex-col'>
																<div className='flex items-start justify-between mb-1'>
																	<div className='font-semibold text-sm leading-tight truncate flex-1'>{event.title}</div>
																	{event.task.status === 'done' && <CheckCircle className='h-4 w-4 text-green-300 ml-1 flex-shrink-0' />}
																</div>

																<div className='text-xs opacity-90 mb-2'>
																	{format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
																</div>

																{event.task.description && <div className='text-xs opacity-85 line-clamp-2 mb-2 leading-relaxed flex-1'>{event.task.description}</div>}

																<div className='mt-auto flex items-center justify-between text-xs opacity-90'>
																	<div className='flex items-center gap-1'>
																		{event.task.timeEstimate && event.task.timeEstimate > 0 && (
																			<>
																				<Clock className='h-3 w-3' />
																				<span>{event.task.timeEstimate}m</span>
																			</>
																		)}
																	</div>
																	<div className={`px-1.5 py-0.5 rounded text-xs font-medium ${event.task.status === 'done' ? 'bg-green-500/20 text-green-100' : event.task.status === 'today' ? 'bg-orange-500/20 text-orange-100' : event.task.status === 'this-week' ? 'bg-blue-500/20 text-blue-100' : 'bg-gray-500/20 text-gray-100'}`}>{event.task.status === 'this-week' ? 'This Week' : event.task.status}</div>
																</div>
															</div>
														)}
													</div>
												</TaskContextMenu>
											);
										})}
								</div>
							))}
						</div>
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
						<DialogDescription>{newTaskStart && `Scheduled for ${format(newTaskStart, 'EEEE, MMMM d, yyyy [at] h:mm a')}`}</DialogDescription>
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
			{/* Task Edit Dialog */}
			<TaskEditDialog
				task={editingTask}
				isOpen={isEditingTask}
				onClose={() => {
					setEditingTask(null);
					setIsEditingTask(false);
				}}
				onSave={handleEditTaskSave}
				onDelete={handleEditTaskDelete}
			/>
		</div>
	);
}
