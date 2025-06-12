import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task, Board } from '@/types';
import { Clock, Calendar, X, CheckCircle, Circle } from 'lucide-react';
import { SubtasksContainer } from '@/components/subtasks/SubtasksContainer';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import moment from 'moment';

interface TaskEditDialogProps {
	task: Task | null;
	isOpen: boolean;
	onClose: () => void;
	onSave: (id: number, updates: Partial<Task>) => Promise<void>;
	onDelete: (id: number) => Promise<void>;
	onDuplicate?: (task: Task) => Promise<void>;
	// Optional props for enhanced functionality
	isAllTasksBoard?: boolean;
	boards?: Board[];
	isCreating?: boolean; // Whether this is creating a new task
	userPreferences?: any; // User preferences for date formatting
}

export function TaskEditDialog({ task, isOpen, onClose, onSave, isAllTasksBoard = false, boards = [], isCreating = false, userPreferences }: TaskEditDialogProps) {
	const [formData, setFormData] = useState<Partial<Task>>({});
	const [originalData, setOriginalData] = useState<Partial<Task>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [tempTimeEstimate, setTempTimeEstimate] = useState('');
	const [isEditingTime, setIsEditingTime] = useState(false);

	// Apply user preferences for date formatting
	const { formatDate } = useUserPreferences(userPreferences);

	// Helper function to format dates for datetime-local inputs
	const formatForDateTimeLocal = (dateString: string | undefined) => {
		if (!dateString) return '';
		return moment(dateString).format('YYYY-MM-DDTHH:mm');
	};

	// Check if form has changes - more robust comparison
	const hasChanges = useMemo(() => {
		if (!originalData || Object.keys(originalData).length === 0) return false;

		// Compare key fields that users typically edit
		const keysToCompare = ['title', 'description', 'timeEstimate', 'priority', 'status', 'category'];

		for (const key of keysToCompare) {
			if (formData[key as keyof Task] !== originalData[key as keyof Task]) {
				return true;
			}
		}
		return false;
	}, [formData, originalData]);

	// Initialize form data when task changes
	useEffect(() => {
		const initData = task
			? {
					title: task.title,
					description: task.description || '',
					timeEstimate: task.timeEstimate,
					priority: task.priority,
					status: task.status,
					scheduledDate: task.scheduledDate,
					startDate: task.startDate,
					dueDate: task.dueDate,
					category: task.category || '',
					progressPercentage: task.progressPercentage,
					timeSpent: task.timeSpent,
					boardId: task.boardId,
			  }
			: {
					// Default values for new task
					title: '',
					description: '',
					timeEstimate: 0,
					priority: 2 as Task['priority'],
					status: 'backlog' as Task['status'],
					progressPercentage: 0,
					timeSpent: 0,
					category: '',
			  };

		setFormData(initData);
		setOriginalData(initData);

		// Initialize temporary time estimate
		if (task) {
			setTempTimeEstimate(task.timeEstimate?.toString() || '0');
		} else {
			setTempTimeEstimate('0');
		}
	}, [task]);
	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && hasChanges) {
				e.preventDefault();
				handleSave();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleKeyDown);
			return () => document.removeEventListener('keydown', handleKeyDown);
		}
	}, [isOpen, hasChanges]);

	const handleSave = async () => {
		if (!formData.title?.trim()) return;

		setIsLoading(true);
		try {
			if (task) {
				// Editing existing task
				await onSave(task.id, formData);
			} else {
				// Creating new task - use a dummy ID since onSave expects an ID
				await onSave(0, formData);
			}
			// Update original data to reflect saved state
			setOriginalData({ ...formData });
			onClose();
		} catch (error) {
			console.error('Failed to save task:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// Remove unused handlers since they're not in the UI
	// const handleDelete and handleDuplicate removed for cleaner code

	const updateFormData = (field: keyof Task, value: any) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const toggleTaskCompletion = async () => {
		if (!task) return;

		const newStatus = task.status === 'done' ? 'backlog' : 'done';
		const updates: Partial<Task> = {
			status: newStatus,
			completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
			progressPercentage: newStatus === 'done' ? 100 : task.progressPercentage,
		};

		// Update form data immediately
		updateFormData('status', newStatus);
		if (newStatus === 'done') {
			updateFormData('progressPercentage', 100);
		}

		// Save to database
		setIsLoading(true);
		try {
			await onSave(task.id, updates);
		} catch (error) {
			console.error('Failed to toggle task completion:', error);
			// Revert on error
			updateFormData('status', task.status);
			updateFormData('progressPercentage', task.progressPercentage);
		} finally {
			setIsLoading(false);
		}
	};

	const handleTimeEstimateClick = () => {
		setIsEditingTime(true);
	};

	const handleTimeEstimateSubmit = () => {
		const newEstimate = parseInt(tempTimeEstimate) || 0;
		updateFormData('timeEstimate', newEstimate);
		setIsEditingTime(false);
	};

	const handleTimeEstimateKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleTimeEstimateSubmit();
		} else if (e.key === 'Escape') {
			setTempTimeEstimate(formData.timeEstimate?.toString() || '0');
			setIsEditingTime(false);
		}
	};

	const getStatusColor = (status: Task['status']) => {
		switch (status) {
			case 'backlog':
				return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
			case 'this-week':
				return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
			case 'today':
				return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
			case 'done':
				return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
			default:
				return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
		}
	};

	const getPriorityColor = (priority: number) => {
		switch (priority) {
			case 1:
				return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
			case 2:
				return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
			case 3:
				return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
			case 4:
				return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
			default:
				return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={onClose}
		>
			<DialogContent className='sm:max-w-5xl max-h-[90vh] overflow-hidden p-0 bg-background [&>button]:hidden'>
				{/* Header */}
				<div className='flex items-center justify-between p-6 border-b border-border bg-background'>
					<div className='flex items-center gap-3'>
						{task && (
							<button
								onClick={toggleTaskCompletion}
								disabled={isLoading}
								className='flex items-center hover:scale-110 transition-transform disabled:opacity-50'
							>
								{formData.status === 'done' ? <CheckCircle className='h-5 w-5 text-green-600' /> : <Circle className='h-5 w-5 text-muted-foreground hover:text-green-600 transition-colors' />}
							</button>
						)}
						<div>
							<DialogTitle className='text-xl font-semibold text-foreground'>{isCreating ? 'Create New Task' : 'Task Details'}</DialogTitle>
							{!isCreating && task && (
								<DialogDescription className='text-sm text-muted-foreground mt-1'>
									Created {moment(task.createdAt).format('MMM D, YYYY')}
									{task.completedAt && ` • Completed ${moment(task.completedAt).format('MMM D, YYYY')}`}
								</DialogDescription>
							)}
						</div>
					</div>{' '}
					<div className='flex gap-2'>
						<Button
							onClick={handleSave}
							disabled={isLoading || !formData.title?.trim()}
							size='sm'
						>
							{isLoading ? 'Saving...' : isCreating ? 'Create Task' : 'Save Changes'}
						</Button>
						<Button
							variant='ghost'
							size='sm'
							onClick={onClose}
						>
							<X className='h-4 w-4' />
						</Button>
					</div>
				</div>

				<div className='flex h-[calc(90vh-120px)]'>
					{/* Main Content Area */}
					<div className='flex-1 p-8 overflow-y-auto bg-background'>
						{/* Task Title */}
						<div className='mb-8'>
							<label className='text-sm font-medium text-muted-foreground block mb-3'>Task Title</label>
							<Input
								value={formData.title || ''}
								onChange={e => updateFormData('title', e.target.value)}
								placeholder='Enter task title...'
								className='text-2xl font-semibold border-none shadow-none p-4 h-auto focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground'
							/>
						</div>

						{/* Task Description */}
						<div className='mb-10'>
							<label className='text-sm font-medium text-muted-foreground block mb-3'>Description</label>
							<Textarea
								value={formData.description || ''}
								onChange={e => updateFormData('description', e.target.value)}
								placeholder='Add a description for this task...'
								className='min-h-[140px] border-none shadow-none p-4 resize-none focus-visible:ring-0 bg-transparent text-base text-foreground placeholder:text-muted-foreground'
							/>
						</div>

						{/* Subtasks */}
						{task && (
							<div className='mb-8'>
								<SubtasksContainer
									taskId={task.id}
									className='m-0'
								/>
							</div>
						)}

						{/* Category */}
						<div className='mb-6'>
							<label className='text-sm font-medium text-muted-foreground block mb-3'>Category</label>
							<Input
								value={formData.category || ''}
								onChange={e => updateFormData('category', e.target.value)}
								placeholder='e.g., Work, Personal, Health'
								className='bg-muted/50 border-border text-foreground'
							/>
						</div>
					</div>

					{/* Sidebar */}
					<div className='w-80 border-l border-border bg-muted/30 p-6 overflow-y-auto'>
						<div className='space-y-6'>
							{/* Status */}
							<div>
								<label className='text-sm font-medium text-muted-foreground block mb-3'>Status</label>
								<Select
									value={formData.status || 'backlog'}
									onValueChange={value => updateFormData('status', value as Task['status'])}
								>
									<SelectTrigger className='w-full mb-2'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='backlog'>Backlog</SelectItem>
										<SelectItem value='this-week'>This Week</SelectItem>
										<SelectItem value='today'>Today</SelectItem>
										<SelectItem value='done'>Done</SelectItem>
									</SelectContent>
								</Select>
								<Badge className={getStatusColor(formData.status || 'backlog')}>{formData.status?.replace('-', ' ').toUpperCase() || 'BACKLOG'}</Badge>
							</div>

							{/* Priority */}
							<div>
								<label className='text-sm font-medium text-muted-foreground block mb-3'>Priority</label>
								<Select
									value={formData.priority?.toString() || '2'}
									onValueChange={value => updateFormData('priority', parseInt(value) as 1 | 2 | 3 | 4)}
								>
									<SelectTrigger className='w-full mb-2'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='1'>1 - Low</SelectItem>
										<SelectItem value='2'>2 - Medium</SelectItem>
										<SelectItem value='3'>3 - High</SelectItem>
										<SelectItem value='4'>4 - Critical</SelectItem>
									</SelectContent>
								</Select>
								<Badge className={getPriorityColor(formData.priority || 2)}>Priority {formData.priority || 2}</Badge>
							</div>

							{/* Time Estimate */}
							<div>
								<label className='text-sm font-medium text-muted-foreground block mb-3'>
									<Clock className='h-4 w-4 inline mr-1' />
									Time Estimate
								</label>
								{isEditingTime ? (
									<div className='flex gap-2'>
										<Input
											type='number'
											value={tempTimeEstimate}
											onChange={e => setTempTimeEstimate(e.target.value)}
											onKeyDown={handleTimeEstimateKeyDown}
											onBlur={handleTimeEstimateSubmit}
											placeholder='Minutes'
											className='flex-1'
											autoFocus
										/>
										<span className='self-center text-sm text-muted-foreground'>min</span>
									</div>
								) : (
									<div
										onClick={handleTimeEstimateClick}
										className='flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors bg-background'
									>
										<Clock className='h-4 w-4 text-muted-foreground' />
										<span className='text-foreground'>{formData.timeEstimate || 0} minutes</span>
									</div>
								)}
							</div>

							{/* Dates */}
							<div className='space-y-4'>
								<div>
									<label className='text-sm font-medium text-muted-foreground block mb-3'>
										<Calendar className='h-4 w-4 inline mr-1' />
										Scheduled Date
									</label>{' '}
									<Input
										type='datetime-local'
										value={formatForDateTimeLocal(formData.scheduledDate)}
										onChange={e => updateFormData('scheduledDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
										className='bg-background border-border text-foreground'
									/>
								</div>{' '}
								<div>
									<label className='text-sm font-medium text-muted-foreground block mb-3'>Start Date</label>{' '}
									<Input
										type='datetime-local'
										value={formatForDateTimeLocal(formData.startDate)}
										onChange={e => updateFormData('startDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
										className='bg-background border-border text-foreground'
									/>
									{formData.startDate && <p className='text-xs text-muted-foreground mt-1'>Will display as: {formatDate(formData.startDate, true)}</p>}
								</div>
								<div>
									<label className='text-sm font-medium text-muted-foreground block mb-3'>Due Date</label>{' '}
									<Input
										type='datetime-local'
										value={formatForDateTimeLocal(formData.dueDate)}
										onChange={e => updateFormData('dueDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
										className='bg-background border-border text-foreground'
									/>
									{formData.dueDate && <p className='text-xs text-muted-foreground mt-1'>Will display as: {formatDate(formData.dueDate, true)}</p>}
								</div>
							</div>

							{/* Progress & Time Tracking */}
							<div className='space-y-4'>
								<div>
									<label className='text-sm font-medium text-muted-foreground block mb-3'>Progress (%)</label>
									<Input
										type='number'
										value={formData.progressPercentage || 0}
										onChange={e => updateFormData('progressPercentage', parseInt(e.target.value) || 0)}
										min='0'
										max='100'
										className='bg-background border-border text-foreground'
									/>
								</div>

								<div>
									<label className='text-sm font-medium text-muted-foreground block mb-3'>Time Spent (min)</label>
									<Input
										type='number'
										value={formData.timeSpent || 0}
										onChange={e => updateFormData('timeSpent', parseInt(e.target.value) || 0)}
										min='0'
										className='bg-background border-border text-foreground'
									/>
								</div>
							</div>

							{/* Board Selection for All Tasks board */}
							{isAllTasksBoard && boards && boards.length > 0 && (
								<div>
									<label className='text-sm font-medium text-muted-foreground block mb-3'>Board</label>
									<Select
										value={formData.boardId?.toString() || ''}
										onValueChange={(value: string) => updateFormData('boardId', value ? parseInt(value) : undefined)}
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
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
