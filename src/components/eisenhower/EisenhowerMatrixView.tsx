import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task, Board } from '@/types';
import { Plus, AlertTriangle, Clock, Star, Archive } from 'lucide-react';
import { SubtasksContainer } from '@/components/subtasks/SubtasksContainer';
import { ViewHeader } from '@/components/ui/view-header';
import { cn } from '@/lib/utils';

interface EisenhowerMatrixViewProps {
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

export function EisenhowerMatrixView({ board, tasks, onBack, onAddTask, onUpdateTask, onDeleteTask, isAllTasksBoard = false, boards = [], user, onSignOut, onViewChange }: EisenhowerMatrixViewProps) {
	const [isAddingTask, setIsAddingTask] = useState(false);
	const [isEditingTask, setIsEditingTask] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [selectedQuadrant, setSelectedQuadrant] = useState<keyof typeof quadrants | null>(null);

	// Define the four quadrants of the Eisenhower Matrix
	const quadrants = useMemo(
		() => ({
			urgent_important: {
				title: 'Do First',
				description: 'Urgent & Important',
				icon: <AlertTriangle className='h-5 w-5' />,
				color: 'text-red-600',
				bgColor: 'bg-red-50 border-red-200',
				filter: (task: Task) => task.effortEstimate >= 3 && task.impactEstimate >= 3,
			},
			not_urgent_important: {
				title: 'Schedule',
				description: 'Not Urgent & Important',
				icon: <Star className='h-5 w-5' />,
				color: 'text-blue-600',
				bgColor: 'bg-blue-50 border-blue-200',
				filter: (task: Task) => task.effortEstimate <= 2 && task.impactEstimate >= 3,
			},
			urgent_not_important: {
				title: 'Delegate',
				description: 'Urgent & Not Important',
				icon: <Clock className='h-5 w-5' />,
				color: 'text-orange-600',
				bgColor: 'bg-orange-50 border-orange-200',
				filter: (task: Task) => task.effortEstimate >= 3 && task.impactEstimate <= 2,
			},
			not_urgent_not_important: {
				title: 'Eliminate',
				description: 'Not Urgent & Not Important',
				icon: <Archive className='h-5 w-5' />,
				color: 'text-gray-600',
				bgColor: 'bg-gray-50 border-gray-200',
				filter: (task: Task) => task.effortEstimate <= 2 && task.impactEstimate <= 2,
			},
		}),
		[]
	);

	// Categorize tasks into quadrants
	const categorizedTasks = useMemo(() => {
		const result: Record<keyof typeof quadrants, Task[]> = {
			urgent_important: [],
			not_urgent_important: [],
			urgent_not_important: [],
			not_urgent_not_important: [],
		};

		tasks.forEach(task => {
			// Skip completed tasks unless they're in the 'done' status
			if (task.status === 'done') return;

			for (const [quadrant, config] of Object.entries(quadrants)) {
				if (config.filter(task)) {
					result[quadrant as keyof typeof quadrants].push(task);
					break;
				}
			}
		});

		return result;
	}, [tasks, quadrants]);

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
				effortEstimate: editingTask.effortEstimate,
				impactEstimate: editingTask.impactEstimate,
				priority: editingTask.priority,
				category: editingTask.category,
				dueDate: editingTask.dueDate,
				startDate: editingTask.startDate,
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

	const handleAddTask = async (quadrant: keyof typeof quadrants) => {
		setSelectedQuadrant(quadrant);
		setIsAddingTask(true);
	};
	const submitNewTask = async (taskData: Partial<Task>) => {
		if (!selectedQuadrant || !taskData.title?.trim()) return;

		// Set default effort and impact estimates based on quadrant
		let effortEstimate: 1 | 2 | 3 | 4 = 2;
		let impactEstimate: 1 | 2 | 3 | 4 = 2;

		switch (selectedQuadrant) {
			case 'urgent_important':
				effortEstimate = 4;
				impactEstimate = 4;
				break;
			case 'not_urgent_important':
				effortEstimate = 2;
				impactEstimate = 4;
				break;
			case 'urgent_not_important':
				effortEstimate = 4;
				impactEstimate = 2;
				break;
			case 'not_urgent_not_important':
				effortEstimate = 2;
				impactEstimate = 2;
				break;
		}

		const newTask = {
			title: taskData.title,
			description: taskData.description || '',
			timeEstimate: taskData.timeEstimate || 0,
			status: 'backlog' as Task['status'],
			position: 0,
			priority: (taskData.priority || 2) as 1 | 2 | 3 | 4,
			effortEstimate,
			impactEstimate,
			progressPercentage: 0,
			timeSpent: 0,
			labels: [],
			attachments: [],
			boardId: isAllTasksBoard ? undefined : board.id,
			category: taskData.category,
			dueDate: taskData.dueDate,
			startDate: taskData.startDate,
		};

		await onAddTask(newTask);
		setIsAddingTask(false);
		setSelectedQuadrant(null);
	};

	const TaskCard = ({ task, quadrant }: { task: Task; quadrant: keyof typeof quadrants }) => {
		const config = quadrants[quadrant];

		return (
			<div
				className={cn('p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md', config.bgColor, 'hover:scale-[1.02]')}
				onClick={() => handleEditTask(task)}
			>
				<div className='space-y-2'>
					<div className='flex items-start justify-between'>
						<h4 className='font-medium text-sm leading-tight'>{task.title}</h4>
						<div className='flex items-center gap-1 text-xs text-muted-foreground'>{task.timeEstimate > 0 && <span className='bg-white/80 px-2 py-1 rounded'>{task.timeEstimate}m</span>}</div>
					</div>

					{task.description && <p className='text-xs text-muted-foreground line-clamp-2'>{task.description}</p>}

					<div className='flex items-center justify-between text-xs'>
						<div className='flex items-center gap-2'>
							<span className='flex items-center gap-1'>
								<AlertTriangle className='h-3 w-3' />
								{task.effortEstimate}/4
							</span>
							<span className='flex items-center gap-1'>
								<Star className='h-3 w-3' />
								{task.impactEstimate}/4
							</span>
						</div>

						{task.dueDate && <span className='text-muted-foreground'>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
					</div>

					{isAllTasksBoard && task.boardId && boards.length > 0 && (
						<div className='flex items-center gap-1'>
							<div
								className='w-2 h-2 rounded-full'
								style={{
									backgroundColor: boards.find(b => b.id === task.boardId)?.color || '#3B82F6',
								}}
							/>
							<span className='text-xs text-muted-foreground'>{boards.find(b => b.id === task.boardId)?.name}</span>
						</div>
					)}
				</div>
			</div>
		);
	};
	return (
		<div className='h-screen bg-background flex flex-col'>
			{/* Header */}
			<ViewHeader
				board={board}
				currentView='eisenhower'
				onBack={onBack}
				onViewChange={onViewChange}
				user={user}
				onSignOut={onSignOut}
			/>

			{/* Matrix Grid */}
			<div className='flex-1 p-6 overflow-auto'>
				<div className='max-w-7xl mx-auto'>
					{/* Matrix Labels */}
					<div className='grid grid-cols-3 gap-4 mb-4'>
						<div></div>
						<div className='text-center'>
							<h3 className='font-semibold text-lg'>Important</h3>
						</div>
						<div className='text-center'>
							<h3 className='font-semibold text-lg text-muted-foreground'>Not Important</h3>
						</div>
					</div>

					{/* Matrix Content */}
					<div className='grid grid-cols-3 gap-4 h-[calc(100vh-200px)]'>
						{/* Row Label: Urgent */}
						<div className='flex items-center justify-center'>
							<h3 className='font-semibold text-lg transform -rotate-90 whitespace-nowrap'>Urgent</h3>
						</div>

						{/* Quadrant 1: Urgent & Important */}
						<div className={cn('rounded-xl border-2 p-4', quadrants.urgent_important.bgColor)}>
							<div className='flex items-center justify-between mb-4'>
								<div className='flex items-center gap-2'>
									<div className={quadrants.urgent_important.color}>{quadrants.urgent_important.icon}</div>
									<div>
										<h3 className='font-semibold'>{quadrants.urgent_important.title}</h3>
										<p className='text-sm text-muted-foreground'>{quadrants.urgent_important.description}</p>
									</div>
								</div>
								<Button
									size='sm'
									variant='ghost'
									onClick={() => handleAddTask('urgent_important')}
									className='shrink-0'
								>
									<Plus className='h-4 w-4' />
								</Button>
							</div>
							<div className='space-y-3 max-h-[calc(100%-80px)] overflow-y-auto'>
								{categorizedTasks.urgent_important.map(task => (
									<TaskCard
										key={task.id}
										task={task}
										quadrant='urgent_important'
									/>
								))}
								{categorizedTasks.urgent_important.length === 0 && (
									<div className='text-center text-muted-foreground py-8'>
										<p className='text-sm'>No urgent & important tasks</p>
									</div>
								)}
							</div>
						</div>

						{/* Quadrant 2: Urgent & Not Important */}
						<div className={cn('rounded-xl border-2 p-4', quadrants.urgent_not_important.bgColor)}>
							<div className='flex items-center justify-between mb-4'>
								<div className='flex items-center gap-2'>
									<div className={quadrants.urgent_not_important.color}>{quadrants.urgent_not_important.icon}</div>
									<div>
										<h3 className='font-semibold'>{quadrants.urgent_not_important.title}</h3>
										<p className='text-sm text-muted-foreground'>{quadrants.urgent_not_important.description}</p>
									</div>
								</div>
								<Button
									size='sm'
									variant='ghost'
									onClick={() => handleAddTask('urgent_not_important')}
									className='shrink-0'
								>
									<Plus className='h-4 w-4' />
								</Button>
							</div>
							<div className='space-y-3 max-h-[calc(100%-80px)] overflow-y-auto'>
								{categorizedTasks.urgent_not_important.map(task => (
									<TaskCard
										key={task.id}
										task={task}
										quadrant='urgent_not_important'
									/>
								))}
								{categorizedTasks.urgent_not_important.length === 0 && (
									<div className='text-center text-muted-foreground py-8'>
										<p className='text-sm'>No urgent & not important tasks</p>
									</div>
								)}
							</div>
						</div>

						{/* Row Label: Not Urgent */}
						<div className='flex items-center justify-center'>
							<h3 className='font-semibold text-lg text-muted-foreground transform -rotate-90 whitespace-nowrap'>Not Urgent</h3>
						</div>

						{/* Quadrant 3: Not Urgent & Important */}
						<div className={cn('rounded-xl border-2 p-4', quadrants.not_urgent_important.bgColor)}>
							<div className='flex items-center justify-between mb-4'>
								<div className='flex items-center gap-2'>
									<div className={quadrants.not_urgent_important.color}>{quadrants.not_urgent_important.icon}</div>
									<div>
										<h3 className='font-semibold'>{quadrants.not_urgent_important.title}</h3>
										<p className='text-sm text-muted-foreground'>{quadrants.not_urgent_important.description}</p>
									</div>
								</div>
								<Button
									size='sm'
									variant='ghost'
									onClick={() => handleAddTask('not_urgent_important')}
									className='shrink-0'
								>
									<Plus className='h-4 w-4' />
								</Button>
							</div>
							<div className='space-y-3 max-h-[calc(100%-80px)] overflow-y-auto'>
								{categorizedTasks.not_urgent_important.map(task => (
									<TaskCard
										key={task.id}
										task={task}
										quadrant='not_urgent_important'
									/>
								))}
								{categorizedTasks.not_urgent_important.length === 0 && (
									<div className='text-center text-muted-foreground py-8'>
										<p className='text-sm'>No important & not urgent tasks</p>
									</div>
								)}
							</div>
						</div>

						{/* Quadrant 4: Not Urgent & Not Important */}
						<div className={cn('rounded-xl border-2 p-4', quadrants.not_urgent_not_important.bgColor)}>
							<div className='flex items-center justify-between mb-4'>
								<div className='flex items-center gap-2'>
									<div className={quadrants.not_urgent_not_important.color}>{quadrants.not_urgent_not_important.icon}</div>
									<div>
										<h3 className='font-semibold'>{quadrants.not_urgent_not_important.title}</h3>
										<p className='text-sm text-muted-foreground'>{quadrants.not_urgent_not_important.description}</p>
									</div>
								</div>
								<Button
									size='sm'
									variant='ghost'
									onClick={() => handleAddTask('not_urgent_not_important')}
									className='shrink-0'
								>
									<Plus className='h-4 w-4' />
								</Button>
							</div>
							<div className='space-y-3 max-h-[calc(100%-80px)] overflow-y-auto'>
								{categorizedTasks.not_urgent_not_important.map(task => (
									<TaskCard
										key={task.id}
										task={task}
										quadrant='not_urgent_not_important'
									/>
								))}
								{categorizedTasks.not_urgent_not_important.length === 0 && (
									<div className='text-center text-muted-foreground py-8'>
										<p className='text-sm'>No low priority tasks</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Add Task Dialog */}
			<Dialog
				open={isAddingTask}
				onOpenChange={setIsAddingTask}
			>
				<DialogContent className='max-w-2xl'>
					<DialogHeader>
						<DialogTitle>Add New Task</DialogTitle>
						<DialogDescription>{selectedQuadrant && `Adding to: ${quadrants[selectedQuadrant].title} - ${quadrants[selectedQuadrant].description}`}</DialogDescription>
					</DialogHeader>
					<TaskForm
						onSubmit={submitNewTask}
						onCancel={() => setIsAddingTask(false)}
					/>
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
						<DialogDescription>Make changes to your task</DialogDescription>
					</DialogHeader>
					{editingTask && (
						<TaskForm
							task={editingTask}
							onSubmit={handleUpdateTask}
							onCancel={() => setIsEditingTask(false)}
							onDelete={handleDeleteTask}
							isEditing
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

// Task Form Component
interface TaskFormProps {
	task?: Task;
	onSubmit: (taskData: Partial<Task>) => Promise<void>;
	onCancel: () => void;
	onDelete?: () => Promise<void>;
	isEditing?: boolean;
}

function TaskForm({ task, onSubmit, onCancel, onDelete, isEditing = false }: TaskFormProps) {
	const [formData, setFormData] = useState<Partial<Task>>({
		title: task?.title || '',
		description: task?.description || '',
		timeEstimate: task?.timeEstimate || 0,
		effortEstimate: task?.effortEstimate || 2,
		impactEstimate: task?.impactEstimate || 2,
		priority: task?.priority || 2,
		category: task?.category || '',
		dueDate: task?.dueDate || undefined,
		startDate: task?.startDate || undefined,
	});

	const handleSubmit = async () => {
		if (!formData.title?.trim()) return;

		if (isEditing && task) {
			// Update existing task
			await onSubmit({
				...task,
				...formData,
			});
		} else {
			// Create new task
			await onSubmit(formData);
		}
	};

	return (
		<div className='space-y-6'>
			<div className='space-y-4'>
				<Input
					placeholder='Task title'
					value={formData.title}
					onChange={e => setFormData({ ...formData, title: e.target.value })}
				/>
				<Textarea
					placeholder='Task description'
					value={formData.description}
					onChange={e => setFormData({ ...formData, description: e.target.value })}
					rows={3}
				/>
			</div>

			<div className='grid grid-cols-2 gap-4'>
				<div className='space-y-2'>
					<label className='text-sm font-medium'>Effort Level (Urgency)</label>
					<Select
						value={formData.effortEstimate?.toString() || '2'}
						onValueChange={(value: string) => setFormData({ ...formData, effortEstimate: parseInt(value) as 1 | 2 | 3 | 4 })}
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
						value={formData.impactEstimate?.toString() || '2'}
						onValueChange={(value: string) => setFormData({ ...formData, impactEstimate: parseInt(value) as 1 | 2 | 3 | 4 })}
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

			<div className='grid grid-cols-2 gap-4'>
				<div className='space-y-2'>
					<label className='text-sm font-medium'>Time Estimate (minutes)</label>
					<Input
						type='number'
						placeholder='30'
						value={formData.timeEstimate || ''}
						onChange={e => {
							const minutes = parseInt(e.target.value) || 0;
							setFormData({ ...formData, timeEstimate: minutes });
						}}
						min='0'
						max='999'
					/>
				</div>

				<div className='space-y-2'>
					<label className='text-sm font-medium'>Priority</label>
					<Select
						value={formData.priority?.toString() || '2'}
						onValueChange={(value: string) => setFormData({ ...formData, priority: parseInt(value) as 1 | 2 | 3 | 4 })}
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
			</div>

			<div className='grid grid-cols-2 gap-4'>
				<div className='space-y-2'>
					<label className='text-sm font-medium'>Start Date</label>
					<Input
						type='date'
						value={formData.startDate ? formData.startDate.split('T')[0] : ''}
						onChange={e =>
							setFormData({
								...formData,
								startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
							})
						}
					/>
				</div>

				<div className='space-y-2'>
					<label className='text-sm font-medium'>Due Date</label>
					<Input
						type='date'
						value={formData.dueDate ? formData.dueDate.split('T')[0] : ''}
						onChange={e =>
							setFormData({
								...formData,
								dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
							})
						}
					/>
				</div>
			</div>

			<div className='space-y-2'>
				<label className='text-sm font-medium'>Category</label>
				<Input
					placeholder='e.g., Development, Design'
					value={formData.category || ''}
					onChange={e => setFormData({ ...formData, category: e.target.value })}
				/>
			</div>

			{isEditing && task && (
				<div className='space-y-4'>
					<h4 className='text-sm font-medium text-foreground'>Subtasks</h4>
					<div className='border rounded-lg p-3 bg-background/50'>
						<SubtasksContainer taskId={task.id} />
					</div>
				</div>
			)}

			<div className='flex gap-2 pt-4 border-t'>
				<Button
					onClick={handleSubmit}
					className='flex-1'
					disabled={!formData.title?.trim()}
				>
					{isEditing ? 'Update Task' : 'Add Task'}
				</Button>
				{isEditing && onDelete && (
					<Button
						variant='destructive'
						onClick={onDelete}
						className='px-4'
					>
						Delete
					</Button>
				)}
				<Button
					variant='outline'
					onClick={onCancel}
					className='px-4'
				>
					Cancel
				</Button>
			</div>
		</div>
	);
}
