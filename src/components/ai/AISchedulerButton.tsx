import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, Loader2 } from 'lucide-react';
import { useAIScheduler } from '@/hooks/useAIScheduler';
import { Task, UserPreferences, Board } from '@/types';
import { cn } from '@/lib/utils';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AISchedulingDialog } from './AISchedulingDialog';

interface AISchedulerButtonProps {
	tasks: Task[];
	boards: Board[];
	userPreferences: UserPreferences | null;
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
		updateTimeEstimatesWithAI
	} = useAIScheduler();

	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const isProcessing = isScheduling || isEstimating;

	const handleOpenDialog = () => {
		setIsDialogOpen(true);
	};

	const handleUpdateTimeEstimates = async () => {
		if (!userPreferences || tasks.length === 0) return;
		const activeTasks = tasks.filter(task => task.status !== 'done');
		await updateTimeEstimatesWithAI(activeTasks, userPreferences);
	};

	if (!userPreferences) {
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
					{!compact && (isProcessing ? 'Scheduling...' : 'AI Schedule')}
				</Button>
				<AISchedulingDialog
					isOpen={isDialogOpen}
					onClose={() => setIsDialogOpen(false)}
					tasks={tasks}
					boards={boards}
					userPreferences={userPreferences}
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
						{!compact && (
							isScheduling 
								? 'Scheduling...' 
								: isEstimating 
									? 'Estimating...'
									: 'AI Scheduler'
						)}
					</Button>
				</DropdownMenuTrigger>
				
				<DropdownMenuContent 
					align="end" 
					className="w-60"
				>
					<DropdownMenuItem
						onClick={handleOpenDialog}
						disabled={isProcessing}
						className="gap-2"
					>
						<Sparkles className="h-4 w-4" />
						<div className="flex flex-col items-start">
							<span>Open AI Scheduler</span>
							<span className="text-xs text-muted-foreground">
								Configure and schedule tasks with AI
							</span>
						</div>
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						onClick={handleUpdateTimeEstimates}
						disabled={tasks.length === 0 || isProcessing}
						className="gap-2"
					>
						<Clock className="h-4 w-4" />
						<div className="flex flex-col items-start">
							<span>Update Time Estimates</span>
							<span className="text-xs text-muted-foreground">
								AI will analyze and update task durations
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
			/>
		</>
	);
} 