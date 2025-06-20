import { useCallback } from 'react';
import { Task, UserPreferences } from '@/types';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface TaskOperationHandlers {
	onEdit: (task: Task) => void;
	onDuplicate?: (task: Task) => void | Promise<void>;
	onDelete?: (taskId: number) => void | Promise<void>;
	onUpdateTask?: (id: number, updates: Partial<Task>) => Promise<void>;
	onMoveTask?: (taskId: number, newStatus: Task['status']) => void | Promise<void>;
	onUpdateTimeEstimate?: (taskId: number, timeEstimate: number) => void | Promise<void>;
	onToggleComplete?: (taskId: number) => void;
}

export function useTaskOperations(
	task: Task,
	handlers: TaskOperationHandlers,
	userPreferences?: UserPreferences
) {
	const {
		onEdit,
		onDuplicate,
		onDelete,
		onUpdateTask,
		onMoveTask,
		onUpdateTimeEstimate,
		onToggleComplete,
	} = handlers;

	const { formatDate } = useUserPreferences(userPreferences);

	const handleEdit = () => {
		onEdit(task);
	};

	const handleDuplicate = async () => {
		if (onDuplicate) {
			await onDuplicate(task);
		}
	};

	const handleDelete = async () => {
		if (onDelete) {
			await onDelete(task.id);
		}
	};

	const handleToggleComplete = () => {
		if (onToggleComplete) {
			onToggleComplete(task.id);
		}
	};

	const handleQuickPriority = async (priority: 1 | 2 | 3 | 4) => {
		if (onUpdateTask) {
			await onUpdateTask(task.id, { priority });
		}
	};

	const handleQuickTime = async (timeEstimate: number) => {
		if (onUpdateTimeEstimate) {
			await onUpdateTimeEstimate(task.id, timeEstimate);
		}
	};

	const handleMoveToStatus = async (newStatus: Task['status']) => {
		if (onMoveTask) {
			await onMoveTask(task.id, newStatus);
		}
	};

	// Schedule handlers
	const handleScheduleToday = async () => {
		if (onUpdateTask && onMoveTask) {
			const today = new Date();
			today.setHours(9, 0, 0, 0);
			await onUpdateTask(task.id, { scheduledDate: today.toISOString() });
			await onMoveTask(task.id, 'today');
		}
	};

	const handleScheduleTomorrow = async () => {
		if (onUpdateTask && onMoveTask) {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(9, 0, 0, 0);
			await onUpdateTask(task.id, { scheduledDate: tomorrow.toISOString() });
			await onMoveTask(task.id, 'this-week');
		}
	};

	const handleScheduleThisWeekend = async () => {
		if (onUpdateTask && onMoveTask) {
			const now = new Date();
			const daysUntilSaturday = (6 - now.getDay()) % 7;
			const saturday = new Date(now);
			saturday.setDate(now.getDate() + daysUntilSaturday);
			saturday.setHours(10, 0, 0, 0);
			await onUpdateTask(task.id, { scheduledDate: saturday.toISOString() });
			await onMoveTask(task.id, 'this-week');
		}
	};

	const handleClearSchedule = async () => {
		if (onUpdateTask) {
			await onUpdateTask(task.id, { scheduledDate: undefined });
		}
	};

	// Recurring pattern handlers
	const handleSetRecurringPattern = async (pattern: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
		if (onUpdateTask) {
			await onUpdateTask(task.id, { 
				recurring: {
					pattern,
					interval: 1,
					daysOfWeek: [],
					daysOfMonth: [],
					monthsOfYear: []
				}
			});
		}
	};

	const handleClearRecurring = async () => {
		if (onUpdateTask) {
			await onUpdateTask(task.id, { 
				recurring: undefined
			});
		}
	};

	const getRecurringText = useCallback((task: Task) => {
		if (!task.recurring) return null;

		const { pattern, interval } = task.recurring;
		let text = '';

		switch (pattern) {
			case 'daily':
				text = interval === 1 ? 'Daily' : `Every ${interval} days`;
				break;
			case 'weekly':
				text = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
				if (task.recurring.daysOfWeek?.length) {
					const days = task.recurring.daysOfWeek
						.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
						.join(', ');
					text += ` on ${days}`;
				}
				break;
			case 'monthly':
				text = interval === 1 ? 'Monthly' : `Every ${interval} months`;
				if (task.recurring.daysOfMonth?.length) {
					const days = task.recurring.daysOfMonth
						.map(d => d + (d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'))
						.join(', ');
					text += ` on the ${days}`;
				}
				break;
			case 'yearly':
				text = interval === 1 ? 'Yearly' : `Every ${interval} years`;
				if (task.recurring.monthsOfYear?.length) {
					const months = task.recurring.monthsOfYear
						.map(m => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1])
						.join(', ');
					text += ` in ${months}`;
				}
				break;
		}

		if (task.recurring.endDate) {
			text += ` until ${formatDate(task.recurring.endDate)}`;
		}

		return text;
	}, [formatDate]);

	return {
		handleEdit,
		handleDuplicate,
		handleDelete,
		handleToggleComplete,
		handleQuickPriority,
		handleQuickTime,
		handleMoveToStatus,
		handleScheduleToday,
		handleScheduleTomorrow,
		handleScheduleThisWeekend,
		handleClearSchedule,
		handleSetRecurringPattern,
		handleClearRecurring,
		getRecurringText,
		formatDate,
	};
} 