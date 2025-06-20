import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday, addMinutes, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Task, Board } from '@/types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle, ZoomIn, ZoomOut, Edit, Copy, Trash2, ArrowLeft, ArrowRight, ArrowUp, Check, AlertTriangle, X, Repeat, Cloud, RefreshCw } from 'lucide-react';
import { getGoogleCalendarService } from '@/lib/googleCalendar';
import { TaskEditDialog } from '@/components/ui/task-edit-dialog';
import { UnifiedHeader } from '@/components/ui/unified-header';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { generateRecurringInstances } from '@/lib/recurring-tasks';
import { recurringInstanceDatabase } from '@/lib/recurring-instance-database';
import { Calendar as CalendarUI } from '@/components/ui/calendar';

interface CompactCalendarViewProps {
	board: Board;
	tasks: Task[];
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
	onViewChange?: (board: Board, viewType: 'kanban' | 'calendar' | 'list') => Promise<void>;
	onOpenSettings?: () => void;
	userPreferences?: any;
	onManualSyncTask?: (task: Task) => Promise<void>;
	onManualUnsyncTask?: (task: Task) => Promise<void>;
}

interface CalendarEvent {
	id: string;
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

export function CompactCalendarView({ board, tasks, onAddTask, onUpdateTask, onDeleteTask, onDuplicateTask, isAllTasksBoard = false, boards, user, onSignOut, onViewChange, onOpenSettings, userPreferences, onManualSyncTask, onManualUnsyncTask }: CompactCalendarViewProps) {
	// Apply user preferences
	const { filterTasks, weekStartsOn, calendarDefaultZoom, calendarDefaultView, formatDate } = useUserPreferences(userPreferences);

	// Google Calendar sync state
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncError, setSyncError] = useState<string | null>(null);

	// Check Google Calendar status
	const getGoogleCalendarStatus = useCallback(() => {
		const service = getGoogleCalendarService();
		// Use user preferences if available, otherwise fallback to localStorage
		const autoSync = userPreferences?.googleCalendarAutoSync || 
			localStorage.getItem('google_calendar_auto_sync') === 'true';
		const isAuthenticated = service?.isUserAuthenticated() || false;
		
		return {
			isAuthenticated,
			autoSync,
			hasManualSync: !!(onManualSyncTask && onManualUnsyncTask)
		};
	}, [onManualSyncTask, onManualUnsyncTask, userPreferences]);

	// Bulk sync functionality
	const handleBulkSync = useCallback(async () => {
		if (!onManualSyncTask) return;

		setIsSyncing(true);
		setSyncError(null);

		try {
			// Get all scheduled tasks that aren't already synced
			const boardFilteredTasks = isAllTasksBoard ? tasks : tasks.filter(task => task.boardId === board.id);
			const scheduledTasks = boardFilteredTasks.filter(task => 
				(task.scheduledDate || task.startDate) && !task.googleCalendarSynced
			);

			if (scheduledTasks.length === 0) {
				setSyncError('No unsynced scheduled tasks found');
				return;
			}

			// Sync all tasks
			const results = await Promise.allSettled(
				scheduledTasks.map(task => onManualSyncTask(task))
			);

			const successful = results.filter(result => result.status === 'fulfilled').length;
			const failed = results.filter(result => result.status === 'rejected').length;

			if (failed > 0) {
				setSyncError(`Synced ${successful} tasks, ${failed} failed`);
			}
		} catch (error) {
			setSyncError('Failed to sync tasks to Google Calendar');
			console.error('Bulk sync error:', error);
		} finally {
			setIsSyncing(false);
		}
	}, [onManualSyncTask, tasks, isAllTasksBoard, board.id]);

	// State to force re-render when recurring instances are updated
	const [recurringInstancesVersion, setRecurringInstancesVersion] = useState(0);
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [isLoadingEvents, setIsLoadingEvents] = useState(false);

	// Helper function to format time according to user preference
	const formatTime = (date: Date) => {
		const timeFormat = userPreferences?.timeFormat || '12h';
		if (timeFormat === '24h') {
			return format(date, 'HH:mm');
		} else {
			return format(date, 'h:mm a');
		}
	};

	// Priority colors and display
	const getPriorityColor = (priority: Task['priority']) => {
		switch (priority) {
			case 4:
				return 'bg-red-500'; // Urgent
			case 3:
				return 'bg-orange-500'; // High
			case 2:
				return 'bg-blue-500'; // Medium
			case 1:
				return 'bg-gray-400'; // Low
			default:
				return 'bg-gray-400';
		}
	};

	const [currentDate, setCurrentDate] = useState(new Date());
	const [viewMode, setViewMode] = useState<ViewMode>(calendarDefaultView);
	const [zoomLevel, setZoomLevel] = useState(calendarDefaultZoom);
	const [isCreatingTask, setIsCreatingTask] = useState(false);
	const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [isEditingTask, setIsEditingTask] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [isCreatingDetailedTask, setIsCreatingDetailedTask] = useState(false);
	const [newTaskData, setNewTaskData] = useState({
		title: '',
		description: '',
		timeEstimate: 60,
		priority: 2 as 1 | 2 | 3 | 4,
		status: 'backlog' as Task['status'],
	});
	const calendarContainerRef = useRef<HTMLDivElement>(null);

	// Date picker state
	const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
	const [selectedTaskForDatePicker, setSelectedTaskForDatePicker] = useState<Task | null>(null);

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

	// Generate calendar events
	useEffect(() => {
		const generateEvents = async () => {
			try {
				// First filter by board if not viewing all tasks
				const boardFilteredTasks = isAllTasksBoard ? tasks : tasks.filter(task => task.boardId === board.id);

				const filteredTasks = filterTasks(boardFilteredTasks);
				const allEvents: CalendarEvent[] = [];

				// Limit the number of tasks we process to prevent performance issues
				const tasksToProcess = filteredTasks.filter(task => task.scheduledDate || task.startDate || task.dueDate).slice(0, 100);

				for (const task of tasksToProcess) {
					try {
						// Generate recurring instances if the task is recurring
						let instances: Task[] = [task];
						
						if (task.recurring && task.recurring.pattern && ['daily', 'weekly', 'monthly', 'yearly'].includes(task.recurring.pattern)) {
							// Add safety limit for recurring instances
							const maxInstances = 100;
							try {
								const allInstances = await generateRecurringInstances(
									task, 
									startOfDay(visibleDates[0]), 
									endOfDay(visibleDates[visibleDates.length - 1])
								);
								instances = allInstances.slice(0, maxInstances);
							} catch (error) {
								console.error('Failed to generate recurring instances for task:', task.title, error);
								// Fallback to single instance if recurring generation fails
								instances = [task];
							}
						}

						instances.forEach(instance => {
							let start: Date;
							let end: Date;

							if (instance.scheduledDate) {
								start = new Date(instance.scheduledDate);
							} else if (instance.startDate) {
								start = new Date(instance.startDate);
							} else if (instance.dueDate) {
								start = new Date(instance.dueDate);
							} else {
								start = new Date();
							}

							// Validate the date
							if (isNaN(start.getTime())) {
								console.warn('Invalid date for task:', instance.title);
								return;
							}

							// Calculate end time based on time estimate
							end = new Date(start);
							if (instance.timeEstimate && instance.timeEstimate > 0) {
								end = addMinutes(start, instance.timeEstimate);
							} else {
								end = addMinutes(start, 60); // Default 1 hour
							}

							// If task has both start and due date, use them
							if (instance.startDate && instance.dueDate) {
								const startDateObj = new Date(instance.startDate);
								const endDateObj = new Date(instance.dueDate);
								if (!isNaN(startDateObj.getTime()) && !isNaN(endDateObj.getTime())) {
									start = startDateObj;
									end = endDateObj;
								}
							}

							// Create unique ID for calendar events to avoid duplicate keys with recurring tasks
							const uniqueEventId = `${instance.id}-${start.getTime()}`;
							
							allEvents.push({
								id: uniqueEventId,
								task: instance,
								start,
								end,
								title: instance.title || 'Untitled Task',
							});
						});
					} catch (error) {
						console.error('Error processing task:', task.title, error);
						// Continue with next task instead of failing completely
					}
				}

				// Filter events to only show those within visible dates
				const filteredEvents = allEvents.filter(event => {
					try {
						return visibleDates.some(date => 
							isSameDay(event.start, date) || 
							isSameDay(event.end, date) || 
							(event.start <= startOfDay(date) && event.end >= endOfDay(date))
						);
					} catch (error) {
						console.error('Error filtering event:', event.title, error);
						return false;
					}
				});

				setEvents(filteredEvents);
			} catch (error) {
				console.error('Error generating calendar events:', error);
				setEvents([]);
			} finally {
				setIsLoadingEvents(false);
			}
		};

		// Add a small delay to prevent blocking the UI
		const timeoutId = setTimeout(() => {
			setIsLoadingEvents(true);
			generateEvents();
		}, 10);

		return () => clearTimeout(timeoutId);
	}, [tasks, filterTasks, visibleDates, isAllTasksBoard, board.id, recurringInstancesVersion]);
	// Get unscheduled tasks
	const unscheduledTasks = useMemo(() => {
		// First filter by board if not viewing all tasks
		const boardFilteredTasks = isAllTasksBoard ? tasks : tasks.filter(task => task.boardId === board.id);

		const allUnscheduledTasks = boardFilteredTasks.filter(task => !task.scheduledDate && !task.startDate && !task.dueDate && task.status !== 'done');
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
			case 'dueDate': {
				const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
				const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
				comparison = aDate - bDate;
				break;
			}
			case 'created': {
				const aCreated = new Date(a.createdAt).getTime();
				const bCreated = new Date(b.createdAt).getTime();
				comparison = bCreated - aCreated;
				break;
			}
			case 'alphabetical':
				comparison = a.title.localeCompare(b.title);
				break;
			default:
				comparison = 0;
		}

			return sortOrder === 'desc' ? -comparison : comparison;
		});
	}, [tasks, filterTasks, userPreferences?.taskSortBy, userPreferences?.taskSortOrder, isAllTasksBoard, board.id]); // Generate time slots for the day
	const timeSlots = useMemo(() => {
		const slots = [];
		const startHour = 0; // Start at 12 AM (midnight)
		const endHour = 23; // End at 11 PM
		const interval = currentZoom.timeInterval;
		const timeFormat = userPreferences?.timeFormat || '12h';

		for (let hour = startHour; hour <= endHour; hour++) {
			if (interval === 30) {
				const hourDate = new Date().setHours(hour, 0);
				const halfHourDate = new Date().setHours(hour, 30);

				if (timeFormat === '24h') {
					slots.push({ hour, minute: 0, label: format(hourDate, 'HH:mm') });
					if (hour < endHour) {
						slots.push({ hour, minute: 30, label: format(halfHourDate, 'HH:mm') });
					}
				} else {
					slots.push({ hour, minute: 0, label: format(hourDate, 'h:mm a') });
					if (hour < endHour) {
						slots.push({ hour, minute: 30, label: format(halfHourDate, 'h:mm a') });
					}
				}
			} else {
				const hourDate = new Date().setHours(hour, 0);
				if (timeFormat === '24h') {
					slots.push({ hour, minute: 0, label: format(hourDate, 'HH:mm') });
				} else {
					slots.push({ hour, minute: 0, label: format(hourDate, 'h a') });
				}
			}
		}

		return slots;
	}, [currentZoom.timeInterval, userPreferences?.timeFormat]);
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
		setNewTaskDate(clickedTime);
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
		if (!newTaskData.title.trim() || !newTaskDate) return;

		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const scheduledDate = new Date(newTaskDate);
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
				scheduledDate: newTaskDate.toISOString(),
				startDate: newTaskDate.toISOString(),
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
			setNewTaskDate(null);
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
		// Handle recurring task instances
		if (task.recurring && task.recurringInstanceId) {
			const isCurrentlyCompleted = task.status === 'done';
			const instanceDate = (task.scheduledDate || new Date().toISOString()).split('T')[0]; // Get just the date part

			try {
				if (isCurrentlyCompleted) {
					// Mark this instance as incomplete
					await recurringInstanceDatabase.markInstanceIncomplete(task.id, instanceDate);
				} else {
					// Mark this instance as completed
					await recurringInstanceDatabase.markInstanceCompleted(task.id, instanceDate);
				}

				// Force a re-render by incrementing the version
				setRecurringInstancesVersion(prev => prev + 1);
			} catch (error) {
				console.error('Error updating recurring instance:', error);
			}
			return;
		}

		// Handle regular tasks
		const newStatus = task.status === 'done' ? 'today' : 'done';
		const updates: Partial<Task> = {
			status: newStatus,
			completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
			progressPercentage: newStatus === 'done' ? 100 : task.progressPercentage,
		};
		await onUpdateTask(task.id, updates);
	};

	// Handle checkbox click without triggering card click
	const handleCheckboxClick = (e: React.MouseEvent, task: Task) => {
		e.stopPropagation(); // Prevent opening edit dialog
		handleTaskToggleComplete(task);
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
					{' '}
					<div className='flex-1 min-w-0'>
						{' '}
						<div className='flex items-center gap-2'>
							{isCompleted && <CheckCircle className='h-4 w-4 text-green-600 flex-shrink-0' />}
							<div className={`w-5 h-5 rounded-full ${getPriorityColor(task.priority)} text-white text-xs flex items-center justify-center font-bold flex-shrink-0`}>{task.priority}</div>
							<h4 className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{task.title}</h4>
						</div>
						{task.description && <p className={`text-xs mt-1 line-clamp-2 ${isCompleted ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{task.description}</p>}
						<div className='flex items-center gap-2 mt-2 text-xs text-muted-foreground'>
							<span className={`px-2 py-1 rounded-full text-xs font-medium ${task.status === 'done' ? 'bg-green-100 text-green-800' : task.status === 'today' ? 'bg-red-100 text-red-800' : task.status === 'this-week' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{task.status.replace(/-/g, ' ')}</span>
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

	// Enhanced Context Menu Component with quick actions
	const TaskContextMenu = ({ task, children }: { task: Task; children: React.ReactNode }) => {
		// Quick action handlers
		const handleQuickPriority = async (priority: 1 | 2 | 3 | 4) => {
			await onUpdateTask(task.id, { priority });
		};

		const handleQuickTime = async (minutes: number) => {
			await onUpdateTask(task.id, { timeEstimate: minutes });
		};

		const handleSetRecurringPattern = async (pattern: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
			const newRecurring = {
				pattern,
				interval: 1,
				daysOfWeek: [],
				daysOfMonth: [],
				monthsOfYear: [],
			};
			await onUpdateTask(task.id, { recurring: newRecurring });
		};

		const handleClearRecurring = async () => {
			await onUpdateTask(task.id, { recurring: undefined });
		};

		const handleScheduleToday = async () => {
			const today = new Date();
			today.setHours(9, 0, 0, 0); // Default to 9 AM
			await onUpdateTask(task.id, {
				scheduledDate: today.toISOString(),
				status: 'today',
			});
		};

		const handleScheduleTomorrow = async () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM
			await onUpdateTask(task.id, {
				scheduledDate: tomorrow.toISOString(),
				status: 'this-week',
			});
		};

		const handleScheduleThisWeekend = async () => {
			const now = new Date();
			const saturday = new Date(now);
			const daysUntilSaturday = (6 - now.getDay()) % 7;
			saturday.setDate(now.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
			saturday.setHours(10, 0, 0, 0); // Default to 10 AM on Saturday
			await onUpdateTask(task.id, {
				scheduledDate: saturday.toISOString(),
				status: 'this-week',
			});
		};

		const handleClearSchedule = async () => {
			await onUpdateTask(task.id, {
				scheduledDate: undefined,
				startDate: undefined,
				dueDate: undefined,
			});
		};

		return (
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

					{/* Priority submenu */}
					<ContextMenuSub key="priority-submenu">
						<ContextMenuSubTrigger>
							<AlertTriangle className='mr-2 h-4 w-4' />
							Priority
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							<ContextMenuItem onClick={() => handleQuickPriority(4)}>
								<div className='flex items-center gap-2'>
									<div className='w-3 h-3 rounded-full bg-red-500'></div>
									Critical (4)
								</div>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => handleQuickPriority(3)}>
								<div className='flex items-center gap-2'>
									<div className='w-3 h-3 rounded-full bg-orange-500'></div>
									High (3)
								</div>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => handleQuickPriority(2)}>
								<div className='flex items-center gap-2'>
									<div className='w-3 h-3 rounded-full bg-yellow-500'></div>
									Medium (2)
								</div>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => handleQuickPriority(1)}>
								<div className='flex items-center gap-2'>
									<div className='w-3 h-3 rounded-full bg-green-500'></div>
									Low (1)
								</div>
							</ContextMenuItem>
						</ContextMenuSubContent>
					</ContextMenuSub>

					{/* Time Estimate submenu */}
					<ContextMenuSub key="time-estimate-submenu">
						<ContextMenuSubTrigger>
							<Clock className='mr-2 h-4 w-4' />
							Time Estimate
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							<ContextMenuItem onClick={() => handleQuickTime(15)}>15 minutes</ContextMenuItem>
							<ContextMenuItem onClick={() => handleQuickTime(30)}>30 minutes</ContextMenuItem>
							<ContextMenuItem onClick={() => handleQuickTime(60)}>1 hour</ContextMenuItem>
							<ContextMenuItem onClick={() => handleQuickTime(120)}>2 hours</ContextMenuItem>
							<ContextMenuItem onClick={() => handleQuickTime(240)}>4 hours</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem onClick={() => handleQuickTime(0)}>Clear</ContextMenuItem>
						</ContextMenuSubContent>
					</ContextMenuSub>

					{/* Schedule submenu with date picker */}
					<ContextMenuSub key="schedule-submenu">
						<ContextMenuSubTrigger>
							<CalendarIcon className='mr-2 h-4 w-4' />
							Schedule
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							<ContextMenuItem
								onSelect={e => {
									e.preventDefault();
									e.stopPropagation();
									setSelectedTaskForDatePicker(task);
									setIsDateDialogOpen(true);
								}}
							>
								<CalendarIcon className='mr-2 h-4 w-4' />
								Pick a date...
							</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem onClick={handleScheduleToday}>
								<CalendarIcon className='mr-2 h-4 w-4' />
								Today (9 AM)
							</ContextMenuItem>
							<ContextMenuItem onClick={handleScheduleTomorrow}>
								<CalendarIcon className='mr-2 h-4 w-4' />
								Tomorrow (9 AM)
							</ContextMenuItem>
							<ContextMenuItem onClick={handleScheduleThisWeekend}>
								<CalendarIcon className='mr-2 h-4 w-4' />
								This Weekend (10 AM)
							</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem onClick={handleClearSchedule}>
								<X className='mr-2 h-4 w-4' />
								Clear Schedule
							</ContextMenuItem>
						</ContextMenuSubContent>
					</ContextMenuSub>

					{/* Recurring pattern submenu */}
					<ContextMenuSub key="recurring-submenu">
						<ContextMenuSubTrigger>
							<Repeat className='mr-2 h-4 w-4' />
							Recurring
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							<ContextMenuItem onClick={() => handleSetRecurringPattern('daily')}>Daily</ContextMenuItem>
							<ContextMenuItem onClick={() => handleSetRecurringPattern('weekly')}>Weekly</ContextMenuItem>
							<ContextMenuItem onClick={() => handleSetRecurringPattern('monthly')}>Monthly</ContextMenuItem>
							<ContextMenuItem onClick={() => handleSetRecurringPattern('yearly')}>Yearly</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem onClick={handleClearRecurring}>Clear Recurring</ContextMenuItem>
						</ContextMenuSubContent>
					</ContextMenuSub>

					<ContextMenuSeparator />

					{/* Move to submenu */}
					<ContextMenuSub key="move-to-submenu">
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
	};
	// Scroll to current time function (can be called manually)
	const scrollToCurrentTime = useCallback(() => {
		const container = calendarContainerRef.current;
		if (!container) return;

		const now = new Date();

		// Calculate scroll position based on current time
		const currentHour = now.getHours();
		const currentMinute = now.getMinutes();

		// Calculate total minutes since midnight
		const totalMinutes = currentHour * 60 + currentMinute;

		// Calculate the scroll position
		// Each hour takes up currentZoom.height pixels
		// Each minute is a fraction of that height
		const minutesPerPixel = currentZoom.timeInterval / currentZoom.height;
		const scrollPosition = totalMinutes / minutesPerPixel;

		// Add some offset to show the current time in the upper portion of the view
		const containerHeight = container.clientHeight;
		const targetScroll = Math.max(0, scrollPosition - containerHeight / 3);

		container.scrollTo({
			top: targetScroll,
			behavior: 'smooth',
		});
	}, [currentZoom.height, currentZoom.timeInterval]);

	// Function to navigate to today and scroll to current time
	const goToToday = useCallback(() => {
		const now = new Date();
		setCurrentDate(now);
		// Scroll after a brief delay to ensure the date change has been processed
		setTimeout(() => scrollToCurrentTime(), 50);
	}, [scrollToCurrentTime]);

	// Auto-scroll to current time only on initial mount
	useEffect(() => {
		if (!calendarContainerRef.current) return;

		// Add a small delay to ensure the component is fully rendered
		const timeoutId = setTimeout(() => scrollToCurrentTime(), 100);

		return () => clearTimeout(timeoutId);
	}, [scrollToCurrentTime]); // Include scrollToCurrentTime in dependencies

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
			status: updates.status || 'backlog',
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

	return (
		<div className='h-screen bg-background flex flex-col overflow-hidden'>
			{/* Header */}
			<div className='flex-shrink-0'>
				<UnifiedHeader
					title={board.name}
					subtitle={board.description}
					board={board}
					currentView='calendar'
					tasks={tasks}
					boards={boards}
					userPreferences={userPreferences}
					onViewChange={onViewChange}
					onCreateDetailedTask={handleCreateDetailedTaskFromHeader}
					user={user}
					onSignOut={onSignOut}
					onOpenSettings={onOpenSettings}
				>
					<div className='flex items-center gap-2'>
						{/* Date Range Display */}
						<h2 className='text-sm font-medium mr-3'>{viewMode === '3-day' ? `${formatDate(currentDate)} - ${formatDate(addDays(currentDate, 2))}` : `${formatDate(startOfWeek(currentDate, { weekStartsOn }))} - ${formatDate(endOfWeek(currentDate, { weekStartsOn }))}`}</h2>

						<div className='flex items-center gap-1 mr-2'>
							<Button
								variant='outline'
								size='sm'
								onClick={handleZoomOut}
								disabled={zoomLevel === 0}
								className='h-7 w-7 p-0'
							>
								<ZoomOut className='h-3.5 w-3.5' />
							</Button>
							<span className='text-xs text-muted-foreground px-2'>{currentZoom.label}</span>
							<Button
								variant='outline'
								size='sm'
								onClick={handleZoomIn}
								disabled={zoomLevel === ZOOM_LEVELS.length - 1}
								className='h-7 w-7 p-0'
							>
								<ZoomIn className='h-3.5 w-3.5' />
							</Button>
						</div>

						<Button
							variant='outline'
							size='sm'
							onClick={goToToday}
							className='mr-2 gap-1.5'
							title='Go to today and scroll to current time'
						>
							<Clock className='h-3.5 w-3.5' />
							Now
						</Button>

						{/* View Mode Toggle */}
						<div className='flex gap-1 mr-2 bg-muted/30 p-1 rounded-lg border border-border/50'>
							{(['3-day', 'week'] as ViewMode[]).map(mode => (
								<Button
									key={mode}
									variant={viewMode === mode ? 'default' : 'ghost'}
									size='sm'
									onClick={() => setViewMode(mode)}
									className='capitalize h-7'
								>
									{mode}
								</Button>
							))}
						</div>

						{/* Google Calendar Sync */}
						{(() => {
							const status = getGoogleCalendarStatus();
							
							if (!status.isAuthenticated) return null;
							
							if (!status.autoSync && status.hasManualSync) {
								const scheduledTasksCount = (isAllTasksBoard ? tasks : tasks.filter(task => task.boardId === board.id))
									.filter(task => (task.scheduledDate || task.startDate) && !task.googleCalendarSynced).length;
								
								return (
									<div className='flex items-center gap-2'>
																<Button
							variant='outline'
							size='sm'
							onClick={handleBulkSync}
							disabled={isSyncing || scheduledTasksCount === 0}
							className='gap-1.5'
							title={scheduledTasksCount === 0 ? 'No unsynced scheduled tasks' : `Sync ${scheduledTasksCount} scheduled tasks to Google Calendar`}
						>
							{isSyncing ? (
								<RefreshCw className='h-3.5 w-3.5 animate-spin' />
							) : (
								<Cloud className='h-3.5 w-3.5' />
							)}
							{isSyncing ? 'Syncing...' : `Sync (${scheduledTasksCount})`}
						</Button>
										{syncError && (
											<span className='text-xs text-red-600 max-w-40 truncate' title={syncError}>
												{syncError}
											</span>
										)}
									</div>
								);
							}
							
							if (status.autoSync) {
								return (
									<div className='flex items-center gap-2 text-xs text-muted-foreground'>
										<Cloud className='h-4 w-4 text-green-600' />
										Auto-sync enabled
									</div>
								);
							}
							
							return null;
						})()}
					</div>
				</UnifiedHeader>
			</div>

			{/* Main Content */}
			<div className='flex-1 flex min-h-0 overflow-hidden'>
				{/* Calendar Grid */}
				<div className='flex-1 flex flex-col min-h-0 overflow-hidden'>
					{/* Calendar Header */}
					<div className='flex border-b border-border bg-muted/30 flex-shrink-0 items-center'>
						<div className='w-16 border-r border-border p-2 text-xs text-muted-foreground text-center'>Time</div>
						<Button
							variant='ghost'
							size='sm'
							onClick={handlePrevious}
							className='h-8 w-8 p-0'
						>
							<ChevronLeft className='h-4 w-4' />
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
							size='sm'
							onClick={handleNext}
							className='h-8 w-8 p-0'
						>
							<ChevronRight className='h-4 w-4' />
						</Button>
					</div>
					{/* Calendar Body */}
					<div
						className='flex-1 overflow-y-auto min-h-0 relative'
						ref={calendarContainerRef}
					>
						{/* Loading indicator */}
						{isLoadingEvents && (
							<div className='absolute inset-0 bg-background/50 flex items-center justify-center z-50'>
								<div className='flex items-center gap-2 text-sm text-muted-foreground'>
									<div className='w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin' />
									Loading events...
								</div>
							</div>
						)}
						<div className='flex min-h-full'>
							{/* Time Labels */}
							<div className='w-16 border-r border-border bg-muted/10'>
								{timeSlots.map((slot, index) => (
									<div
										key={index}
										className='time-slot border-b border-border text-xs text-muted-foreground text-center py-1'
										style={{ height: `${currentZoom.height}px` }}
										data-hour={slot.hour}
										data-minute={slot.minute}
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
									))}
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
																<div className='text-xs font-medium truncate leading-none flex items-center gap-1'>
																	{event.task.recurring && <Repeat className='h-2.5 w-2.5 opacity-60' />}
																	{event.title}
																</div>
																{event.task.status === 'done' && <CheckCircle className='h-3 w-3 text-green-300 ml-1 flex-shrink-0' />}
															</div>
														)}

														{/* Small Cards (30-50px) - Title + time on same line */}
														{isSmall && !isVerySmall && (
															<div className='p-1.5 h-full flex flex-col justify-center'>
																<div className='flex items-center justify-between'>
																	<div className='text-xs font-semibold truncate flex-1 leading-tight flex items-center gap-1'>
																		{event.task.recurring && <Repeat className='h-2.5 w-2.5 opacity-60' />}
																		{event.title}
																	</div>
																	<button
																		onClick={e => handleCheckboxClick(e, event.task)}
																		className={`ml-1 flex-shrink-0 w-3 h-3 rounded-sm border transition-all duration-200 flex items-center justify-center ${event.task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-white/50 hover:border-white hover:bg-white/10'}`}
																		title={event.task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
																	>
																		{event.task.status === 'done' && <CheckCircle className='h-2.5 w-2.5' />}
																	</button>
																</div>
																<div className='text-xs opacity-90 leading-none mt-0.5'>{formatTime(event.start)}</div>
															</div>
														)}

														{/* Medium Cards (50-80px) - Title, time, basic info */}
														{isMedium && (
															<div className='p-2 h-full flex flex-col'>
																<div className='flex items-start justify-between mb-1'>
																	<div className='font-semibold text-sm leading-tight truncate flex-1 flex items-center gap-1'>
																		{event.task.recurring && <Repeat className='h-3 w-3 opacity-60' />}
																		{event.title}
																	</div>
																	<button
																		onClick={e => handleCheckboxClick(e, event.task)}
																		className={`ml-1 flex-shrink-0 w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center ${event.task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-white/50 hover:border-white hover:bg-white/10'}`}
																		title={event.task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
																	>
																		{event.task.status === 'done' && <CheckCircle className='h-3 w-3' />}
																	</button>
																</div>
																<div className='text-xs opacity-90 mb-1'>
																	{formatTime(event.start)} - {formatTime(event.end)}
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
																	<div className='font-semibold text-sm leading-tight truncate flex-1 flex items-center gap-1'>
																		{event.task.recurring && <Repeat className='h-3 w-3 opacity-60' />}
																		{event.title}
																	</div>
																	<button
																		onClick={e => handleCheckboxClick(e, event.task)}
																		className={`ml-1 flex-shrink-0 w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center ${event.task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-white/50 hover:border-white hover:bg-white/10'}`}
																		title={event.task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
																	>
																		{event.task.status === 'done' && <CheckCircle className='h-3 w-3' />}
																	</button>
																</div>
																<div className='text-xs opacity-90 mb-2'>
																	{formatTime(event.start)} - {formatTime(event.end)}
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

				{/* Unscheduled Tasks Sidebar - Right Side */}
				{unscheduledTasks.length > 0 && (
					<div className='w-80 border-l border-border bg-muted/20 flex flex-col overflow-hidden'>
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
				)}
			</div>
			{/* Create Task Dialog */}
			<Dialog
				open={isCreatingTask}
				onOpenChange={setIsCreatingTask}
			>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>Create New Task</DialogTitle>
						<DialogDescription>{newTaskDate && `Scheduled for ${formatDate(newTaskDate, true)}`}</DialogDescription>
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

			{/* Date Picker Dialog */}
			<Dialog
				open={isDateDialogOpen}
				onOpenChange={setIsDateDialogOpen}
			>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>Schedule Task</DialogTitle>
						<DialogDescription>{selectedTaskForDatePicker && `Set date and time for "${selectedTaskForDatePicker.title}"`}</DialogDescription>
					</DialogHeader>
					<div className='space-y-4'>
						{/* Calendar */}
						<div>
							<label className='text-sm font-medium mb-2 block'>Select Date</label>
							<div className='border rounded-md p-3 bg-background'>
								<CalendarUI
									mode='single'
									selected={selectedTaskForDatePicker?.scheduledDate ? new Date(selectedTaskForDatePicker.scheduledDate) : undefined}
									onSelect={date => {
										if (date && selectedTaskForDatePicker) {
											// Update the selected task's date while preserving existing time or setting default
											const existingDate = selectedTaskForDatePicker.scheduledDate ? new Date(selectedTaskForDatePicker.scheduledDate) : new Date();
											const newDate = new Date(date);
											newDate.setHours(existingDate.getHours() || 9, existingDate.getMinutes() || 0, 0, 0);

											// Update the selected task for date picker to reflect the new date
											setSelectedTaskForDatePicker({
												...selectedTaskForDatePicker,
												scheduledDate: newDate.toISOString(),
											});
										}
									}}
									className='w-full'
								/>
							</div>
						</div>

						{/* Time Selection */}
						<div>
							<label className='text-sm font-medium mb-2 block'>Select Time</label>
							<Input
								type='time'
								value={
									selectedTaskForDatePicker?.scheduledDate
										? (() => {
												const date = new Date(selectedTaskForDatePicker.scheduledDate);
												return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
										  })()
										: '09:00'
								}
								onChange={e => {
									if (selectedTaskForDatePicker && e.target.value) {
										const [hours, minutes] = e.target.value.split(':').map(Number);
										const currentDate = selectedTaskForDatePicker.scheduledDate ? new Date(selectedTaskForDatePicker.scheduledDate) : new Date();
										currentDate.setHours(hours, minutes, 0, 0);
										setSelectedTaskForDatePicker({
											...selectedTaskForDatePicker,
											scheduledDate: currentDate.toISOString(),
										});
									}
								}}
								className='bg-background'
							/>
						</div>

						{/* Quick Time Presets */}
						<div>
							<label className='text-sm font-medium mb-2 block'>Quick Times</label>
							<div className='grid grid-cols-3 gap-2'>
								{[
									{ label: '9:00 AM', hour: 9, minute: 0 },
									{ label: '12:00 PM', hour: 12, minute: 0 },
									{ label: '2:00 PM', hour: 14, minute: 0 },
									{ label: '5:00 PM', hour: 17, minute: 0 },
									{ label: '7:00 PM', hour: 19, minute: 0 },
									{ label: '9:00 PM', hour: 21, minute: 0 },
								].map(preset => (
									<Button
										key={preset.label}
										variant='outline'
										size='sm'
										onClick={() => {
											if (selectedTaskForDatePicker) {
												const currentDate = selectedTaskForDatePicker.scheduledDate ? new Date(selectedTaskForDatePicker.scheduledDate) : new Date();
												currentDate.setHours(preset.hour, preset.minute, 0, 0);
												setSelectedTaskForDatePicker({
													...selectedTaskForDatePicker,
													scheduledDate: currentDate.toISOString(),
												});
											}
										}}
										className='text-xs'
									>
										{preset.label}
									</Button>
								))}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => {
								setIsDateDialogOpen(false);
								setSelectedTaskForDatePicker(null);
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={async () => {
								if (selectedTaskForDatePicker && selectedTaskForDatePicker.scheduledDate) {
									const scheduledDate = new Date(selectedTaskForDatePicker.scheduledDate);

									// Determine status based on date
									const today = new Date();
									today.setHours(0, 0, 0, 0);
									const selectedDay = new Date(scheduledDate);
									selectedDay.setHours(0, 0, 0, 0);

									let newStatus: Task['status'] = 'backlog';
									if (selectedDay.getTime() === today.getTime()) {
										newStatus = 'today';
									} else if (selectedDay > today && selectedDay <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
										newStatus = 'this-week';
									}

									await onUpdateTask(selectedTaskForDatePicker.id, {
										scheduledDate: scheduledDate.toISOString(),
										status: newStatus,
									});

									setIsDateDialogOpen(false);
									setSelectedTaskForDatePicker(null);
								}
							}}
							disabled={!selectedTaskForDatePicker?.scheduledDate}
						>
							Schedule Task
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
