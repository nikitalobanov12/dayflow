import { useState } from 'react';
import { Task } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Clock, Play, Timer as TimerIcon, Watch } from 'lucide-react';

export type SprintTimerType = 'pomodoro' | 'countdown' | 'stopwatch';

export interface SprintConfiguration {
	timerType: SprintTimerType;
	selectedTasks: Task[];
	taskOrder: number[]; // Array of task IDs in order
	pomodoroMinutes?: number; // Duration for pomodoro sessions
	countdownMinutes?: number; // Custom duration for countdown (overrides task estimates)
}

interface SprintConfigProps {
	availableTasks: Task[];
	onStartSprint: (config: SprintConfiguration) => void;
	onCancel: () => void;
}

export function SprintConfig({ availableTasks, onStartSprint, onCancel }: SprintConfigProps) {
	const [timerType, setTimerType] = useState<SprintTimerType>('countdown');
	const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set(availableTasks.map(task => task.id)));
	const [taskOrder, setTaskOrder] = useState<number[]>(availableTasks.map(task => task.id));
	const [pomodoroMinutes, setPomodoroMinutes] = useState<number>(25);
	const [countdownMinutes, setCountdownMinutes] = useState<number>(0); // 0 means use task estimates

	const selectedTasks = taskOrder
		.filter(id => selectedTaskIds.has(id))
		.map(id => availableTasks.find(task => task.id === id)!)
		.filter(Boolean);

	const totalEstimatedTime = selectedTasks.reduce((sum, task) => sum + task.timeEstimate, 0);

	const handleTaskToggle = (taskId: number, checked: boolean) => {
		const newSelectedIds = new Set(selectedTaskIds);
		if (checked) {
			newSelectedIds.add(taskId);
		} else {
			newSelectedIds.delete(taskId);
		}
		setSelectedTaskIds(newSelectedIds);
	};

	const handleDragEnd = (result: DropResult) => {
		if (!result.destination) return;

		const newTaskOrder = Array.from(taskOrder);
		const [reorderedItem] = newTaskOrder.splice(result.source.index, 1);
		newTaskOrder.splice(result.destination.index, 0, reorderedItem);

		setTaskOrder(newTaskOrder);
	};
	const handleStartSprint = () => {
		if (selectedTasks.length === 0) return;

		const config: SprintConfiguration = {
			timerType,
			selectedTasks,
			taskOrder: taskOrder.filter(id => selectedTaskIds.has(id)),
			pomodoroMinutes: timerType === 'pomodoro' ? pomodoroMinutes : undefined,
			countdownMinutes: timerType === 'countdown' && countdownMinutes > 0 ? countdownMinutes : undefined,
		};

		onStartSprint(config);
	};
	const getTimerDescription = (type: SprintTimerType) => {
		switch (type) {
			case 'pomodoro':
				return 'Work in 25-minute focused sessions with breaks';
			case 'countdown':
				return "Count down from each task's estimated time";
			case 'stopwatch':
				return 'Track time spent without time pressure';
		}
	};

	const formatTime = (minutes: number): string => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m`;
	};
	return (
		<Dialog
			open={true}
			onOpenChange={open => !open && onCancel()}
		>
			<DialogContent className='max-w-4xl w-[95vw] sm:max-w-4xl md:max-w-4xl lg:max-w-4xl max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<TimerIcon className='h-5 w-5' />
						Configure Sprint
					</DialogTitle>
					<DialogDescription>Choose your timer type and select tasks for your sprint</DialogDescription>
				</DialogHeader>

				<div className='space-y-6 '>
					<Card className=' '>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<TimerIcon className='h-5 w-5' />
								Timer Type
							</CardTitle>
							<CardDescription>Choose how you want to track time during your sprint</CardDescription>
						</CardHeader>
						<CardContent>
							<Select
								value={timerType}
								onValueChange={(value: string) => setTimerType(value as SprintTimerType)}
							>
								<SelectTrigger className='w-full'>
									<SelectValue placeholder='Select timer type' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='countdown'>
										<div className='flex items-center gap-2'>
											<Clock className='h-4 w-4' />
											<div>
												<div className='text-left'>Countdown Timer</div>
												<div className='text-xs text-muted-foreground'>Based on estimated time</div>
											</div>
										</div>
									</SelectItem>
									<SelectItem value='pomodoro'>
										<div className='flex items-center gap-2'>
											<TimerIcon className='h-4 w-4' />
											<div>
												<div className='text-left'>Pomodoro</div>
												<div className='text-xs text-muted-foreground'>25-minute focused sessions</div>
											</div>
										</div>
									</SelectItem>{' '}
									<SelectItem value='stopwatch'>
										<div className='flex items-center gap-2'>
											<Watch className='h-4 w-4' />
											<div>
												<div className='text-left'>Stopwatch</div>
												<div className='text-xs text-muted-foreground'>Track time without pressure</div>
											</div>
										</div>
									</SelectItem>
								</SelectContent>{' '}
							</Select>

							{/* Timer Duration Configuration */}
							{timerType === 'pomodoro' && (
								<div className='mt-4 space-y-2'>
									<label className='text-sm font-medium'>Pomodoro Duration (minutes)</label>
									<Input
										type='number'
										value={pomodoroMinutes}
										onChange={e => setPomodoroMinutes(Math.max(1, parseInt(e.target.value) || 25))}
										min='1'
										max='60'
										className='w-32'
									/>
									<p className='text-xs text-muted-foreground'>Typical range: 15-30 minutes</p>
								</div>
							)}

							{timerType === 'countdown' && (
								<div className='mt-4 space-y-2'>
									<label className='text-sm font-medium'>Timer Duration per Task</label>
									<div className='flex items-center gap-2'>
										<Input
											type='number'
											value={countdownMinutes || ''}
											onChange={e => setCountdownMinutes(parseInt(e.target.value) || 0)}
											placeholder='0 (use estimates)'
											min='0'
											max='999'
											className='w-40'
										/>
										<span className='text-sm text-muted-foreground'>minutes</span>
									</div>
									<p className='text-xs text-muted-foreground'>{countdownMinutes > 0 ? `Each task will have ${countdownMinutes} minutes regardless of estimate` : "Use each task's time estimate (recommended)"}</p>
								</div>
							)}

							<div className='mt-3 p-3 bg-accent/30 rounded-lg'>
								<p className='text-sm text-muted-foreground'>{getTimerDescription(timerType)}</p>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<div className='flex justify-between items-center'>
								<div>
									<CardTitle>Sprint Tasks</CardTitle>
									<CardDescription>Select and reorder tasks for your sprint</CardDescription>
								</div>
								<div className='text-right'>
									<Badge variant='secondary'>{selectedTasks.length} tasks selected</Badge>
									{totalEstimatedTime > 0 && <p className='text-xs text-muted-foreground mt-1'>~{formatTime(totalEstimatedTime)} estimated</p>}
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<DragDropContext onDragEnd={handleDragEnd}>
								{' '}
								<Droppable droppableId='sprint-tasks'>
									{(provided: any) => (
										<div
											{...provided.droppableProps}
											ref={provided.innerRef}
											className='space-y-2 w-full max-w-full overflow-hidden'
										>
											{taskOrder.map((taskId, index) => {
												const task = availableTasks.find(t => t.id === taskId);
												if (!task) return null;

												const isSelected = selectedTaskIds.has(taskId);

												return (
													<Draggable
														key={taskId}
														draggableId={taskId.toString()}
														index={index}
														isDragDisabled={!isSelected}
													>
														{(provided: any, snapshot: any) => (
															<div
																ref={provided.innerRef}
																{...provided.draggableProps}
																className={`
																flex items-center gap-3 p-3 rounded-lg border transition-all w-full max-w-full
																${isSelected ? 'bg-accent/50 border-primary/30' : 'bg-muted/30 border-border/30 opacity-60'}
																${snapshot.isDragging ? 'shadow-lg scale-105' : ''}
															`}
															>
																<Checkbox
																	checked={isSelected}
																	onCheckedChange={(checked: any) => handleTaskToggle(taskId, checked as boolean)}
																/>
																<div
																	{...provided.dragHandleProps}
																	className={`
																	p-1 rounded cursor-grab active:cursor-grabbing
																	${isSelected ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/50'}
																`}
																>
																	<GripVertical className='h-4 w-4' />
																</div>{' '}
																<div className='flex-1 min-w-0 overflow-hidden pr-2'>
																	<p className={`font-medium truncate ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{task.title}</p>
																	{task.description && <p className={`text-sm wrap-normal ${isSelected ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>{task.description}</p>}
																</div>
																{task.timeEstimate > 0 && (
																	<Badge
																		variant='outline'
																		className='text-xs'
																	>
																		{formatTime(task.timeEstimate)}
																	</Badge>
																)}
															</div>
														)}
													</Draggable>
												);
											})}
											{provided.placeholder}
										</div>
									)}
								</Droppable>
							</DragDropContext>

							{selectedTasks.length === 0 && (
								<div className='text-center py-8 text-muted-foreground'>
									<p className='text-sm'>No tasks selected</p>
									<p className='text-xs mt-1'>Select at least one task to start your sprint</p>
								</div>
							)}
						</CardContent>
					</Card>{' '}
					{/* Start Sprint Button */}
					<div className='flex justify-end gap-3'>
						<Button
							variant='outline'
							onClick={onCancel}
						>
							Cancel
						</Button>
						<Button
							onClick={handleStartSprint}
							disabled={selectedTasks.length === 0}
							className='flex items-center gap-2'
						>
							<Play className='h-4 w-4' />
							Start Sprint ({selectedTasks.length} tasks)
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
