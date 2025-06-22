import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, Loader2 } from 'lucide-react';
import { useAIScheduler } from '@/hooks/useAIScheduler';
import { Task, UserPreferences, Board, Profile } from '@/types';
import { cn } from '@/lib/utils';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { AISchedulingDialog } from './AISchedulingDialog';

interface AISchedulerButtonProps {
	tasks: Task[];
	boards: Board[];
	userPreferences: UserPreferences | null;
	userProfile: Profile | null;
	variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive' | 'link';
	size?: 'default' | 'sm' | 'lg' | 'icon';
	className?: string;
	showDropdown?: boolean;
	compact?: boolean;
	onOpenSettings?: () => void;
}

export function AISchedulerButton({
	tasks,
	boards,
	userPreferences,
	userProfile,
	variant = 'default',
	size = 'default',
	className,
	showDropdown = true,
	compact = false,
	onOpenSettings,
}: AISchedulerButtonProps) {
	const {
		isScheduling,
		isEstimating,
		updateTimeEstimatesWithAI,
		rescheduleAllTasksWithAI,
	} = useAIScheduler();

	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const isProcessing = isScheduling || isEstimating;

	const handleOpenDialog = () => {
		setIsDialogOpen(true);
	};

	const handleReschedule = async () => {
		if (!userPreferences || !userProfile || tasks.length === 0) return;
		await rescheduleAllTasksWithAI(tasks, userPreferences, userProfile);
	};

	const handleUpdateTimeEstimates = async () => {
		if (!userPreferences || !userProfile || tasks.length === 0) return;
		const activeTasks = tasks.filter(task => task.status !== 'done');
		await updateTimeEstimatesWithAI(activeTasks, userPreferences, userProfile);
	};

	if (!userPreferences || !userProfile) {
		return (
			<Button
				variant="ghost"
				size={size}
				disabled
				className={cn('gap-2', className)}
			>
				<Sparkles className="h-4 w-4" />
				{!compact && 'AI Scheduler'}
			</Button>
		);
	}

	if (!userPreferences.autoScheduleEnabled) {
		return (
			<Button
				variant="outline"
				size={size}
				onClick={onOpenSettings}
				className={cn('gap-2 opacity-75 hover:opacity-100', className)}
				title="AI scheduling is disabled. Click to enable it in Settings."
			>
				<Sparkles className="h-4 w-4" />
				{!compact && 'Enable AI'}
			</Button>
		);
	}

	// Simple button mode (no dropdown)
	if (!showDropdown) {
		return (
			<>
				<Button
					variant={variant}
					size={size}
					onClick={handleOpenDialog}
					disabled={isProcessing}
					className={cn('gap-2', className)}
					title="Open AI Scheduler"
				>
					{isProcessing ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Sparkles className="h-4 w-4" />
					)}
					{!compact && (isProcessing ? 'AI is working...' : 'AI Assistant')}
				</Button>
				<AISchedulingDialog
					isOpen={isDialogOpen}
					onClose={() => setIsDialogOpen(false)}
					tasks={tasks}
					boards={boards}
					userPreferences={userPreferences}
					userProfile={userProfile}
				/>
			</>
		);
	}

	// Dropdown menu mode
	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant={variant}
						size={size}
						disabled={isProcessing}
						className={cn('gap-2', className)}
					>
						{isProcessing ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Sparkles className="h-4 w-4" />
						)}
						{!compact &&
							(isScheduling
								? 'Scheduling...'
								: isEstimating
								? 'Estimating...'
								: 'Reschedule with AI')}
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end" className="w-64">
					<DropdownMenuLabel>AI Assistant</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={handleReschedule}
						disabled={tasks.length === 0 || isProcessing}
						className="gap-2"
					>
						<Sparkles className="h-4 w-4 text-blue-500" />
						<div>
							<span>Reschedule My Day</span>
							<p className="text-xs text-muted-foreground">
								Let AI optimize your entire task schedule.
							</p>
						</div>
					</DropdownMenuItem>

					<DropdownMenuItem
						onClick={handleUpdateTimeEstimates}
						disabled={tasks.length === 0 || isProcessing}
						className="gap-2"
					>
						<Clock className="h-4 w-4" />
						<div>
							<span>Update Time Estimates</span>
							<p className="text-xs text-muted-foreground">
								Use AI to refine task durations.
							</p>
						</div>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={handleOpenDialog}
						disabled={isProcessing}
						className="gap-2"
					>
						<Sparkles className="h-4 w-4" />
						<div className="flex flex-col items-start">
							<span>Advanced Scheduling...</span>
							<span className="text-xs text-muted-foreground">
								Open the full AI scheduling dialog
							</span>
						</div>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<AISchedulingDialog
				isOpen={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				tasks={tasks}
				boards={boards}
				userPreferences={userPreferences}
				userProfile={userProfile}
			/>
		</>
	);
} 