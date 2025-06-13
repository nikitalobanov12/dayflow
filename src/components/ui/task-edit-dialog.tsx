import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task, Board, RecurringPattern } from '@/types';
import { Clock, Calendar, X, CheckCircle, Circle, Plus, Minus, Trash2 } from 'lucide-react';
import { SubtasksContainer } from '@/components/subtasks/SubtasksContainer';
import moment from 'moment';
import { Switch } from '@/components/ui/switch';
import { Calendar as CalendarUI } from '@/components/ui/calendar';

interface TaskEditDialogProps {
	task: Task | null;
	isOpen: boolean;
	onClose: () => void;
	onSave?: (id: number, updates: Partial<Task>) => Promise<void>; // For editing existing tasks
	onCreate?: (updates: Partial<Task>) => Promise<void>; // For creating new tasks
	onDelete: (id: number) => Promise<void>;
	onDuplicate?: (task: Task) => Promise<void>;
	// Optional props for enhanced functionality
	isAllTasksBoard?: boolean;
	boards?: Board[];
	isCreating?: boolean; // Whether this is creating a new task
	userPreferences?: any; // User preferences for date formatting
}

export function TaskEditDialog({ task, isOpen, onClose, onSave, onCreate, onDelete, isAllTasksBoard = false, boards = [], isCreating = false }: TaskEditDialogProps) {
	const [formData, setFormData] = useState<Partial<Task>>({});
	const [originalData, setOriginalData] = useState<Partial<Task>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [showRecurringOptions, setShowRecurringOptions] = useState(false);

	// Apply user preferences for date formatting



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

	// Initialize form data when task changes OR when dialog opens for creating new tasks
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
					recurring: task.recurring,
			  }
			: {
					// Default values for new task - always reset when creating
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
		setShowRecurringOptions(!!initData.recurring);
	}, [task, isOpen, isCreating]); // Added isOpen and isCreating to dependencies

	// Reset form data when dialog is closed (cleanup)
	useEffect(() => {
		if (!isOpen && isCreating) {
			// Reset form data for creating new tasks when dialog closes
			const defaultData = {
				title: '',
				description: '',
				timeEstimate: 0,
				priority: 2 as Task['priority'],
				status: 'backlog' as Task['status'],
				progressPercentage: 0,
				timeSpent: 0,
				category: '',
			};
			setFormData(defaultData);
			setOriginalData(defaultData);
			setShowRecurringOptions(false);
		}
	}, [isOpen, isCreating]);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Prevent saving if already loading to avoid double creation
			if (isLoading) return;

			// Save on Ctrl+Enter or Cmd+Enter
			if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && hasChanges) {
				e.preventDefault();
				handleSave();
			}
			// Save on Enter key (but not in textarea or when no changes)
			else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
				const target = e.target as HTMLElement;
				// Don't save on Enter if we're in a textarea (allow line breaks)
				// Don't save if we're in a button (let button handle it)
				// Don't save if we're in a select dropdown
				if (target.tagName !== 'TEXTAREA' && 
				    target.tagName !== 'BUTTON' && 
				    !target.closest('[role="combobox"]') &&
				    !target.closest('[role="listbox"]') &&
				    formData.title?.trim() && 
				    hasChanges) {
					e.preventDefault();
					handleSave();
				}
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleKeyDown);
			return () => document.removeEventListener('keydown', handleKeyDown);
		}
	}, [isOpen, hasChanges, formData.title, isLoading]); // Added isLoading to dependencies

	// Handle Enter key for specific input fields
	const handleInputKeyDown = (e: React.KeyboardEvent) => {
		// Prevent saving if already loading to avoid double creation
		if (isLoading) return;
		
		if (e.key === 'Enter' && !e.shiftKey && formData.title?.trim()) {
			e.preventDefault();
			handleSave();
		}
	};

	const handleSave = async () => {
		if (!formData.title?.trim() || isLoading) return; // Prevent multiple saves

		setIsLoading(true);
		try {
			// Prepare the updates
			const updates: Partial<Task> = { ...formData };

			// Handle recurring configuration
			if (showRecurringOptions) {
				// Preserve the time from the original scheduled date
				const originalDate = formData.scheduledDate ? new Date(formData.scheduledDate) : new Date();
				updates.recurring = {
					pattern: formData.recurring?.pattern || 'daily',
					interval: formData.recurring?.interval || 1,
					daysOfWeek: formData.recurring?.daysOfWeek || [],
					daysOfMonth: formData.recurring?.daysOfMonth || [],
					monthsOfYear: formData.recurring?.monthsOfYear || [],
					endDate: formData.recurring?.endDate
				};
				// Ensure the scheduled date has the correct time
				if (updates.scheduledDate) {
					const newDate = new Date(updates.scheduledDate);
					newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());
					updates.scheduledDate = newDate.toISOString();
				}
			} else {
				updates.recurring = undefined;
			}

			if (task && !isCreating && onSave) {
				// Editing existing task
				await onSave(task.id, updates);
			} else if (isCreating && onCreate) {
				// Creating new task
				await onCreate(updates);
			}
			// Update original data to reflect saved state
			setOriginalData({ ...updates });
			onClose();
		} catch (error) {
			console.error('Failed to save task:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!task) return;
		
		setIsLoading(true);
		try {
			await onDelete(task.id);
			onClose();
		} catch (error) {
			console.error('Failed to delete task:', error);
		} finally {
			setIsLoading(false);
		}
	};

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
			if (onSave) {
				await onSave(task.id, updates);
			}
		} catch (error) {
			console.error('Failed to toggle task completion:', error);
			// Revert on error
			updateFormData('status', task.status);
			updateFormData('progressPercentage', task.progressPercentage);
		} finally {
			setIsLoading(false);
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

	// Custom NumberInput component
	const NumberInput = ({ 
		value, 
		onChange, 
		min = 0, 
		max = 999, 
		step = 1, 
		placeholder = "0",
		className = "",
		onKeyDown
	}: {
		value: number;
		onChange: (value: number) => void;
		min?: number;
		max?: number;
		step?: number;
		placeholder?: string;
		className?: string;
		onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	}) => {
		const increment = () => {
			const newValue = Math.min(value + step, max);
			onChange(newValue);
		};

		const decrement = () => {
			const newValue = Math.max(value - step, min);
			onChange(newValue);
		};

		const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = parseInt(e.target.value) || min;
			const clampedValue = Math.min(Math.max(newValue, min), max);
			onChange(clampedValue);
		};

		return (
			<div className={`flex items-center ${className}`}>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-9 w-9 p-0 rounded-r-none border-r-0 shrink-0"
					onClick={decrement}
					disabled={value <= min}
				>
					<Minus className="h-4 w-4" />
				</Button>
				<Input
					type="number"
					value={value}
					onChange={handleInputChange}
					onKeyDown={onKeyDown}
					placeholder={placeholder}
					className="h-9 rounded-none border-x-0 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
					min={min}
					max={max}
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-9 w-9 p-0 rounded-l-none border-l-0 shrink-0"
					onClick={increment}
					disabled={value >= max}
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>
		);
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
						{task && !isCreating && (
							<Button
								variant='destructive'
								size='sm'
								onClick={handleDelete}
								disabled={isLoading}
							>
								<Trash2 className='h-4 w-4' />
							</Button>
						)}
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
								onKeyDown={handleInputKeyDown}
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
								onKeyDown={handleInputKeyDown}
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
								onKeyDown={handleInputKeyDown}
							/>
						</div>

						{/* Recurring Task Section */}
						<div className="mt-6 space-y-4">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium text-muted-foreground">Recurring Task</label>
								<Switch
									checked={showRecurringOptions}
									onCheckedChange={setShowRecurringOptions}
								/>
							</div>

							{showRecurringOptions && (
								<div className="space-y-4 p-4 border rounded-lg bg-muted/30">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="text-sm font-medium text-muted-foreground block mb-2">
												Pattern
											</label>
											<Select
												value={formData.recurring?.pattern || 'daily'}
												onValueChange={(value) =>
													updateFormData('recurring', {
														...formData.recurring,
														pattern: value as RecurringPattern,
													})
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="daily">Daily</SelectItem>
													<SelectItem value="weekly">Weekly</SelectItem>
													<SelectItem value="monthly">Monthly</SelectItem>
													<SelectItem value="yearly">Yearly</SelectItem>
												</SelectContent>
											</Select>
										</div>

										<div>
											<label className="text-sm font-medium text-muted-foreground block mb-2">
												Every X {formData.recurring?.pattern === 'daily' ? 'days' : 
												        formData.recurring?.pattern === 'weekly' ? 'weeks' :
												        formData.recurring?.pattern === 'monthly' ? 'months' :
												        formData.recurring?.pattern === 'yearly' ? 'years' : 'days'}
											</label>
											<NumberInput
												value={formData.recurring?.interval || 1}
												onChange={(value) =>
													updateFormData('recurring', {
														...formData.recurring,
														interval: value,
													})
												}
												onKeyDown={handleInputKeyDown}
											/>
										</div>
									</div>

									{formData.recurring?.pattern === 'weekly' && (
										<div>
											<label className="text-sm font-medium text-muted-foreground block mb-2">
												Days of Week
											</label>
											<div className="flex flex-wrap gap-2">
												{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
													<Button
														key={day}
														variant={
															formData.recurring?.daysOfWeek?.includes(index)
																? 'default'
																: 'outline'
														}
														size="sm"
														onClick={() => {
															const days = formData.recurring?.daysOfWeek || [];
															const newDays = days.includes(index)
																? days.filter((d) => d !== index)
																: [...days, index];
															updateFormData('recurring', {
																...formData.recurring,
																daysOfWeek: newDays,
															});
														}}
													>
														{day}
													</Button>
												))}
											</div>
										</div>
									)}

									{formData.recurring?.pattern === 'monthly' && (
										<div>
											<label className="text-sm font-medium text-muted-foreground block mb-2">
												Days of Month
											</label>
											<div className="flex flex-wrap gap-2">
												{Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
													<Button
														key={day}
														variant={
															formData.recurring?.daysOfMonth?.includes(day)
																? 'default'
																: 'outline'
														}
														size="sm"
														onClick={() => {
															const days = formData.recurring?.daysOfMonth || [];
															const newDays = days.includes(day)
																? days.filter((d) => d !== day)
																: [...days, day];
															updateFormData('recurring', {
																...formData.recurring,
																daysOfMonth: newDays,
															});
														}}
													>
														{day}
													</Button>
												))}
											</div>
										</div>
									)}

									{formData.recurring?.pattern === 'yearly' && (
										<div>
											<label className="text-sm font-medium text-muted-foreground block mb-2">
												Months of Year
											</label>
											<div className="flex flex-wrap gap-2">
												{[
													'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
													'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
												].map((month, index) => (
													<Button
														key={month}
														variant={
															formData.recurring?.monthsOfYear?.includes(index + 1)
																? 'default'
																: 'outline'
														}
														size="sm"
														onClick={() => {
															const months = formData.recurring?.monthsOfYear || [];
															const monthNum = index + 1;
															const newMonths = months.includes(monthNum)
																? months.filter((m) => m !== monthNum)
																: [...months, monthNum];
															updateFormData('recurring', {
																...formData.recurring,
																monthsOfYear: newMonths,
															});
														}}
													>
														{month}
													</Button>
												))}
											</div>
										</div>
									)}

									<div>
										<label className="text-sm font-medium text-muted-foreground block mb-2">
											End Date (Optional)
										</label>
										<Input
											type="date"
											value={formData.recurring?.endDate?.split('T')[0] || ''}
											onChange={(e) =>
												updateFormData('recurring', {
													...formData.recurring,
													endDate: e.target.value ? `${e.target.value}T00:00:00Z` : undefined,
												})
											}
										/>
									</div>
								</div>
							)}
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
								<Badge className={getStatusColor(formData.status || 'backlog')}>{formData.status?.replace(/-/g, ' ').toUpperCase() || 'BACKLOG'}</Badge>
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
								<div className='flex gap-2'>
									<NumberInput
										value={formData.timeEstimate || 0}
										onChange={(value) => updateFormData('timeEstimate', value)}
										min={0}
										max={1440}
										step={15}
										placeholder="0"
										className="flex-1"
										onKeyDown={handleInputKeyDown}
									/>
									<span className='self-center text-sm text-muted-foreground'>min</span>
								</div>
							</div>

							{/* Dates */}
							<div className='space-y-4'>
								<div>
									<label className='text-sm font-medium text-muted-foreground block mb-3'>
										<Calendar className='h-4 w-4 inline mr-1' />
										Scheduled Date & Time
									</label>
									
									{/* Calendar */}
									<div className="space-y-4">
										<div>
											<label className="text-sm font-medium mb-2 block">Select Date</label>
											<div className="border rounded-md p-3 bg-background">
												<CalendarUI
													mode="single"
													selected={formData.scheduledDate ? new Date(formData.scheduledDate) : undefined}
													onSelect={(date: Date | undefined) => {
														if (date) {
															// Preserve existing time or set default to 9:00 AM
															const existingDate = formData.scheduledDate ? new Date(formData.scheduledDate) : new Date();
															const newDate = new Date(date);
															newDate.setHours(
																existingDate.getHours() || 9, 
																existingDate.getMinutes() || 0, 
																0, 
																0
															);
															updateFormData('scheduledDate', newDate.toISOString());
														} else {
															updateFormData('scheduledDate', undefined);
														}
													}}
													className="w-full"
												/>
											</div>
										</div>

										{/* Time Selection - only show when date is selected */}
										{formData.scheduledDate && (
											<div>
												<label className="text-sm font-medium mb-2 block">Select Time</label>
												<Input
													type="time"
													value={(() => {
														const date = new Date(formData.scheduledDate);
														return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
													})()}
													onChange={e => {
														if (e.target.value && formData.scheduledDate) {
															const [hours, minutes] = e.target.value.split(':').map(Number);
															const currentDate = new Date(formData.scheduledDate);
															currentDate.setHours(hours, minutes, 0, 0);
															updateFormData('scheduledDate', currentDate.toISOString());
														}
													}}
													className="bg-background"
													onKeyDown={handleInputKeyDown}
												/>
											</div>
										)}

										{/* Quick Time Presets - only show when date is selected */}
										{formData.scheduledDate && (
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
																if (formData.scheduledDate) {
																	const currentDate = new Date(formData.scheduledDate);
																	currentDate.setHours(preset.hour, preset.minute, 0, 0);
																	updateFormData('scheduledDate', currentDate.toISOString());
																}
															}}
															className="text-xs"
														>
															{preset.label}
														</Button>
													))}
												</div>
											</div>
										)}
									</div>
								</div>
							</div>

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
