import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task, Board } from '@/types';
import { Plus, Calendar, Clock, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { SubtasksContainer } from '@/components/subtasks/SubtasksContainer';
import { ViewHeader } from '@/components/ui/view-header';
import { cn } from '@/lib/utils';

interface GanttChartViewProps {
	board: Board;
	tasks: Task[];
	onBack: () => void;
	onMoveTask: (taskId: number, newStatus: Task['status']) => Promise<void>;
	onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
	onUpdateTask: (id: number, updates: Partial<Task>) => Promise<void>;
	onDeleteTask: (id: number) => Promise<void>;
	onDuplicateTask?: (task: Task) => Promise<void>;
	onUpdateTimeEstimate?: (taskId: number, timeEstimate: number) => Promise<void>;
	isAllTasksBoard?: boolean;
	boards?: Board[];
	user?: any;
	onSignOut?: () => Promise<{ error: any }>;
	onViewChange?: (board: Board, viewType: 'kanban' | 'calendar' | 'eisenhower' | 'gantt') => Promise<void>;
}

interface GanttTask extends Task {
	startPosition: number;
	duration: number;
	progress: number;
}

export function GanttChartView({ board, tasks, onBack, onAddTask, onUpdateTask, onDeleteTask, onDuplicateTask, onUpdateTimeEstimate, isAllTasksBoard = false, boards = [], user, onSignOut, onViewChange }: GanttChartViewProps) {
	const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('weeks');
	const [currentDate, setCurrentDate] = useState(new Date());
	const [isEditingTask, setIsEditingTask] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [draggedTask, setDraggedTask] = useState<number | null>(null);
	const [isCreatingTask, setIsCreatingTask] = useState(false);
	const [newTaskData, setNewTaskData] = useState({
		title: '',
		description: '',
		status: 'backlog' as Task['status'],
		startDate: '',
		dueDate: '',
		timeEstimate: 60,
	});

	// Generate time periods based on view mode
	const timePeriods = useMemo(() => {
		const periods: Date[] = [];
		const start = new Date(currentDate);
		start.setDate(start.getDate() - start.getDay()); // Start from Sunday

		let periodsCount = 0;
		let increment = 1;

		switch (viewMode) {
			case 'days':
				periodsCount = 14; // 2 weeks
				increment = 1;
				break;
			case 'weeks':
				periodsCount = 12; // 3 months
				increment = 7;
				break;
			case 'months':
				periodsCount = 12; // 1 year
				increment = 30;
				break;
		}

		for (let i = 0; i < periodsCount; i++) {
			const period = new Date(start);
			period.setDate(period.getDate() + i * increment);
			periods.push(period);
		}

		return periods;
	}, [currentDate, viewMode]);

	// Process tasks for Gantt display
	const ganttTasks: GanttTask[] = useMemo(() => {
		return tasks
			.filter(task => task.startDate || task.dueDate || task.scheduledDate)
			.map(task => {
				let startDate: Date;
				let endDate: Date;

				// Determine start and end dates
				if (task.startDate && task.dueDate) {
					startDate = new Date(task.startDate);
					endDate = new Date(task.dueDate);
				} else if (task.scheduledDate) {
					startDate = new Date(task.scheduledDate);
					endDate = new Date(startDate);
					if (task.timeEstimate > 0) {
						endDate.setMinutes(endDate.getMinutes() + task.timeEstimate);
					} else {
						endDate.setDate(endDate.getDate() + 1); // Default 1 day
					}
				} else if (task.startDate) {
					startDate = new Date(task.startDate);
					endDate = new Date(startDate);
					if (task.timeEstimate > 0) {
						endDate.setMinutes(endDate.getMinutes() + task.timeEstimate);
					} else {
						endDate.setDate(endDate.getDate() + 1);
					}
				} else if (task.dueDate) {
					endDate = new Date(task.dueDate);
					startDate = new Date(endDate);
					if (task.timeEstimate > 0) {
						startDate.setMinutes(startDate.getMinutes() - task.timeEstimate);
					} else {
						startDate.setDate(startDate.getDate() - 1);
					}
				} else {
					// Fallback to today
					startDate = new Date();
					endDate = new Date();
					endDate.setDate(endDate.getDate() + 1);
				}

				// Calculate position and duration relative to visible timeline
				const timelineStart = timePeriods[0];
				const timelineEnd = timePeriods[timePeriods.length - 1];
				const timelineWidth = timelineEnd.getTime() - timelineStart.getTime();

				const taskStart = Math.max(startDate.getTime(), timelineStart.getTime());
				const taskEnd = Math.min(endDate.getTime(), timelineEnd.getTime());

				const startPosition = ((taskStart - timelineStart.getTime()) / timelineWidth) * 100;
				const duration = ((taskEnd - taskStart) / timelineWidth) * 100;

				return {
					...task,
					startPosition: Math.max(0, startPosition),
					duration: Math.max(1, duration), // Minimum 1% width
					progress: task.progressPercentage || 0,
				};
			})
			.filter(task => task.duration > 0); // Only show tasks within timeline
	}, [tasks, timePeriods]);

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
				startDate: editingTask.startDate ? new Date(editingTask.startDate).toISOString() : editingTask.startDate,
				dueDate: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString() : editingTask.dueDate,
				scheduledDate: editingTask.scheduledDate ? new Date(editingTask.scheduledDate).toISOString() : editingTask.scheduledDate,
				timeEstimate: editingTask.timeEstimate,
				status: editingTask.status,
				progressPercentage: editingTask.progressPercentage,
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

	const handleDuplicateTask = async () => {
		if (!editingTask || !onDuplicateTask) return;
		try {
			await onDuplicateTask(editingTask);
			setEditingTask(null);
			setIsEditingTask(false);
		} catch (error) {
			console.error('Failed to duplicate task:', error);
		}
	};

	const handleCreateTask = async () => {
		if (!newTaskData.title.trim()) return;

		try {
			const taskToCreate = {
				...newTaskData,
				startDate: newTaskData.startDate ? new Date(newTaskData.startDate).toISOString() : undefined,
				dueDate: newTaskData.dueDate ? new Date(newTaskData.dueDate).toISOString() : undefined,
				position: tasks.length,
				progressPercentage: 0,
				effortEstimate: 2 as 1 | 2 | 3 | 4,
				impactEstimate: 2 as 1 | 2 | 3 | 4,
				priority: 2 as 1 | 2 | 3 | 4,
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
				status: 'backlog' as Task['status'],
				startDate: '',
				dueDate: '',
				timeEstimate: 60,
			});
		} catch (error) {
			console.error('Failed to create task:', error);
		}
	};

	// Handle drag and drop for timeline adjustments
	const handleTaskDragStart = useCallback((taskId: number) => {
		setIsDragging(true);
		setDraggedTask(taskId);
	}, []);
	const handleTaskDragEnd = useCallback(() => {
		setIsDragging(false);
		setDraggedTask(null);
	}, []);

	const navigateTime = (direction: 'prev' | 'next') => {
		const newDate = new Date(currentDate);
		switch (viewMode) {
			case 'days':
				newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
				break;
			case 'weeks':
				newDate.setDate(newDate.getDate() + (direction === 'next' ? 28 : -28));
				break;
			case 'months':
				newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 3 : -3));
				break;
		}
		setCurrentDate(newDate);
	};

	const getTaskColor = (task: Task) => {
		switch (task.status) {
			case 'done':
				return 'bg-green-600';
			case 'today':
				return 'bg-red-600';
			case 'this-week':
				return 'bg-yellow-600';
			default:
				return 'bg-blue-600';
		}
	};

	const getPriorityColor = (priority: number) => {
		switch (priority) {
			case 1:
				return 'border-l-red-500';
			case 2:
				return 'border-l-yellow-500';
			case 3:
				return 'border-l-blue-500';
			case 4:
				return 'border-l-gray-500';
			default:
				return 'border-l-blue-500';
		}
	};

	return (
		<div className='h-screen bg-background flex flex-col'>
			{/* Header */}
			<ViewHeader
				board={board}
				currentView='gantt'
				onBack={onBack}
				onViewChange={onViewChange}
				user={user}
				onSignOut={onSignOut}
			/>

			{/* Controls */}
			<div className='p-4 border-b border-border bg-card'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={() => navigateTime('prev')}
						>
							<ChevronLeft className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={() => setCurrentDate(new Date())}
						>
							Today
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={() => navigateTime('next')}
						>
							<ChevronRight className='h-4 w-4' />
						</Button>
					</div>

					<div className='flex items-center gap-2'>
						<Button
							onClick={() => setIsCreatingTask(true)}
							className='flex items-center gap-2'
						>
							<Plus className='h-4 w-4' />
							Add Task
						</Button>
						<Select
							value={viewMode}
							onValueChange={(value: any) => setViewMode(value)}
						>
							<SelectTrigger className='w-32'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='days'>Days</SelectItem>
								<SelectItem value='weeks'>Weeks</SelectItem>
								<SelectItem value='months'>Months</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			{/* Gantt Chart */}
			<div className='flex-1 overflow-auto'>
				{/* Timeline Header */}
				<div className='bg-muted border-b border-border sticky top-0 z-10'>
					<div className='flex'>
						{/* Task name column header */}
						<div className='w-80 border-r border-border p-3 bg-background'>
							<span className='font-medium text-sm'>Task Name</span>
						</div>
						{/* Timeline columns */}
						<div className='flex-1 flex'>
							{timePeriods.map((period, index) => (
								<div
									key={index}
									className='flex-1 p-3 border-r border-border/30 text-center min-w-[100px]'
								>
									<span className='text-xs font-medium'>{viewMode === 'days' ? period.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : viewMode === 'weeks' ? `Week ${Math.ceil(period.getDate() / 7)}` : period.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Task Rows */}
				<div className='min-h-[400px]'>
					{ganttTasks.length === 0 ? (
						<div className='flex items-center justify-center h-96'>
							<div className='text-center text-muted-foreground'>
								<Calendar className='h-12 w-12 mx-auto mb-4 opacity-50' />
								<p className='text-lg font-medium'>No scheduled tasks</p>
								<p className='text-sm'>Tasks need start dates, due dates, or scheduled times to appear in the Gantt chart</p>
							</div>
						</div>
					) : (
						<div className='space-y-1 p-1'>
							{ganttTasks.map(task => (
								<div
									key={task.id}
									className='flex border-b border-border/30 hover:bg-muted/30 transition-colors'
								>
									{/* Task name column */}
									<div className='w-80 border-r border-border p-3 bg-background'>
										<div className='flex items-center gap-2'>
											<div className={cn('w-3 h-3 rounded-full', getTaskColor(task))} />
											<div className='flex-1 min-w-0'>
												<p className='font-medium text-sm truncate'>{task.title}</p>
												<div className='flex items-center gap-2 mt-1'>
													{task.timeEstimate > 0 && (
														<span className='text-xs text-muted-foreground flex items-center gap-1'>
															<Clock className='h-3 w-3' />
															{task.timeEstimate}m
														</span>
													)}
													<span className={cn('text-xs px-1.5 py-0.5 rounded-full', task.status === 'done' ? 'bg-green-100 text-green-700' : task.status === 'today' ? 'bg-red-100 text-red-700' : task.status === 'this-week' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700')}>{task.status.replace('-', ' ')}</span>
												</div>
											</div>
											<Button
												variant='ghost'
												size='sm'
												className='h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
												onClick={() => handleEditTask(task)}
											>
												<MoreHorizontal className='h-3 w-3' />
											</Button>
										</div>
									</div>

									{/* Gantt bar column */}
									<div
										className='flex-1 relative p-3 group'
										onMouseUp={handleTaskDragEnd}
									>
										<div className='relative h-6'>
											{/* Gantt bar */}
											<div
												className={cn('absolute h-6 rounded-md border-l-4 shadow-sm cursor-move hover:shadow-md transition-all', getTaskColor(task), getPriorityColor(task.priority || 2), task.status === 'done' && 'opacity-70', isDragging && draggedTask === task.id && 'opacity-50 scale-95')}
												style={{
													left: `${task.startPosition}%`,
													width: `${task.duration}%`,
												}}
												onMouseDown={() => handleTaskDragStart(task.id)}
												onClick={() => handleEditTask(task)}
												draggable
											>
												{/* Progress bar */}
												{task.progress > 0 && (
													<div
														className='h-full bg-white/30 rounded-l-sm'
														style={{ width: `${task.progress}%` }}
													/>
												)}
												{/* Task title overlay */}
												<div className='absolute inset-0 flex items-center px-2'>
													<span className='text-xs font-medium text-white truncate'>{task.title}</span>
												</div>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Create Task Dialog */}
			<Dialog
				open={isCreatingTask}
				onOpenChange={setIsCreatingTask}
			>
				<DialogContent className='max-w-2xl'>
					<DialogHeader>
						<DialogTitle>Create New Task</DialogTitle>
						<DialogDescription>Add a new task to the Gantt chart</DialogDescription>
					</DialogHeader>
					<div className='space-y-4'>
						<Input
							placeholder='Task title'
							value={newTaskData.title}
							onChange={e => setNewTaskData({ ...newTaskData, title: e.target.value })}
						/>
						<Textarea
							placeholder='Task description'
							value={newTaskData.description}
							onChange={e => setNewTaskData({ ...newTaskData, description: e.target.value })}
							rows={3}
						/>
						<div className='grid grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<label className='text-sm font-medium'>Start Date</label>
								<Input
									type='date'
									value={newTaskData.startDate}
									onChange={e => setNewTaskData({ ...newTaskData, startDate: e.target.value })}
								/>
							</div>
							<div className='space-y-2'>
								<label className='text-sm font-medium'>Due Date</label>
								<Input
									type='date'
									value={newTaskData.dueDate}
									onChange={e => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
								/>
							</div>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>Time Estimate (minutes)</label>
							<Input
								type='number'
								placeholder='60'
								value={newTaskData.timeEstimate}
								onChange={e => setNewTaskData({ ...newTaskData, timeEstimate: parseInt(e.target.value) || 0 })}
							/>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>Status</label>
							<Select
								value={newTaskData.status}
								onValueChange={(value: any) => setNewTaskData({ ...newTaskData, status: value })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='backlog'>Backlog</SelectItem>
									<SelectItem value='this-week'>This Week</SelectItem>
									<SelectItem value='today'>Today</SelectItem>
									<SelectItem value='done'>Done</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className='flex justify-end gap-2'>
							<Button
								variant='outline'
								onClick={() => setIsCreatingTask(false)}
							>
								Cancel
							</Button>
							<Button
								onClick={handleCreateTask}
								disabled={!newTaskData.title.trim()}
							>
								Create Task
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Edit Task Dialog */}
			<Dialog
				open={isEditingTask}
				onOpenChange={setIsEditingTask}
			>
				<DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>Edit Task</DialogTitle>
						<DialogDescription>Update task details and timeline</DialogDescription>
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
												{boards.map(board => (
													<SelectItem
														key={board.id}
														value={board.id.toString()}
													>
														<div className='flex items-center gap-2'>
															<div
																className='w-3 h-3 rounded-full'
																style={{ backgroundColor: board.color }}
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

							{/* Timeline */}
							<div className='space-y-4'>
								<h4 className='text-sm font-medium text-foreground'>Timeline</h4>
								<div className='grid grid-cols-2 gap-4'>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>Start Date</label>
										<Input
											type='date'
											value={editingTask.startDate ? new Date(editingTask.startDate).toISOString().split('T')[0] : ''}
											onChange={e => setEditingTask({ ...editingTask, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>Due Date</label>
										<Input
											type='date'
											value={editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : ''}
											onChange={e => setEditingTask({ ...editingTask, dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
										/>
									</div>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>Time Estimate (minutes)</label>
									<Input
										type='number'
										placeholder='60'
										value={editingTask.timeEstimate || ''}
										onChange={e => setEditingTask({ ...editingTask, timeEstimate: parseInt(e.target.value) || 0 })}
									/>
								</div>
							</div>

							{/* Status and Progress */}
							<div className='space-y-4'>
								<h4 className='text-sm font-medium text-foreground'>Status & Progress</h4>
								<div className='grid grid-cols-2 gap-4'>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>Status</label>
										<Select
											value={editingTask.status}
											onValueChange={(value: any) => setEditingTask({ ...editingTask, status: value })}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value='backlog'>Backlog</SelectItem>
												<SelectItem value='this-week'>This Week</SelectItem>
												<SelectItem value='today'>Today</SelectItem>
												<SelectItem value='done'>Done</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>Progress (%)</label>
										<Input
											type='number'
											min='0'
											max='100'
											value={editingTask.progressPercentage || 0}
											onChange={e => setEditingTask({ ...editingTask, progressPercentage: parseInt(e.target.value) || 0 })}
										/>
									</div>
								</div>{' '}
							</div>

							{/* Subtasks Section */}
							<div className='space-y-4'>
								<h4 className='text-sm font-medium text-foreground'>Subtasks</h4>
								<SubtasksContainer taskId={editingTask.id} />
							</div>

							{/* Actions */}
							<div className='flex justify-between'>
								<div className='flex gap-2'>
									{onDuplicateTask && (
										<Button
											variant='outline'
											onClick={handleDuplicateTask}
										>
											Duplicate
										</Button>
									)}
									<Button
										variant='destructive'
										onClick={handleDeleteTask}
									>
										Delete
									</Button>
								</div>
								<div className='flex gap-2'>
									<Button
										variant='outline'
										onClick={() => setIsEditingTask(false)}
									>
										Cancel
									</Button>
									<Button
										onClick={handleUpdateTask}
										disabled={!editingTask.title.trim()}
									>
										Update Task
									</Button>
								</div>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
