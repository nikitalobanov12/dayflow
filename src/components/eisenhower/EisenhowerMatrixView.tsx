import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Task, Board } from '@/types';
import { Plus, AlertTriangle, Clock, Star, Archive } from 'lucide-react';
import { TaskEditDialog } from '@/components/ui/task-edit-dialog';
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
				color: 'text-red-700 dark:text-red-300',
				bgColor: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-700',
				filter: (task: Task) => task.effortEstimate >= 3 && task.impactEstimate >= 3,
			},
			not_urgent_important: {
				title: 'Schedule',
				description: 'Not Urgent & Important',
				icon: <Star className='h-5 w-5' />,
				color: 'text-blue-700 dark:text-blue-300',
				bgColor: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-700',
				filter: (task: Task) => task.effortEstimate <= 2 && task.impactEstimate >= 3,
			},
			urgent_not_important: {
				title: 'Delegate',
				description: 'Urgent & Not Important',
				icon: <Clock className='h-5 w-5' />,
				color: 'text-orange-700 dark:text-orange-300',
				bgColor: 'bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-700',
				filter: (task: Task) => task.effortEstimate >= 3 && task.impactEstimate <= 2,
			},
			not_urgent_not_important: {
				title: 'Eliminate',
				description: 'Not Urgent & Not Important',
				icon: <Archive className='h-5 w-5' />,
				color: 'text-gray-700 dark:text-gray-300',
				bgColor: 'bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-700',
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
	// Event handlers
	const handleAddTask = (quadrant: keyof typeof quadrants) => {
		setSelectedQuadrant(quadrant);
		setIsAddingTask(true);
	};

	const handleEditTask = (task: Task) => {
		setEditingTask(task);
		setIsEditingTask(true);
	};

	// Wrapper functions for the unified dialog
	const handleNewTaskSave = async (_id: number, updates: Partial<Task>) => {
		// Add default values based on selected quadrant
		const getDefaultValues = (quadrant: string | null) => {
			switch (quadrant) {
				case 'urgent_important':
					return { effortEstimate: 4, impactEstimate: 4, priority: 1 };
				case 'not_urgent_important':
					return { effortEstimate: 2, impactEstimate: 4, priority: 2 };
				case 'urgent_not_important':
					return { effortEstimate: 4, impactEstimate: 2, priority: 3 };
				case 'not_urgent_not_important':
					return { effortEstimate: 2, impactEstimate: 2, priority: 4 };
				default:
					return { effortEstimate: 2, impactEstimate: 2, priority: 2 };
			}
		};

		const defaultValues = getDefaultValues(selectedQuadrant);
		const taskData = {
			...defaultValues,
			...updates,
			status: 'backlog' as Task['status'],
			position: 0,
			progressPercentage: 0,
			timeSpent: 0,
			labels: [],
			attachments: [],
			boardId: isAllTasksBoard ? undefined : board.id,
		};

		await onAddTask(taskData as Omit<Task, 'id' | 'createdAt'>);
		setIsAddingTask(false);
		setSelectedQuadrant(null);
	};

	const handleEditTaskSave = async (id: number, updates: Partial<Task>) => {
		await onUpdateTask(id, updates);
		setIsEditingTask(false);
		setEditingTask(null);
	};

	const handleEditTaskDelete = async (id: number) => {
		await onDeleteTask(id);
		setIsEditingTask(false);
		setEditingTask(null);
	}; // Task Card Component
	const TaskCard = ({ task }: { task: Task }) => {
		// Determine quadrant based on task properties
		const getQuadrant = (): keyof typeof quadrants => {
			const effort = task.effortEstimate || 2;
			const impact = task.impactEstimate || 2;

			if (effort >= 3 && impact >= 3) return 'urgent_important';
			if (effort >= 3 && impact < 3) return 'urgent_not_important';
			if (effort < 3 && impact >= 3) return 'not_urgent_important';
			return 'not_urgent_not_important';
		};

		const quadrant = getQuadrant();
		const quadrantConfig = quadrants[quadrant];

		return (
			<div
				className={cn('p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md', quadrantConfig.bgColor, 'hover:scale-[1.02]')}
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
								{' '}
								{categorizedTasks.urgent_important.map(task => (
									<TaskCard
										key={task.id}
										task={task}
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
								{' '}
								{categorizedTasks.urgent_not_important.map(task => (
									<TaskCard
										key={task.id}
										task={task}
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
								{' '}
								{categorizedTasks.not_urgent_important.map(task => (
									<TaskCard
										key={task.id}
										task={task}
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
								{' '}
								{categorizedTasks.not_urgent_not_important.map(task => (
									<TaskCard
										key={task.id}
										task={task}
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
			<TaskEditDialog
				task={null}
				isOpen={isAddingTask}
				onClose={() => setIsAddingTask(false)}
				onSave={handleNewTaskSave}
				onDelete={() => Promise.resolve()}
			/>

			{/* Edit Task Dialog */}
			<TaskEditDialog
				task={editingTask}
				isOpen={isEditingTask}
				onClose={() => setIsEditingTask(false)}
				onSave={handleEditTaskSave}
				onDelete={handleEditTaskDelete}
			/>
		</div>
	);
}
