import { useActionState, useOptimistic } from 'react';
import { Task, Board } from '@/types';
import { toast } from 'sonner';

interface TaskActionState {
  error: string | null;
  success: boolean;
}

interface TaskActionsProps {
  tasks: Task[];
  boards: Board[];
  onTaskUpdate: (id: number, updates: Partial<Task>) => Promise<boolean>;
  onTaskCreate: (task: Omit<Task, 'id'>) => Promise<Task | null>;
  onTaskDelete: (id: number) => Promise<boolean>;
}

/**
 * React 19 Actions hook for task operations with automatic error handling and pending states
 */
export function useTaskActions({
  tasks,
  boards: _boards,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete
}: TaskActionsProps) {
  
  // React 19: useOptimistic for instant UI feedback
  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    tasks,
    (state: Task[], action: { type: 'update' | 'create' | 'delete'; task?: Task; taskId?: number; updates?: Partial<Task> }) => {
      switch (action.type) {
        case 'update':
          if (action.taskId && action.updates) {
            return state.map(task => 
              task.id === action.taskId ? { ...task, ...action.updates } : task
            );
          }
          return state;
        case 'create':
          if (action.task) {
            return [...state, action.task];
          }
          return state;
        case 'delete':
          if (action.taskId) {
            return state.filter(task => task.id !== action.taskId);
          }
          return state;
        default:
          return state;
      }
    }
  );

  // React 19: useActionState for update task action
  const [updateState, updateTaskAction, isUpdatePending] = useActionState(
    async (_prevState: TaskActionState, formData: FormData | { taskId: number; updates: Partial<Task> }): Promise<TaskActionState> => {
      try {
        let taskId: number;
        let updates: Partial<Task>;

        if (formData instanceof FormData) {
          // Handle form submission
          taskId = parseInt(formData.get('taskId') as string);
          updates = {
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            priority: parseInt(formData.get('priority') as string) as Task['priority'],
            status: formData.get('status') as Task['status'],
          };
        } else {
          // Handle direct updates
          taskId = formData.taskId;
          updates = formData.updates;
        }

        // Optimistic update
        setOptimisticTasks({ type: 'update', taskId, updates });

        // Perform actual update
        const success = await onTaskUpdate(taskId, updates);
        
        if (!success) {
          throw new Error('Failed to update task');
        }

        toast.success('Task updated successfully');
        return { error: null, success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update task';
        toast.error(errorMessage);
        return { error: errorMessage, success: false };
      }
    },
    { error: null, success: false }
  );

  // React 19: useActionState for create task action
  const [createState, createTaskAction, isCreatePending] = useActionState(
    async (_prevState: TaskActionState, formData: FormData | Omit<Task, 'id'>): Promise<TaskActionState> => {
      try {
        let taskData: Omit<Task, 'id'>;

        if (formData instanceof FormData) {
          // Handle form submission
          taskData = {
            title: formData.get('title') as string,
            description: formData.get('description') as string || '',
            priority: parseInt(formData.get('priority') as string || '2') as Task['priority'],
            status: (formData.get('status') as Task['status']) || 'backlog',
            boardId: parseInt(formData.get('boardId') as string),
            userId: formData.get('userId') as string,
            createdAt: new Date().toISOString(),
            timeEstimate: 30, // Default 30 minutes
            position: 0, // Default position
            progressPercentage: 0,
            labels: [],
            attachments: [],
            timeSpent: 0,
          };
        } else {
          // Handle direct creation
          taskData = formData;
        }

        // Create optimistic task with temporary ID
        const optimisticTask: Task = {
          ...taskData,
          id: Date.now(), // Temporary ID
        };

        // Optimistic update
        setOptimisticTasks({ type: 'create', task: optimisticTask });

        // Perform actual creation
        const newTask = await onTaskCreate(taskData);
        
        if (!newTask) {
          throw new Error('Failed to create task');
        }

        toast.success('Task created successfully');
        return { error: null, success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
        toast.error(errorMessage);
        return { error: errorMessage, success: false };
      }
    },
    { error: null, success: false }
  );

  // React 19: useActionState for delete task action
  const [deleteState, deleteTaskAction, isDeletePending] = useActionState(
    async (_prevState: TaskActionState, formData: FormData | { taskId: number }): Promise<TaskActionState> => {
      try {
        let taskId: number;

        if (formData instanceof FormData) {
          taskId = parseInt(formData.get('taskId') as string);
        } else {
          taskId = formData.taskId;
        }

        // Optimistic update
        setOptimisticTasks({ type: 'delete', taskId });

        // Perform actual deletion
        const success = await onTaskDelete(taskId);
        
        if (!success) {
          throw new Error('Failed to delete task');
        }

        toast.success('Task deleted successfully');
        return { error: null, success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
        toast.error(errorMessage);
        return { error: errorMessage, success: false };
      }
    },
    { error: null, success: false }
  );

  // Convenience functions for direct calls (non-form)
  const updateTask = (taskId: number, updates: Partial<Task>) => {
    updateTaskAction({ taskId, updates });
  };

  const createTask = (taskData: Omit<Task, 'id'>) => {
    createTaskAction(taskData);
  };

  const deleteTask = (taskId: number) => {
    deleteTaskAction({ taskId });
  };

  return {
    // Optimistic tasks for immediate UI updates
    tasks: optimisticTasks,
    
    // Actions for form integration
    updateTaskAction,
    createTaskAction, 
    deleteTaskAction,
    
    // Direct action functions
    updateTask,
    createTask,
    deleteTask,
    
    // States
    updateState,
    createState,
    deleteState,
    
    // Pending states
    isUpdatePending,
    isCreatePending,
    isDeletePending,
    
    // Combined pending state
    isAnyPending: isUpdatePending || isCreatePending || isDeletePending,
  };
} 