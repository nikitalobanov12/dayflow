import { useState, useCallback } from 'react';
import { Task } from '../types';
import { getGoogleCalendarService } from '../lib/googleCalendar';

export interface CalendarImportPreview {
  title: string;
  description: string;
  scheduledDate?: string;
  timeEstimate: number;
  priority: 1 | 2 | 3 | 4;
  status: Task['status'];
  category?: string;
  tags: string[];
  originalEventId: string;
}

export interface UseGoogleCalendarImportReturn {
  isLoading: boolean;
  error: string | null;
  previewTasks: CalendarImportPreview[];
  importEvents: (calendarId: string, boardId?: number, timeMin?: Date, timeMax?: Date, includeGoogleTasks?: boolean, taskListId?: string, showCompletedTasks?: boolean) => Promise<CalendarImportPreview[]>;
  confirmImport: (tasks: CalendarImportPreview[], boardId?: number) => Promise<void>;
  clearPreview: () => void;
  getTaskLists: () => Promise<any[]>;
}

export function useGoogleCalendarImport(
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>,
  existingTasks: Task[] = []
): UseGoogleCalendarImportReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTasks, setPreviewTasks] = useState<CalendarImportPreview[]>([]);

  // Helper to check if a task already exists (prevent duplicates)
  const taskExists = useCallback((eventId: string) => {
    return existingTasks.some(task => task.googleCalendarEventId === eventId);
  }, [existingTasks]);

  const importEvents = useCallback(async (
    calendarId: string, 
    boardId?: number, 
    timeMin?: Date, 
    timeMax?: Date,
    includeGoogleTasks: boolean = true,
    taskListId: string = '@default',
    showCompletedTasks: boolean = false
  ): Promise<CalendarImportPreview[]> => {
    const service = getGoogleCalendarService();
    
    if (!service || !service.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Starting calendar import preview...');
      
      // Get importable tasks from Google Calendar and Google Tasks
      const importableTasks = await service.importEvents(calendarId, boardId, timeMin, timeMax, includeGoogleTasks, taskListId, showCompletedTasks);
      
      // Filter out tasks that already exist in DayFlow
      const newTasks = importableTasks.filter(task => 
        task.googleCalendarEventId && !taskExists(task.googleCalendarEventId)
      );

      console.log(`📋 ${newTasks.length} new tasks ready for import (${importableTasks.length - newTasks.length} duplicates filtered)`);

      // Convert to preview format
      const preview: CalendarImportPreview[] = newTasks.map(task => ({
        title: task.title,
        description: task.description,
        scheduledDate: task.scheduledDate,
        timeEstimate: task.timeEstimate,
        priority: task.priority,
        status: task.status,
        category: task.category,
        tags: task.tags || [],
        originalEventId: task.googleCalendarEventId!
      }));

      setPreviewTasks(preview);
      return preview;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import calendar events';
      console.error('❌ Calendar import failed:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [taskExists]);

  const confirmImport = useCallback(async (tasks: CalendarImportPreview[], boardId?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`🚀 Importing ${tasks.length} tasks from calendar...`);
      
      let successCount = 0;
      const errors: string[] = [];

      for (const previewTask of tasks) {
        try {
          const task: Omit<Task, 'id' | 'createdAt'> = {
            title: previewTask.title,
            description: previewTask.description,
            timeEstimate: previewTask.timeEstimate,
            priority: previewTask.priority,
            status: previewTask.status,
            position: 0, // Will be set properly when added
            scheduledDate: previewTask.scheduledDate,
            startDate: previewTask.scheduledDate,
            category: previewTask.category,
            tags: previewTask.tags,
            boardId,
            progressPercentage: previewTask.status === 'done' ? 100 : 0,
            timeSpent: 0,
            labels: [],
            attachments: [],
            googleCalendarEventId: previewTask.originalEventId,
            googleCalendarSynced: true
          };

          await onAddTask(task);
          successCount++;
        } catch (err) {
          console.error(`Failed to import task "${previewTask.title}":`, err);
          errors.push(`"${previewTask.title}": ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Imported ${successCount} tasks successfully, but ${errors.length} failed:\n${errors.join('\n')}`);
      }

      console.log(`✅ Successfully imported ${successCount} tasks from Google Calendar`);
      
      // Clear preview after successful import
      setPreviewTasks([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import some tasks';
      console.error('❌ Import confirmation failed:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onAddTask]);

  const clearPreview = useCallback(() => {
    setPreviewTasks([]);
    setError(null);
  }, []);

  const getTaskLists = useCallback(async () => {
    const service = getGoogleCalendarService();
    
    if (!service || !service.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Tasks');
    }

    try {
      return await service.getTaskLists();
    } catch (error) {
      console.error('❌ Failed to fetch task lists:', error);
      throw error;
    }
  }, []);

  return {
    isLoading,
    error,
    previewTasks,
    importEvents,
    confirmImport,
    clearPreview,
    getTaskLists
  };
} 