import { Task } from '@/types';

/**
 * Gets the next upcoming task based on scheduled date, due date, or start date
 * Prioritizes tasks that are scheduled sooner and not yet completed
 */
export function getNextUpcomingTask(tasks: Task[]): Task | null {
  if (!tasks || tasks.length === 0) return null;

  const now = new Date();
  
  // Filter out completed tasks and get tasks with relevant dates
  const upcomingTasks = tasks
    .filter(task => {
      // Skip completed tasks
      if (task.status === 'done' || task.completedAt) return false;
      
      // Include tasks with scheduled date, due date, or start date
      return task.scheduledDate || task.dueDate || task.startDate;
    })
    .map(task => {
      // Determine the most relevant date for this task
      let relevantDate: Date | null = null;
      
      // Priority: scheduled date > due date > start date
      if (task.scheduledDate) {
        relevantDate = new Date(task.scheduledDate);
      } else if (task.dueDate) {
        relevantDate = new Date(task.dueDate);
      } else if (task.startDate) {
        relevantDate = new Date(task.startDate);
      }
      
      return {
        task,
        relevantDate,
        isOverdue: relevantDate ? relevantDate < now : false,
        isToday: relevantDate ? isSameDay(relevantDate, now) : false,
        isUpcoming: relevantDate ? relevantDate > now : false
      };
    })
    .filter(item => item.relevantDate !== null)
    .sort((a, b) => {
      // Sort by priority: overdue first, then today, then upcoming
      // Within each category, sort by date (earliest first)
      
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      
      if (a.isToday && !b.isToday) return -1;
      if (!a.isToday && b.isToday) return 1;
      
      // If both are in same category, sort by date
      return a.relevantDate!.getTime() - b.relevantDate!.getTime();
    });
  
  return upcomingTasks.length > 0 ? upcomingTasks[0].task : null;
}

/**
 * Gets a description of when the task is scheduled
 */
export function getTaskScheduleDescription(task: Task): string {
  // Priority: scheduled date > due date > start date
  let relevantDate: Date | null = null;
  let dateType = '';
  
  if (task.scheduledDate) {
    relevantDate = new Date(task.scheduledDate);
    dateType = 'Scheduled';
  } else if (task.dueDate) {
    relevantDate = new Date(task.dueDate);
    dateType = 'Due';
  } else if (task.startDate) {
    relevantDate = new Date(task.startDate);
    dateType = 'Starts';
  }
  
  if (!relevantDate) return '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const taskDate = new Date(relevantDate);
  taskDate.setHours(0, 0, 0, 0);
  
  const diffTime = taskDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `${dateType} today at ${relevantDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `${dateType} tomorrow at ${relevantDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === -1) {
    return `${dateType} yesterday (overdue)`;
  } else if (diffDays < 0) {
    return `${dateType} ${Math.abs(diffDays)} days ago (overdue)`;
  } else if (diffDays <= 7) {
    const dayName = relevantDate.toLocaleDateString([], { weekday: 'long' });
    return `${dateType} ${dayName} at ${relevantDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return `${dateType} ${relevantDate.toLocaleDateString()} at ${relevantDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}

/**
 * Check if two dates are on the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get priority color for the task
 */
export function getTaskPriorityColor(task: Task): string {
  switch (task.priority) {
    case 4: return 'text-red-600 dark:text-red-400'; // Critical
    case 3: return 'text-orange-600 dark:text-orange-400'; // High
    case 2: return 'text-blue-600 dark:text-blue-400'; // Medium
    case 1: return 'text-gray-600 dark:text-gray-400'; // Low
    default: return 'text-gray-600 dark:text-gray-400';
  }
}

/**
 * Get priority label for the task
 */
export function getTaskPriorityLabel(task: Task): string {
  switch (task.priority) {
    case 4: return 'Critical';
    case 3: return 'High';
    case 2: return 'Medium';
    case 1: return 'Low';
    default: return 'Medium';
  }
} 