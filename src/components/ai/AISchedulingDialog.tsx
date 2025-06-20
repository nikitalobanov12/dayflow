import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Clock, Calendar, AlertCircle, Loader2, CheckCircle2, GitMerge } from 'lucide-react';
import { Task, UserPreferences, Board, Profile } from '@/types';
import { useAIScheduler } from '@/hooks/useAIScheduler';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { renderIcon } from '@/constants/board-constants';

interface AISchedulingDialogProps {
	isOpen: boolean;
	onClose: () => void;
	tasks: Task[];
	boards: Board[];
	userPreferences: UserPreferences | null;
	userProfile: Profile | null;
}

type SchedulingMode = 'unscheduled' | 'all' | 'selected' | 'board';
type TimeEstimateMode = 'keep' | 'update' | 'custom';

export function AISchedulingDialog({ isOpen, onClose, tasks, boards, userPreferences, userProfile }: AISchedulingDialogProps) {
	const { isScheduling, isEstimating, scheduleTasksWithAI, updateTimeEstimatesWithAI } = useAIScheduler();
	
	// Dialog state
	const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>('unscheduled');
	const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
	const [timeEstimateMode, setTimeEstimateMode] = useState<TimeEstimateMode>('keep');
	const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
	const [customInstructions, setCustomInstructions] = useState('');
	const [schedulingStartDate, setSchedulingStartDate] = useState(() => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		return tomorrow.toISOString().split('T')[0];
	});
	const [maxDaysAhead, setMaxDaysAhead] = useState(14);
	const [respectWorkingHours, setRespectWorkingHours] = useState(true);
	const [groupSimilarTasks, setGroupSimilarTasks] = useState(true);
	const [prioritizeUrgent, setPrioritizeUrgent] = useState(true);
	const [allowOverlap, setAllowOverlap] = useState(false);

	// Filter tasks based on mode
	const availableTasks = tasks.filter(task => task.status !== 'done');
	const unscheduledTasks = availableTasks.filter(task => !task.scheduledDate);

	const getTasksForMode = () => {
		switch (schedulingMode) {
			case 'unscheduled':
				return unscheduledTasks;
			case 'all':
				return availableTasks;
			case 'board':
				return selectedBoardId ? availableTasks.filter(task => task.boardId === selectedBoardId) : [];
			case 'selected':
				return availableTasks.filter(task => selectedTaskIds.has(task.id));
			default:
				return [];
		}
	};

	const tasksToSchedule = getTasksForMode();

	// Get board for a task
	const getTaskBoard = (task: Task) => {
		return boards.find(board => board.id === task.boardId);
	};

	// Reset selected tasks when mode changes
	useEffect(() => {
		if (schedulingMode !== 'selected') {
			setSelectedTaskIds(new Set());
		}
		if (schedulingMode !== 'board') {
			setSelectedBoardId(null);
		}
	}, [schedulingMode]);

	// Initialize selected tasks for 'selected' mode
	useEffect(() => {
		if (schedulingMode === 'selected' && selectedTaskIds.size === 0) {
			// Pre-select unscheduled tasks by default
			const unscheduledIds = new Set(unscheduledTasks.map(task => task.id));
			setSelectedTaskIds(unscheduledIds);
		}
	}, [schedulingMode, unscheduledTasks, selectedTaskIds.size]);

	// Initialize selected board for 'board' mode
	useEffect(() => {
		if (schedulingMode === 'board' && !selectedBoardId && boards.length > 0) {
			// Pre-select the first non-default board or default board if only one exists
			const firstBoard = boards.find(board => !board.isDefault) || boards[0];
			setSelectedBoardId(firstBoard.id);
		}
	}, [schedulingMode, selectedBoardId, boards]);

	const handleTaskToggle = (taskId: number) => {
		const newSelected = new Set(selectedTaskIds);
		if (newSelected.has(taskId)) {
			newSelected.delete(taskId);
		} else {
			newSelected.add(taskId);
		}
		setSelectedTaskIds(newSelected);
	};

	const handleSelectAll = () => {
		setSelectedTaskIds(new Set(availableTasks.map(task => task.id)));
	};

	const handleSelectNone = () => {
		setSelectedTaskIds(new Set());
	};

	const handleSchedule = async () => {
		if (!userPreferences || !userProfile || tasksToSchedule.length === 0) return;

		try {
			// First update time estimates if requested
			if (timeEstimateMode === 'update') {
				await updateTimeEstimatesWithAI(tasksToSchedule, userPreferences, userProfile);
			}

			// Create custom preferences for this scheduling session
			const customPreferences: UserPreferences = {
				...userPreferences,
				schedulingLookaheadDays: maxDaysAhead,
			};

			// Add overlap preference to custom instructions if enabled
			const overlapInstruction = allowOverlap ? 
				' Allow tasks to overlap in time if they are from different boards or can be multitasked.' : 
				' Avoid any time overlaps between tasks.';
			
			const finalInstructions = customInstructions + overlapInstruction;

			// Schedule the tasks with custom instructions
			await scheduleTasksWithAI(tasksToSchedule, customPreferences, userProfile, finalInstructions);
			
			// Close dialog on success
			onClose();
		} catch (error) {
			console.error('Failed to schedule tasks:', error);
			// Error handling is done in the hook with toast notifications
		}
	};

	const handleClose = () => {
		// Reset state
		setSchedulingMode('unscheduled');
		setSelectedBoardId(null);
		setTimeEstimateMode('keep');
		setSelectedTaskIds(new Set());
		setCustomInstructions('');
		setSchedulingStartDate(() => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			return tomorrow.toISOString().split('T')[0];
		});
		setMaxDaysAhead(14);
		setRespectWorkingHours(true);
		setGroupSimilarTasks(true);
		setPrioritizeUrgent(true);
		setAllowOverlap(false);
		onClose();
	};

	const getPriorityColor = (priority: number) => {
		switch (priority) {
			case 1: return 'bg-red-100 text-red-800 border-red-200';
			case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
			case 3: return 'bg-blue-100 text-blue-800 border-blue-200';
			case 4: return 'bg-gray-100 text-gray-800 border-gray-200';
			default: return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	};

	const getPriorityLabel = (priority: number) => {
		switch (priority) {
			case 1: return 'High';
			case 2: return 'Medium';
			case 3: return 'Low';
			case 4: return 'Backlog';
			default: return 'Unknown';
		}
	};

	const isProcessing = isScheduling || isEstimating;

	if (!userPreferences || !userProfile) {
		return (
			<Dialog open={isOpen} onOpenChange={handleClose}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<AlertCircle className="h-5 w-5 text-amber-500" />
							AI Scheduling Unavailable
						</DialogTitle>
						<DialogDescription>
							User settings are not loaded. Please try again later.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button onClick={handleClose}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	if (!userPreferences.autoScheduleEnabled) {
		return (
			<Dialog open={isOpen} onOpenChange={handleClose}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<AlertCircle className="h-5 w-5 text-amber-500" />
							AI Scheduling Disabled
						</DialogTitle>
						<DialogDescription>
							AI scheduling is currently disabled. Enable it in Settings → AI Scheduling to use this feature.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button onClick={handleClose}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="!max-w-4xl max-h-[90vh] flex flex-col p-0">
				<DialogHeader className="px-6 pt-6 pb-4 border-b bg-background">
					<DialogTitle className="flex items-center gap-3 text-xl">
						<Sparkles className="h-6 w-6 text-blue-600" />
						AI Task Scheduler
					</DialogTitle>
					<DialogDescription className="text-base">
						Let AI automatically schedule your tasks based on your preferences and availability.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto px-6 py-6">
					<div className="space-y-6">
						{/* Task Selection Section */}
						<Card>
							<CardHeader className="pb-4">
								<CardTitle className="text-lg">Select Tasks to Schedule</CardTitle>
								<CardDescription className="text-base">Choose which tasks you want AI to schedule</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div className="md:col-span-1">
										<Label className="text-sm font-medium">Scheduling Mode</Label>
										<Select value={schedulingMode} onValueChange={(value: SchedulingMode) => setSchedulingMode(value)}>
											<SelectTrigger className="h-10 mt-2">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="unscheduled">
													Unscheduled ({unscheduledTasks.length})
												</SelectItem>
												<SelectItem value="all">
													All Active ({availableTasks.length})
												</SelectItem>
												<SelectItem value="board">
													By Board
												</SelectItem>
												<SelectItem value="selected">
													Custom Selection
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
									
									{schedulingMode === 'board' && (
										<div className="md:col-span-1">
											<Label className="text-sm font-medium">Select Board</Label>
											<Select value={selectedBoardId?.toString() || ''} onValueChange={(value) => setSelectedBoardId(parseInt(value))}>
												<SelectTrigger className="h-10 mt-2">
													<SelectValue placeholder="Choose a board" />
												</SelectTrigger>
												<SelectContent>
													{boards.map(board => (
														<SelectItem key={board.id} value={board.id.toString()}>
															<div className="flex items-center gap-2">
																<div
																	className='w-3 h-3 rounded flex items-center justify-center text-white flex-shrink-0'
																	style={{ backgroundColor: board.color || '#3B82F6' }}
																>
																	{renderIcon(board.icon || 'Briefcase', 'h-2 w-2')}
																</div>
																{board.name}
																{board.isDefault && <span className="text-xs text-muted-foreground">(Default)</span>}
															</div>
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									)}
									
									<div className={cn("flex items-end", schedulingMode === 'board' ? "md:col-span-1" : "md:col-span-2")}>
										<div className="bg-muted/50 rounded-lg p-3 border flex-1">
											<div className="flex items-center gap-2 text-sm">
												<CheckCircle2 className="h-4 w-4 text-green-600" />
												<span className="font-medium">
													{tasksToSchedule.length} task{tasksToSchedule.length !== 1 ? 's' : ''} selected
												</span>
												{tasksToSchedule.length > 0 && (
													<span className="text-muted-foreground">
														({Math.round(tasksToSchedule.reduce((sum, task) => sum + (task.timeEstimate || 0), 0))} min total)
													</span>
												)}
											</div>
										</div>
									</div>
								</div>

								{schedulingMode === 'selected' && (
									<div className="space-y-3">
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={handleSelectAll}
												className="flex-1"
											>
												Select All
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={handleSelectNone}
												className="flex-1"
											>
												Select None
											</Button>
										</div>
										
										<div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/20">
											{availableTasks.length === 0 ? (
												<p className="text-sm text-muted-foreground text-center py-6">
													No active tasks available
												</p>
											) : (
												availableTasks.map(task => {
													const taskBoard = getTaskBoard(task);
													return (
														<div key={task.id} className="flex items-start space-x-3 p-2 rounded hover:bg-background/80 border border-transparent hover:border-border/50 transition-colors">
															<Checkbox
																id={`task-${task.id}`}
																checked={selectedTaskIds.has(task.id)}
																onCheckedChange={() => handleTaskToggle(task.id)}
																className="mt-0.5"
															/>
															<div className="flex-1 min-w-0">
																<label 
																	htmlFor={`task-${task.id}`}
																	className="text-sm font-medium cursor-pointer block"
																>
																	{task.title}
																</label>
																<div className="flex items-center gap-2 mt-1">
																	{taskBoard && (
																		<Badge variant="outline" className="text-xs">
																			<div
																				className='w-2 h-2 rounded mr-1'
																				style={{ backgroundColor: taskBoard.color || '#3B82F6' }}
																			/>
																			{taskBoard.name}
																		</Badge>
																	)}
																	<Badge 
																		variant="outline" 
																		className={cn("text-xs", getPriorityColor(task.priority))}
																	>
																		{getPriorityLabel(task.priority)}
																	</Badge>
																	{task.timeEstimate > 0 && (
																		<Badge variant="secondary" className="text-xs">
																			<Clock className="h-3 w-3 mr-1" />
																			{Math.round(task.timeEstimate)} min
																		</Badge>
																	)}
																	{task.scheduledDate && (
																		<Badge variant="outline" className="text-xs">
																			<Calendar className="h-3 w-3 mr-1" />
																			{format(new Date(task.scheduledDate), 'MMM d')}
																		</Badge>
																	)}
																</div>
															</div>
														</div>
													);
												})
											)}
										</div>
									</div>
								)}

								{/* Show tasks for board mode */}
								{schedulingMode === 'board' && selectedBoardId && (
									<div className="space-y-3">
										<div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/20">
											{tasksToSchedule.length === 0 ? (
												<p className="text-sm text-muted-foreground text-center py-6">
													No active tasks in selected board
												</p>
											) : (
												tasksToSchedule.map(task => {
													const taskBoard = getTaskBoard(task);
													return (
														<div key={task.id} className="flex items-start space-x-3 p-2 rounded bg-background/80 border border-border/50">
															<div className="flex-1 min-w-0">
																<div className="text-sm font-medium">
																	{task.title}
																</div>
																<div className="flex items-center gap-2 mt-1">
																	{taskBoard && (
																		<Badge variant="outline" className="text-xs">
																			<div
																				className='w-2 h-2 rounded mr-1'
																				style={{ backgroundColor: taskBoard.color || '#3B82F6' }}
																			/>
																			{taskBoard.name}
																		</Badge>
																	)}
																	<Badge 
																		variant="outline" 
																		className={cn("text-xs", getPriorityColor(task.priority))}
																	>
																		{getPriorityLabel(task.priority)}
																	</Badge>
																	{task.timeEstimate > 0 && (
																		<Badge variant="secondary" className="text-xs">
																			<Clock className="h-3 w-3 mr-1" />
																			{Math.round(task.timeEstimate)} min
																		</Badge>
																	)}
																	{task.scheduledDate && (
																		<Badge variant="outline" className="text-xs">
																			<Calendar className="h-3 w-3 mr-1" />
																			{format(new Date(task.scheduledDate), 'MMM d')}
																		</Badge>
																	)}
																</div>
															</div>
														</div>
													);
												})
											)}
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Scheduling Options Section */}
						<Card>
							<CardHeader className="pb-4">
								<CardTitle className="text-lg">Scheduling Options</CardTitle>
								<CardDescription className="text-base">Configure how tasks should be scheduled</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
									<div>
										<Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
										<Input
											id="start-date"
											type="date"
											value={schedulingStartDate}
											onChange={(e) => setSchedulingStartDate(e.target.value)}
											min={new Date().toISOString().split('T')[0]}
											className="h-10 mt-2"
										/>
									</div>
									<div>
										<Label htmlFor="max-days" className="text-sm font-medium">Max Days</Label>
										<Input
											id="max-days"
											type="number"
											min="1"
											max="90"
											value={maxDaysAhead}
											onChange={(e) => setMaxDaysAhead(parseInt(e.target.value) || 14)}
											className="h-10 mt-2"
										/>
									</div>
									<div>
										<Label className="text-sm font-medium">Time Estimates</Label>
										<Select value={timeEstimateMode} onValueChange={(value: TimeEstimateMode) => setTimeEstimateMode(value)}>
											<SelectTrigger className="h-10 mt-2">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="keep">Keep Current</SelectItem>
												<SelectItem value="update">Update with AI</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="flex items-end">
										<div className="space-y-2 w-full">
											<div className="flex items-center space-x-2">
												<Checkbox
													id="respect-hours"
													checked={respectWorkingHours}
													onCheckedChange={(checked) => setRespectWorkingHours(checked === true)}
												/>
												<Label htmlFor="respect-hours" className="text-sm">
													Working hours
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="group-similar"
													checked={groupSimilarTasks}
													onCheckedChange={(checked) => setGroupSimilarTasks(checked === true)}
												/>
												<Label htmlFor="group-similar" className="text-sm">
													Group similar
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="prioritize-urgent"
													checked={prioritizeUrgent}
													onCheckedChange={(checked) => setPrioritizeUrgent(checked === true)}
												/>
												<Label htmlFor="prioritize-urgent" className="text-sm">
													Prioritize urgent
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<Checkbox
													id="allow-overlap"
													checked={allowOverlap}
													onCheckedChange={(checked) => setAllowOverlap(checked === true)}
												/>
												<Label htmlFor="allow-overlap" className="text-sm flex items-center gap-1">
													<GitMerge className="h-3 w-3" />
													Allow overlap
												</Label>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Custom Instructions Section */}
						<Card>
							<CardHeader className="pb-4">
								<CardTitle className="text-lg">Custom Instructions</CardTitle>
								<CardDescription className="text-base">Add specific instructions for the AI scheduler</CardDescription>
							</CardHeader>
							<CardContent>
								<Textarea
									placeholder="e.g., 'Schedule coding tasks in the morning when I'm most focused', 'Avoid scheduling meetings after 4 PM'..."
									value={customInstructions}
									onChange={(e) => setCustomInstructions(e.target.value)}
									className="min-h-[100px] resize-none"
									maxLength={500}
								/>
								<p className="text-xs text-muted-foreground mt-2">
									{customInstructions.length}/500 characters
								</p>
							</CardContent>
						</Card>
					</div>
				</div>

				<DialogFooter className="flex-col sm:flex-row gap-3 px-6 py-4 border-t bg-background">
					<div className="flex-1 text-left">
						{tasksToSchedule.length === 0 && (
							<p className="text-sm text-muted-foreground">
								Select at least one task to schedule
							</p>
						)}
					</div>
					<div className="flex gap-3">
						<Button
							variant="outline"
							onClick={handleClose}
							disabled={isProcessing}
							className="px-6 h-10"
						>
							Cancel
						</Button>
						<Button
							onClick={handleSchedule}
							disabled={isProcessing || tasksToSchedule.length === 0}
							className="gap-2 px-6 h-10"
						>
							{isScheduling ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Scheduling...
								</>
							) : isEstimating ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Updating Estimates...
								</>
							) : (
								<>
									<Sparkles className="h-4 w-4" />
									Schedule {tasksToSchedule.length} Task{tasksToSchedule.length !== 1 ? 's' : ''}
								</>
							)}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
} 