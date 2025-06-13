import { Task, RecurringConfig } from '../types';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { recurringInstanceDatabase } from './recurring-instance-database';

// Helper function to create a unique identifier for recurring instances
function createRecurringInstanceId(originalId: number, date: Date): string {
  return `${originalId}-${date.toISOString().split('T')[0]}`;
}

// Helper function to parse recurring instance ID
function parseRecurringInstanceId(instanceId: string): { originalId: number; date: string } | null {
  const parts = instanceId.split('-');
  if (parts.length >= 4) {
    const originalId = parseInt(parts[0]);
    const date = parts.slice(1).join('-');
    return { originalId, date };
  }
  return null;
}

export async function generateRecurringInstances(
  task: Task,
  startDate: Date,
  endDate: Date,
  completedInstances?: Map<string, boolean>
): Promise<Task[]> {
  if (!task.recurring) return [task];

  const instances: Task[] = [];
  const { pattern, interval, endDate: recurringEndDate } = task.recurring;
  const stopDate = recurringEndDate ? new Date(recurringEndDate) : endDate;
  
  // Get completion status from database if not provided
  const completionMap = completedInstances || await recurringInstanceDatabase.getCompletionMap(task.id);
  
  // Start from the original task's scheduled date, not the view start date
  const originalDate = task.scheduledDate ? new Date(task.scheduledDate) : new Date();

  if (pattern === 'weekly' && task.recurring.daysOfWeek?.length) {
    // Special handling for weekly tasks with specific days of the week
    const startOfWeekDate = new Date(originalDate);
    startOfWeekDate.setDate(startOfWeekDate.getDate() - startOfWeekDate.getDay()); // Go to Sunday of that week
    
    let currentWeekStart = new Date(startOfWeekDate);
    
    // Move to the first week that intersects with our view range
    while (addDays(currentWeekStart, 6) < startDate) {
      currentWeekStart = addWeeks(currentWeekStart, interval);
    }
    
    while (currentWeekStart <= endDate && currentWeekStart <= stopDate) {
      // For each specified day of the week in this week
      for (const dayOfWeek of task.recurring.daysOfWeek) {
        const instanceDate = addDays(currentWeekStart, dayOfWeek);
        
        // Only add if it's within our date range and after the original task date
        if (instanceDate >= startDate && 
            instanceDate <= endDate && 
            instanceDate <= stopDate &&
            instanceDate >= originalDate) {
          const instance = createTaskInstance(task, instanceDate, completionMap);
          instances.push(instance);
        }
      }
      
      // Move to next week interval
      currentWeekStart = addWeeks(currentWeekStart, interval);
      
      // Stop if we've reached the recurring end date
      if (recurringEndDate && currentWeekStart > new Date(recurringEndDate)) {
        break;
      }
    }
  } else {
    // Original logic for daily, monthly, yearly, and weekly without specific days
    let currentDate = new Date(originalDate);

    // First, add instances before the view start date if the original task is before it
    if (originalDate < startDate) {
      // Calculate how many intervals we need to skip to get to the first instance in the view
      let tempDate = new Date(originalDate);
      while (tempDate < startDate && tempDate < stopDate) {
        if (tempDate >= startDate && isValidRecurrenceDate(tempDate, task.recurring)) {
          const instance = createTaskInstance(task, tempDate, completionMap);
          instances.push(instance);
        }
        
        // Move to next occurrence
        switch (pattern) {
          case 'daily':
            tempDate = addDays(tempDate, interval);
            break;
          case 'weekly':
            tempDate = addWeeks(tempDate, interval);
            break;
          case 'monthly':
            tempDate = addMonths(tempDate, interval);
            break;
          case 'yearly':
            tempDate = addYears(tempDate, interval);
            break;
        }
      }
      currentDate = new Date(tempDate);
    }

    // Generate instances within the visible date range
    while (currentDate <= endDate && currentDate <= stopDate) {
      if (isValidRecurrenceDate(currentDate, task.recurring)) {
        const instance = createTaskInstance(task, currentDate, completionMap);
        instances.push(instance);
      }

      // Move to next occurrence
      switch (pattern) {
        case 'daily':
          currentDate = addDays(currentDate, interval);
          break;
        case 'weekly':
          currentDate = addWeeks(currentDate, interval);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, interval);
          break;
        case 'yearly':
          currentDate = addYears(currentDate, interval);
          break;
      }

      // Stop if we've reached the recurring end date
      if (recurringEndDate && currentDate > new Date(recurringEndDate)) {
        break;
      }
    }
  }

  return instances;
}

function isValidRecurrenceDate(date: Date, config: RecurringConfig): boolean {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;

  if (config.pattern === 'weekly' && config.daysOfWeek?.length) {
    return config.daysOfWeek.includes(dayOfWeek);
  }

  if (config.pattern === 'monthly' && config.daysOfMonth?.length) {
    return config.daysOfMonth.includes(dayOfMonth);
  }

  if (config.pattern === 'yearly' && config.monthsOfYear?.length) {
    return config.monthsOfYear.includes(month);
  }

  return true;
}

function createTaskInstance(task: Task, date: Date, completedInstances: Map<string, boolean> = new Map()): Task {
  const instance = { ...task };
  
  // Create unique ID for this instance
  const instanceId = createRecurringInstanceId(task.id, date);
  
  // Use the original task ID as the base, but add instance info
  instance.id = task.id; // Keep original ID for database operations
  instance.recurringInstanceId = instanceId; // Add instance identifier
  
  instance.createdAt = date.toISOString();
  
  // Preserve the time from the original task's scheduled date
  const originalDate = task.scheduledDate ? new Date(task.scheduledDate) : new Date();
  const newDate = new Date(date);
  newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());
  instance.scheduledDate = newDate.toISOString();
  
  // Check if this specific instance is completed
  const isCompleted = completedInstances.get(instanceId) || false;
  
  // Set completion status for this instance
  if (isCompleted) {
    instance.completedAt = new Date().toISOString();
    instance.status = 'done';
    instance.progressPercentage = 100;
  } else {
    instance.completedAt = undefined;
    instance.progressPercentage = 0;
    instance.timeSpent = 0;
    
    // Don't override status if it's already 'done' (original task completed)
    if (instance.status === 'done') {
      instance.status = 'backlog';
    }
  }

  return instance;
}

export function getNextOccurrence(task: Task): Date | null {
  if (!task.recurring) return null;

  const now = new Date();
  const { pattern, interval } = task.recurring;
  let nextDate = new Date(now);

  // Find the next valid date based on the pattern
  while (!isValidRecurrenceDate(nextDate, task.recurring)) {
    switch (pattern) {
      case 'daily':
        nextDate = addDays(nextDate, interval);
        break;
      case 'weekly':
        nextDate = addWeeks(nextDate, interval);
        break;
      case 'monthly':
        nextDate = addMonths(nextDate, interval);
        break;
      case 'yearly':
        nextDate = addYears(nextDate, interval);
        break;
    }
  }

  return nextDate;
}

export function isRecurringTask(task: Task): boolean {
  return !!task.recurring;
}

export function getRecurringDescription(task: Task): string {
  if (!task.recurring) return '';

  const { pattern, interval } = task.recurring;
  let description = '';

  switch (pattern) {
    case 'daily':
      description = interval === 1 ? 'Daily' : `Every ${interval} days`;
      break;
    case 'weekly':
      description = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      if (task.recurring.daysOfWeek?.length) {
        const days = task.recurring.daysOfWeek
          .map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
          .join(', ');
        description += ` on ${days}`;
      }
      break;
    case 'monthly':
      description = interval === 1 ? 'Monthly' : `Every ${interval} months`;
      if (task.recurring.daysOfMonth?.length) {
        const days = task.recurring.daysOfMonth
          .map(d => d + (d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'))
          .join(', ');
        description += ` on the ${days}`;
      }
      break;
    case 'yearly':
      description = interval === 1 ? 'Yearly' : `Every ${interval} years`;
      if (task.recurring.monthsOfYear?.length) {
        const months = task.recurring.monthsOfYear
          .map(m => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1])
          .join(', ');
        description += ` in ${months}`;
      }
      break;
  }

  if (task.recurring.endDate) {
    description += ` until ${new Date(task.recurring.endDate).toLocaleDateString()}`;
  }

  return description;
}

// Helper functions to work with recurring instance IDs
export { createRecurringInstanceId, parseRecurringInstanceId }; 