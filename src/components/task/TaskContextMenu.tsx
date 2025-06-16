import { useState } from 'react';
import { Task, Board } from '@/types';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { useTaskOperations } from '@/hooks/useTaskOperations';
import { getGoogleCalendarService } from '@/lib/googleCalendar';
import { 
	Edit, 
	Copy, 
	Trash2, 
	Check, 
	ArrowLeft, 
	ArrowRight, 
	ArrowUp, 
	Calendar, 
	Repeat, 
	Clock, 
	AlertTriangle, 
	X,
	CloudOff,
	Cloud
} from 'lucide-react';

interface TaskContextMenuProps {
	task: Task;
	children: React.ReactNode;
	onEdit: (task: Task) => void;
	onDuplicate?: (task: Task) => void | Promise<void>;
	onDelete?: (taskId: number) => void | Promise<void>;
	onUpdateTask?: (id: number, updates: Partial<Task>) => Promise<void>;
	onMoveTask?: (taskId: number, newStatus: Task['status']) => void | Promise<void>;
	onUpdateTimeEstimate?: (taskId: number, timeEstimate: number) => void | Promise<void>;
	onToggleComplete?: (taskId: number) => void;
	boardInfo?: Board | null;
	userPreferences?: any;
	onManualSyncTask?: (task: Task) => Promise<void>;
	onManualUnsyncTask?: (task: Task) => Promise<void>;
}

export function TaskContextMenu({
	task,
	children,
	onEdit,
	onDuplicate,
	onDelete,
	onUpdateTask,
	onMoveTask,
	onUpdateTimeEstimate,
	onToggleComplete,
	// boardInfo,
	userPreferences,
	onManualSyncTask,
	onManualUnsyncTask
}: TaskContextMenuProps) {
	const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
	
	// Check if Google Calendar is available and authenticated
	const googleCalendarService = getGoogleCalendarService();
	const isGoogleCalendarConnected = googleCalendarService?.isUserAuthenticated() || false;

	const taskOperations = useTaskOperations(
		task,
		{
			onEdit,
			onDuplicate,
			onDelete,
			onUpdateTask,
			onMoveTask,
			onUpdateTimeEstimate,
			onToggleComplete,
		},
		userPreferences
	);

	// Google Calendar sync handlers
	const handleSyncToGoogle = async () => {
		if (onManualSyncTask) {
			try {
				await onManualSyncTask(task);
			} catch (error) {
				console.error('Failed to sync task to Google Calendar:', error);
			}
		}
	};

	const handleUnsyncFromGoogle = async () => {
		if (onManualUnsyncTask) {
			try {
				await onManualUnsyncTask(task);
			} catch (error) {
				console.error('Failed to unsync task from Google Calendar:', error);
			}
		}
	};

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					{children}
				</ContextMenuTrigger>
				
				<ContextMenuContent className='w-64'>
					<ContextMenuItem onClick={taskOperations.handleEdit}>
						<Edit className='mr-2 h-4 w-4' />
						Edit Task
					</ContextMenuItem>
					<ContextMenuItem onClick={taskOperations.handleDuplicate}>
						<Copy className='mr-2 h-4 w-4' />
						Duplicate Task
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem onClick={taskOperations.handleToggleComplete}>
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
							<ContextMenuItem onClick={() => taskOperations.handleQuickPriority(4)}>
								<div className='flex items-center gap-2'>
									<div className='w-3 h-3 rounded-full bg-red-500'></div>
									Critical (4)
								</div>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => taskOperations.handleQuickPriority(3)}>
								<div className='flex items-center gap-2'>
									<div className='w-3 h-3 rounded-full bg-orange-500'></div>
									High (3)
								</div>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => taskOperations.handleQuickPriority(2)}>
								<div className='flex items-center gap-2'>
									<div className='w-3 h-3 rounded-full bg-yellow-500'></div>
									Medium (2)
								</div>
							</ContextMenuItem>
							<ContextMenuItem onClick={() => taskOperations.handleQuickPriority(1)}>
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
							<ContextMenuItem onClick={() => taskOperations.handleQuickTime(15)}>15 minutes</ContextMenuItem>
							<ContextMenuItem onClick={() => taskOperations.handleQuickTime(30)}>30 minutes</ContextMenuItem>
							<ContextMenuItem onClick={() => taskOperations.handleQuickTime(60)}>1 hour</ContextMenuItem>
							<ContextMenuItem onClick={() => taskOperations.handleQuickTime(120)}>2 hours</ContextMenuItem>
							<ContextMenuItem onClick={() => taskOperations.handleQuickTime(240)}>4 hours</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem onClick={() => taskOperations.handleQuickTime(0)}>Clear</ContextMenuItem>
						</ContextMenuSubContent>
					</ContextMenuSub>

					{/* Schedule submenu with date picker */}
					<ContextMenuSub key="schedule-submenu">
						<ContextMenuSubTrigger>
							<Calendar className='mr-2 h-4 w-4' />
							Schedule
						</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							<ContextMenuItem
								onSelect={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setIsDateDialogOpen(true);
								}}
							>
								<Calendar className='mr-2 h-4 w-4' />
								Pick a date...
							</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem onClick={taskOperations.handleScheduleToday}>
								<Calendar className='mr-2 h-4 w-4' />
								Today (9 AM)
							</ContextMenuItem>
							<ContextMenuItem onClick={taskOperations.handleScheduleTomorrow}>
								<Calendar className='mr-2 h-4 w-4' />
								Tomorrow (9 AM)
							</ContextMenuItem>
							<ContextMenuItem onClick={taskOperations.handleScheduleThisWeekend}>
								<Calendar className='mr-2 h-4 w-4' />
								This Weekend (10 AM)
							</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem onClick={taskOperations.handleClearSchedule}>
								<X className='mr-2 h-4 w-4' />
								Clear Schedule
							</ContextMenuItem>
						</ContextMenuSubContent>
					</ContextMenuSub>

					{/* Recurring pattern submenu */}
					{onUpdateTask && (
						<ContextMenuSub key="recurring-submenu">
							<ContextMenuSubTrigger>
								<Repeat className='mr-2 h-4 w-4' />
								Recurring
							</ContextMenuSubTrigger>
							<ContextMenuSubContent>
								<ContextMenuItem onClick={() => taskOperations.handleSetRecurringPattern('daily')}>Daily</ContextMenuItem>
								<ContextMenuItem onClick={() => taskOperations.handleSetRecurringPattern('weekly')}>Weekly</ContextMenuItem>
								<ContextMenuItem onClick={() => taskOperations.handleSetRecurringPattern('monthly')}>Monthly</ContextMenuItem>
								<ContextMenuItem onClick={() => taskOperations.handleSetRecurringPattern('yearly')}>Yearly</ContextMenuItem>
								<ContextMenuSeparator />
								<ContextMenuItem onClick={taskOperations.handleClearRecurring}>Clear Recurring</ContextMenuItem>
							</ContextMenuSubContent>
						</ContextMenuSub>
					)}

					{/* Google Calendar submenu */}
					{isGoogleCalendarConnected && (
						<ContextMenuSub key="google-calendar-submenu">
							<ContextMenuSubTrigger>
								<Cloud className='mr-2 h-4 w-4' />
								Google Calendar
							</ContextMenuSubTrigger>
							<ContextMenuSubContent>
								{task.googleCalendarSynced ? (
									<>
										<ContextMenuItem disabled>
											<Check className='mr-2 h-4 w-4' />
											Synced to Calendar
										</ContextMenuItem>
										<ContextMenuSeparator />
										<ContextMenuItem onClick={handleUnsyncFromGoogle}>
											<CloudOff className='mr-2 h-4 w-4' />
											Remove from Calendar
										</ContextMenuItem>
									</>
								) : (
									<ContextMenuItem 
										onClick={handleSyncToGoogle}
										disabled={!task.scheduledDate && !task.startDate}
									>
										<Cloud className='mr-2 h-4 w-4' />
										Sync to Calendar
									</ContextMenuItem>
								)}
								{!task.scheduledDate && !task.startDate && (
									<>
										<ContextMenuSeparator />
										<div className="px-2 py-1 text-xs text-muted-foreground">
											Schedule task first to sync
										</div>
									</>
								)}
							</ContextMenuSubContent>
						</ContextMenuSub>
					)}

					<ContextMenuSeparator />

					{/* Move to submenu */}
					{onMoveTask && (
						<ContextMenuSub key="move-to-submenu">
							<ContextMenuSubTrigger>
								<ArrowRight className='mr-2 h-4 w-4' />
								Move to...
							</ContextMenuSubTrigger>
							<ContextMenuSubContent>
								{task.status !== 'backlog' && (
									<ContextMenuItem onClick={() => taskOperations.handleMoveToStatus('backlog')}>
										<ArrowLeft className='mr-2 h-4 w-4' />
										Backlog
									</ContextMenuItem>
								)}
								{task.status !== 'this-week' && (
									<ContextMenuItem onClick={() => taskOperations.handleMoveToStatus('this-week')}>
										<ArrowUp className='mr-2 h-4 w-4' />
										This Week
									</ContextMenuItem>
								)}
								{task.status !== 'today' && (
									<ContextMenuItem onClick={() => taskOperations.handleMoveToStatus('today')}>
										<ArrowUp className='mr-2 h-4 w-4' />
										Today
									</ContextMenuItem>
								)}
								{task.status !== 'done' && (
									<ContextMenuItem onClick={() => taskOperations.handleMoveToStatus('done')}>
										<Check className='mr-2 h-4 w-4' />
										Done
									</ContextMenuItem>
								)}
							</ContextMenuSubContent>
						</ContextMenuSub>
					)}
					
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={taskOperations.handleDelete}
						className='text-destructive'
					>
						<Trash2 className='mr-2 h-4 w-4' />
						Delete Task
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
			
			{/* Date picker dialog */}
			<Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Schedule Task</DialogTitle>
						<DialogDescription>
							Set date and time for "{task.title}"
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						{/* Calendar */}
						<div>
							<label className="text-sm font-medium mb-2 block">Select Date</label>
							<div className="border rounded-md p-3 bg-background">
								<CalendarUI
									mode="single"
									selected={task.scheduledDate ? new Date(task.scheduledDate) : undefined}
									onSelect={(date) => {
										if (date && onUpdateTask) {
											const existingDate = task.scheduledDate ? new Date(task.scheduledDate) : new Date();
											const newDate = new Date(date);
											newDate.setHours(existingDate.getHours() || 9, existingDate.getMinutes() || 0, 0, 0);
											onUpdateTask(task.id, { scheduledDate: newDate.toISOString() });
										}
									}}
									className="w-full"
								/>
							</div>
						</div>

						{/* Time Selection */}
						<div>
							<label className="text-sm font-medium mb-2 block">Select Time</label>
							<Input
								type="time"
								value={task.scheduledDate ? 
									(() => {
										const date = new Date(task.scheduledDate);
										return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
									})() : 
									"09:00"
								}
								onChange={(e) => {
									if (e.target.value && onUpdateTask) {
										const [hours, minutes] = e.target.value.split(':').map(Number);
										const currentDate = task.scheduledDate ? 
											new Date(task.scheduledDate) : 
											new Date();
										currentDate.setHours(hours, minutes, 0, 0);
										onUpdateTask(task.id, { scheduledDate: currentDate.toISOString() });
									}
								}}
								className="bg-background"
							/>
						</div>

						{/* Quick Time Presets */}
						<div>
							<label className="text-sm font-medium mb-2 block">Quick Times</label>
							<div className="grid grid-cols-3 gap-2">
								{[
									{ label: '9:00 AM', hour: 9, minute: 0 },
									{ label: '12:00 PM', hour: 12, minute: 0 },
									{ label: '2:00 PM', hour: 14, minute: 0 },
									{ label: '5:00 PM', hour: 17, minute: 0 },
									{ label: '7:00 PM', hour: 19, minute: 0 },
									{ label: '9:00 PM', hour: 21, minute: 0 },
								].map((preset) => (
									<Button
										key={preset.label}
										variant="outline"
										size="sm"
										onClick={() => {
											const currentDate = task.scheduledDate ? 
												new Date(task.scheduledDate) : 
												new Date();
											currentDate.setHours(preset.hour, preset.minute, 0, 0);
											if (onUpdateTask) {
												onUpdateTask(task.id, { scheduledDate: currentDate.toISOString() });
											}
										}}
										className="text-xs"
									>
										{preset.label}
									</Button>
								))}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button 
							variant="outline" 
							onClick={() => setIsDateDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button 
							onClick={() => {
								if (task.scheduledDate && onUpdateTask && onMoveTask) {
									const scheduledDate = new Date(task.scheduledDate);
									
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
									
									onUpdateTask(task.id, { 
										scheduledDate: scheduledDate.toISOString(),
										status: newStatus
									});
								}
								setIsDateDialogOpen(false);
							}}
							disabled={!task.scheduledDate}
						>
							Schedule Task
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
} 