import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Task, Board } from '@/types';
import { Trash2, Clock, Calendar, Target, AlertTriangle } from 'lucide-react';
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
}

export function TaskEditDialog({ task, isOpen, onClose, onSave, onDelete, onDuplicate, isAllTasksBoard = false, boards = [], isCreating = false }: TaskEditDialogProps) {
	const [formData, setFormData] = useState<Partial<Task>>({});
	const [isLoading, setIsLoading] = useState(false);

	// Initialize form data when task changes
	useEffect(() => {
		if (task) {
			setFormData({
				title: task.title,
				description: task.description || '',
				timeEstimate: task.timeEstimate,
				priority: task.priority,
				status: task.status,
				scheduledDate: task.scheduledDate,
				startDate: task.startDate,
				dueDate: task.dueDate,
				effortEstimate: task.effortEstimate,
				impactEstimate: task.impactEstimate,
				category: task.category || '',
				progressPercentage: task.progressPercentage,
				timeSpent: task.timeSpent,
				boardId: task.boardId,
			});
		} else {
			// Default values for new task
			setFormData({
				title: '',
				description: '',
				timeEstimate: 30,
				priority: 2,
				status: 'backlog',
				effortEstimate: 2,
				impactEstimate: 2,
				progressPercentage: 0,
				timeSpent: 0,
				category: '',
			});
		}
	}, [task]);
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
			onClose();
		} catch (error) {
			console.error('Failed to save task:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!task) return;

		if (window.confirm('Are you sure you want to delete this task?')) {
			setIsLoading(true);
			try {
				await onDelete(task.id);
				onClose();
			} catch (error) {
				console.error('Failed to delete task:', error);
			} finally {
				setIsLoading(false);
			}
		}
	};

	const handleDuplicate = async () => {
		if (!task || !onDuplicate) return;

		setIsLoading(true);
		try {
			await onDuplicate(task);
			onClose();
		} catch (error) {
			console.error('Failed to duplicate task:', error);
		} finally {
			setIsLoading(false);
		}
	};
	const updateFormData = (field: keyof Task, value: any) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={onClose}
		>
			<DialogContent className='sm:max-w-2xl max-h-[80vh] overflow-y-auto'>
				{' '}
				<DialogHeader>
					<DialogTitle>{isCreating ? 'Create Task' : 'Edit Task'}</DialogTitle>
					<DialogDescription>{isCreating ? 'Add a new task with all the details' : 'Update task details and properties'}</DialogDescription>
				</DialogHeader>
				<div className='space-y-4'>
					{/* Basic Information */}
					<div className='grid grid-cols-1 gap-4'>
						<div>
							<label className='text-sm font-medium'>Title *</label>
							<Input
								value={formData.title || ''}
								onChange={e => updateFormData('title', e.target.value)}
								placeholder='Task title'
								className='w-full'
							/>
						</div>{' '}
						<div>
							<label className='text-sm font-medium'>Description</label>
							<Textarea
								value={formData.description || ''}
								onChange={e => updateFormData('description', e.target.value)}
								placeholder='Task description'
								className='w-full'
								rows={3}
							/>
						</div>
						{/* Board selection for All Tasks board */}
						{isAllTasksBoard && boards && boards.length > 0 && (
							<div>
								<label className='text-sm font-medium'>Board</label>
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

					{/* Status and Priority */}
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<label className='text-sm font-medium flex items-center gap-2'>
								<Target className='h-4 w-4' />
								Status
							</label>
							<Select
								value={formData.status || 'backlog'}
								onValueChange={value => updateFormData('status', value as Task['status'])}
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

						<div>
							<label className='text-sm font-medium flex items-center gap-2'>
								<AlertTriangle className='h-4 w-4' />
								Priority
							</label>
							<Select
								value={formData.priority?.toString() || '2'}
								onValueChange={value => updateFormData('priority', parseInt(value) as 1 | 2 | 3 | 4)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='1'>1 - Low</SelectItem>
									<SelectItem value='2'>2 - Medium</SelectItem>
									<SelectItem value='3'>3 - High</SelectItem>
									<SelectItem value='4'>4 - Critical</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Dates */}
					<div className='grid grid-cols-3 gap-4'>
						<div>
							<label className='text-sm font-medium flex items-center gap-2'>
								<Calendar className='h-4 w-4' />
								Scheduled Date
							</label>
							<Input
								type='datetime-local'
								value={formData.scheduledDate ? moment(formData.scheduledDate).format('YYYY-MM-DDTHH:mm') : ''}
								onChange={e => updateFormData('scheduledDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
								className='w-full'
							/>
						</div>

						<div>
							<label className='text-sm font-medium'>Start Date</label>
							<Input
								type='datetime-local'
								value={formData.startDate ? moment(formData.startDate).format('YYYY-MM-DDTHH:mm') : ''}
								onChange={e => updateFormData('startDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
								className='w-full'
							/>
						</div>

						<div>
							<label className='text-sm font-medium'>Due Date</label>
							<Input
								type='datetime-local'
								value={formData.dueDate ? moment(formData.dueDate).format('YYYY-MM-DDTHH:mm') : ''}
								onChange={e => updateFormData('dueDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
								className='w-full'
							/>
						</div>
					</div>

					{/* Estimates and Progress */}
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<label className='text-sm font-medium flex items-center gap-2'>
								<Target className='h-4 w-4' />
								Effort Estimate
							</label>
							<Select
								value={formData.effortEstimate?.toString() || '2'}
								onValueChange={value => updateFormData('effortEstimate', parseInt(value) as 1 | 2 | 3 | 4)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='1'>1 - Low Effort</SelectItem>
									<SelectItem value='2'>2 - Medium Effort</SelectItem>
									<SelectItem value='3'>3 - High Effort</SelectItem>
									<SelectItem value='4'>4 - Very High Effort</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<label className='text-sm font-medium flex items-center gap-2'>
								<AlertTriangle className='h-4 w-4' />
								Impact Estimate
							</label>
							<Select
								value={formData.impactEstimate?.toString() || '2'}
								onValueChange={value => updateFormData('impactEstimate', parseInt(value) as 1 | 2 | 3 | 4)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='1'>1 - Low Impact</SelectItem>
									<SelectItem value='2'>2 - Medium Impact</SelectItem>
									<SelectItem value='3'>3 - High Impact</SelectItem>
									<SelectItem value='4'>4 - Very High Impact</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Time and Progress */}
					<div className='grid grid-cols-3 gap-4'>
						<div>
							<label className='text-sm font-medium flex items-center gap-2'>
								<Clock className='h-4 w-4' />
								Time Estimate (minutes)
							</label>
							<Input
								type='number'
								value={formData.timeEstimate || 30}
								onChange={e => updateFormData('timeEstimate', parseInt(e.target.value) || 30)}
								min='0'
								step='15'
								className='w-full'
							/>
						</div>

						<div>
							<label className='text-sm font-medium'>Time Spent (minutes)</label>
							<Input
								type='number'
								value={formData.timeSpent || 0}
								onChange={e => updateFormData('timeSpent', parseInt(e.target.value) || 0)}
								min='0'
								step='15'
								className='w-full'
							/>
						</div>

						<div>
							<label className='text-sm font-medium'>Progress (%)</label>
							<Input
								type='number'
								value={formData.progressPercentage || 0}
								onChange={e => updateFormData('progressPercentage', parseInt(e.target.value) || 0)}
								min='0'
								max='100'
								step='5'
								className='w-full'
							/>
						</div>
					</div>

					{/* Category */}
					<div>
						<label className='text-sm font-medium'>Category</label>
						<Input
							value={formData.category || ''}
							onChange={e => updateFormData('category', e.target.value)}
							placeholder='Optional category (e.g., Work, Personal, Health)'
							className='w-full'
						/>
					</div>

					{/* Action Buttons */}
					<div className='flex justify-between pt-4 border-t'>
						<div className='flex gap-2'>
							<Button
								variant='destructive'
								onClick={handleDelete}
								disabled={isLoading}
							>
								<Trash2 className='h-4 w-4 mr-2' />
								Delete
							</Button>
							{onDuplicate && (
								<Button
									variant='outline'
									onClick={handleDuplicate}
									disabled={isLoading}
								>
									Duplicate
								</Button>
							)}
						</div>

						<div className='flex gap-2'>
							<Button
								variant='outline'
								onClick={onClose}
								disabled={isLoading}
							>
								Cancel
							</Button>
							<Button
								onClick={handleSave}
								disabled={isLoading || !formData.title?.trim()}
							>
								{isLoading ? 'Saving...' : 'Save Changes'}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
