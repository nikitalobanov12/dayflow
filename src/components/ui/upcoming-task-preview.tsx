import { AlertTriangle } from 'lucide-react';
import { Task } from '@/types';
import { getTaskScheduleDescription, getTaskPriorityColor, getTaskPriorityLabel } from '@/utils/taskUtils';
import { cn } from '@/lib/utils';

interface UpcomingTaskPreviewProps {
  task: Task | null;
  onClick?: (task: Task) => void;
  className?: string;
}

export function UpcomingTaskPreview({ task, onClick, className }: UpcomingTaskPreviewProps) {
  if (!task) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50', className)}>
        <span>No upcoming tasks</span>
      </div>
    );
  }

  const scheduleDescription = getTaskScheduleDescription(task);
  const priorityColor = getTaskPriorityColor(task);
  const priorityLabel = getTaskPriorityLabel(task);
  
  // Check if task is overdue
  const isOverdue = scheduleDescription.includes('overdue');
  
  return (
    <div 
      className={cn(
        'flex items-center gap-2 text-xs bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50 max-w-sm cursor-pointer hover:bg-muted/50 transition-colors',
        isOverdue && 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30',
        className
      )}
      onClick={() => onClick?.(task)}
      title={`Click to view task: ${task.title}`}
    >
      <div className='flex items-center gap-1.5'>
        {isOverdue && (
          <AlertTriangle className='h-3 w-3 text-red-500' />
        ) }
        
        <div className='flex gap-1.5 min-w-0 flex-col items-start'>
          <span className={cn('font-medium truncate w-full', isOverdue ? 'text-red-700 dark:text-red-300' : 'text-foreground')}>
            {task.title}
          </span>
          
          <div className='flex items-center gap-1.5 w-full'>
            <span className={cn('text-muted-foreground text-[0.68rem] truncate', isOverdue && 'text-red-600 dark:text-red-400')}>
              {scheduleDescription}
            </span>
            {task.priority > 2 && (
              <span className={cn('px-1.5 py-0.5 rounded text-[0.6rem] font-medium flex-shrink-0', priorityColor, 'bg-current bg-opacity-10')}>
                {priorityLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 