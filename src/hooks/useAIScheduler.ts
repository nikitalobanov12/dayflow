import { useState } from 'react';
import { toast } from 'sonner';
import { Task, UserPreferences, Profile } from '@/types';
import { scheduleTasksWithAI, getAITimeEstimates, AIScheduleResponse } from '@/lib/aiScheduler';
import { useSupabaseDatabase } from './useSupabaseDatabase';

export interface UseAISchedulerReturn {
	isScheduling: boolean;
	isEstimating: boolean;
	scheduleTasksWithAI: (tasks: Task[], userPreferences: UserPreferences, userProfile: Profile, customInstructions?: string) => Promise<AIScheduleResponse | null>;
	rescheduleAllTasksWithAI: (tasks: Task[], userPreferences: UserPreferences, userProfile: Profile) => Promise<boolean>;
	updateTimeEstimatesWithAI: (tasks: Task[], userPreferences: UserPreferences, userProfile: Profile) => Promise<boolean>;
	lastScheduleResult: AIScheduleResponse | null;
}

export function useAIScheduler(): UseAISchedulerReturn {
	const [isScheduling, setIsScheduling] = useState(false);
	const [isEstimating, setIsEstimating] = useState(false);
	const [lastScheduleResult, setLastScheduleResult] = useState<AIScheduleResponse | null>(null);
	
	const { updateTask } = useSupabaseDatabase();

	const rescheduleAllTasksWithAI = async (
		tasks: Task[],
		userPreferences: UserPreferences,
		userProfile: Profile
	): Promise<boolean> => {
		const activeTasks = tasks.filter(task => task.status !== 'done');
		const result = await scheduleTasksWithAIHandler(activeTasks, userPreferences, userProfile, 'Reschedule all tasks based on current priorities and calendar events.');
		return !!result;
	};

	const scheduleTasksWithAIHandler = async (
		tasks: Task[], 
		userPreferences: UserPreferences,
		userProfile: Profile,
		customInstructions?: string
	): Promise<AIScheduleResponse | null> => {
		if (isScheduling) {
			toast.warning('AI scheduling is already in progress');
			return null;
		}

		if (!userPreferences.autoScheduleEnabled) {
			toast.error('AI scheduling is not enabled. Please enable it in settings.');
			return null;
		}

		if (tasks.length === 0) {
			toast.warning('No tasks to schedule');
			return null;
		}

		setIsScheduling(true);
		
		try {
			toast.loading('AI is analyzing and scheduling your tasks...', {
				id: 'ai-scheduling',
			});

			const result = await scheduleTasksWithAI({
				tasks,
				userPreferences,
				userProfile,
				customInstructions,
			});

			// Update tasks in the database with optimistic updates
			const updatePromises = result.scheduledTasks.map(task => {
				const originalTask = tasks.find(t => t.id === task.id);
				if (originalTask && (
					originalTask.scheduledDate !== task.scheduledDate ||
					originalTask.timeEstimate !== task.timeEstimate
				)) {
					return updateTask(task.id, {
						scheduledDate: task.scheduledDate,
						timeEstimate: task.timeEstimate,
					});
				}
				return Promise.resolve();
			});

			await Promise.allSettled(updatePromises);

			setLastScheduleResult(result);

			// Show success message with summary
			const scheduledCount = result.scheduledTasks.filter(t => t.scheduledDate).length;
			const totalHours = Math.round(result.totalTimeScheduled / 60 * 10) / 10;
			
			toast.success(
				`AI scheduling complete! Scheduled ${scheduledCount} tasks (${totalHours} hours total)`,
				{
					id: 'ai-scheduling',
					description: result.suggestions.length > 0 
						? `Suggestion: ${result.suggestions[0]}`
						: undefined,
					duration: 5000,
				}
			);

			// Show additional suggestions if any
			if (result.suggestions.length > 1) {
				result.suggestions.slice(1, 3).forEach((suggestion, index) => {
					setTimeout(() => {
						toast.info(`AI Insight: ${suggestion}`, {
							duration: 4000,
						});
					}, (index + 1) * 1000);
				});
			}

			return result;

		} catch (error) {
			console.error('AI scheduling failed:', error);
			
			toast.error(
				'Failed to schedule tasks with AI',
				{
					id: 'ai-scheduling',
					description: error instanceof Error ? error.message : 'Unknown error occurred',
					duration: 5000,
				}
			);

			return null;
		} finally {
			setIsScheduling(false);
		}
	};

	const updateTimeEstimatesWithAI = async (
		tasks: Task[], 
		userPreferences: UserPreferences,
		userProfile: Profile
	): Promise<boolean> => {
		if (isEstimating) {
			toast.warning('AI time estimation is already in progress');
			return false;
		}

		if (tasks.length === 0) {
			toast.warning('No tasks to estimate');
			return false;
		}

		setIsEstimating(true);

		try {
			toast.loading('AI is analyzing task complexity and updating time estimates...', {
				id: 'ai-estimation',
			});

			const estimates = await getAITimeEstimates(tasks, userPreferences, userProfile);
			
			// Update tasks with new time estimates
			const updatePromises = Object.entries(estimates).map(([taskIdStr, estimate]) => {
				const taskId = parseInt(taskIdStr, 10);
				const task = tasks.find(t => t.id === taskId);
				
				if (task && task.timeEstimate !== estimate) {
					return updateTask(taskId, { timeEstimate: estimate });
				}
				return Promise.resolve();
			});

			await Promise.allSettled(updatePromises);

			const updatedCount = Object.keys(estimates).length;
			
			toast.success(
				`AI updated time estimates for ${updatedCount} tasks`,
				{
					id: 'ai-estimation',
					duration: 3000,
				}
			);

			return true;

		} catch (error) {
			console.error('AI time estimation failed:', error);
			
			toast.error(
				'Failed to update time estimates with AI',
				{
					id: 'ai-estimation',
					description: error instanceof Error ? error.message : 'Unknown error occurred',
					duration: 5000,
				}
			);

			return false;
		} finally {
			setIsEstimating(false);
		}
	};

	return {
		isScheduling,
		isEstimating,
		scheduleTasksWithAI: scheduleTasksWithAIHandler,
		rescheduleAllTasksWithAI,
		updateTimeEstimatesWithAI,
		lastScheduleResult,
	};
} 