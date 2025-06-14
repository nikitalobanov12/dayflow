import { Task, Board } from '@/types';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Calendar, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskDisplayProps {
	task: Task;
	boardInfo?: Board | null;
	userPreferences?: any;
	showBoardInfo?: boolean;
	showTitle?: boolean;
	showDescription?: boolean;
	showDates?: boolean;
	showRecurring?: boolean;
	className?: string;
}

export function TaskDisplay({ 
	task, 
	boardInfo, 
	userPreferences, 
	showBoardInfo = true,
	showTitle = true,
	showDescription = true,
	showDates = true,
	showRecurring = true,
	className 
}: TaskDisplayProps) {
	const { formatDate } = useUserPreferences(userPreferences);

	const getPriorityStyle = (priority: Task['priority']) => {
		switch (priority) {
			case 1: // Low
				return {
					color: '#0ea5e9', // sky-500
					bgColor: '#e0f2fe', // sky-100
					darkBgColor: '#0c4a6e', // sky-900
				};
			case 2: // Medium
				return {
					color: '#eab308', // yellow-500
					bgColor: '#fefce8', // yellow-50
					darkBgColor: '#713f12', // yellow-900
				};
			case 3: // High
				return {
					color: '#f97316', // orange-500
					bgColor: '#fff7ed', // orange-50
					darkBgColor: '#9a3412', // orange-900
				};
			case 4: // Critical
				return {
					color: '#ef4444', // red-500
					bgColor: '#fef2f2', // red-50
					darkBgColor: '#7f1d1d', // red-900
				};
			default:
				return {
					color: '#64748b', // gray-500
					bgColor: '#f1f5f9', // gray-100
					darkBgColor: '#1e293b', // gray-800
				};
		}
	};

	const getRecurringText = (task: Task) => {
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
	};

	const priorityStyle = getPriorityStyle(task.priority);

	return (
		<div className={cn('space-y-2', className)}>
			{/* Board info and priority */}
			{showBoardInfo && boardInfo && (
				<div className='flex items-center gap-2'>
					<div
						className='w-2 h-2 rounded-full'
						style={{ backgroundColor: boardInfo.color || '#3B82F6' }}
					/>
					<span className='text-xs text-muted-foreground font-medium'>{boardInfo.name}</span>
					
					{/* Priority indicator */}
					<div
						className='flex items-center justify-center w-4 h-4 rounded-full text-xs font-semibold'
						style={{
							backgroundColor: priorityStyle.bgColor,
							color: priorityStyle.color,
						}}
						title={`Priority: ${task.priority} (${task.priority === 1 ? 'Low' : task.priority === 2 ? 'Medium' : task.priority === 3 ? 'High' : 'Critical'})`}
					>
						{task.priority}
					</div>
				</div>
			)}
			
			{/* Title */}
			{showTitle && (
				<h3 className={cn('font-medium text-sm', task.status === 'done' ? 'line-through text-muted-foreground' : '')}>
					{task.title}
				</h3>
			)}
			
			{/* Description */}
			{showDescription && task.description && task.description.trim() !== '' && (
				<p className='text-xs text-muted-foreground line-clamp-2'>
					{task.description}
				</p>
			)}
			
			{/* Dates */}
			{showDates && (task.dueDate || task.startDate || task.scheduledDate) && (
				<div className='flex flex-wrap gap-1'>
					{task.dueDate && (
						<div className='flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 rounded text-xs'>
							<Calendar className='h-3 w-3' />
							<span>Due: {formatDate(task.dueDate)}</span>
						</div>
					)}
					{task.startDate && (
						<div className='flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 rounded text-xs'>
							<Calendar className='h-3 w-3' />
							<span>Start: {formatDate(task.startDate)}</span>
						</div>
					)}
					{task.scheduledDate && !task.startDate && (
						<div className='flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 rounded text-xs'>
							<Calendar className='h-3 w-3' />
							<span>Scheduled: {formatDate(task.scheduledDate)}</span>
						</div>
					)}
				</div>
			)}
			
			{/* Recurring indicator */}
			{showRecurring && task.recurring && (
				<div className="flex items-center gap-1 text-xs text-muted-foreground">
					<Repeat className="h-3 w-3" />
					<span>{getRecurringText(task)}</span>
				</div>
			)}
		</div>
	);
} 