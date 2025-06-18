import { useCallback } from 'react';
import { Task, UserPreferences, Board } from '../types';
import { getGoogleCalendarService } from '../lib/googleCalendar';

export function useGoogleCalendarSync(
  originalOnUpdateTask: (id: number, updates: Partial<Task>) => Promise<boolean>,
  originalOnDeleteTask: (id: number) => Promise<boolean>,
  tasks: Task[],
  userPreferences?: UserPreferences | null,
  boards?: Board[]
) {

  // Load settings from user preferences (with localStorage fallback for backward compatibility)
  const getSettings = useCallback(() => {
    // Primary: Use user preferences if available
    if (userPreferences) {
      return {
        autoSync: userPreferences.googleCalendarAutoSync || false,
        syncOnlyScheduled: userPreferences.googleCalendarSyncOnlyScheduled !== undefined 
          ? userPreferences.googleCalendarSyncOnlyScheduled 
          : true,
        selectedCalendarId: userPreferences.googleCalendarSelectedCalendar || 'primary'
      };
    }

    // Fallback: Use localStorage for backward compatibility
    const savedAutoSync = localStorage.getItem('google_calendar_auto_sync');
    const savedSyncOnlyScheduled = localStorage.getItem('google_calendar_sync_only_scheduled');
    const savedSelectedCalendar = localStorage.getItem('google_calendar_selected_calendar');

    return {
      autoSync: savedAutoSync ? JSON.parse(savedAutoSync) : false,
      syncOnlyScheduled: savedSyncOnlyScheduled ? JSON.parse(savedSyncOnlyScheduled) : true,
      selectedCalendarId: savedSelectedCalendar || 'primary'
    };
  }, [userPreferences]);

  const shouldSyncTask = useCallback((task: Task, updates?: Partial<Task>) => {
    const settings = getSettings();
    const googleCalendarService = getGoogleCalendarService();
    
    console.log('🔍 shouldSyncTask check:', {
      taskId: task.id,
      taskTitle: task.title,
      settings,
      isAuthenticated: googleCalendarService?.isUserAuthenticated(),
      hasScheduledDate: !!(task.scheduledDate || task.startDate),
      updates
    });
    
    if (!settings.autoSync || !googleCalendarService?.isUserAuthenticated()) {
      console.log('❌ Sync blocked - autoSync:', settings.autoSync, 'isAuthenticated:', googleCalendarService?.isUserAuthenticated());
      return false;
    }

    const finalTask = updates ? { ...task, ...updates } : task;
    
    // Check if task should be synced based on settings
    if (settings.syncOnlyScheduled) {
      const shouldSync = !!(finalTask.scheduledDate || finalTask.startDate);
      console.log('📅 syncOnlyScheduled check:', shouldSync, 'scheduledDate:', finalTask.scheduledDate, 'startDate:', finalTask.startDate);
      return shouldSync;
    }
    
    console.log('✅ Should sync task');
    return true;
  }, [getSettings]);

  // Helper function to get board information for a task
  const getBoardForTask = useCallback((task: Task) => {
    if (!boards || !task.boardId) return undefined;
    const board = boards.find(b => b.id === task.boardId);
    return board ? { name: board.name, color: board.color || undefined } : undefined;
  }, [boards]);

  const syncTaskToCalendar = useCallback(async (task: Task) => {
    const googleCalendarService = getGoogleCalendarService();
    const settings = getSettings();
    const boardInfo = getBoardForTask(task);
    
    console.log('📊 syncTaskToCalendar:', {
      taskId: task.id,
      taskTitle: task.title,
      hasExistingEvent: !!task.googleCalendarEventId,
      calendarId: settings.selectedCalendarId,
      isAuthenticated: googleCalendarService?.isUserAuthenticated(),
      boardInfo
    });
    
    if (!googleCalendarService?.isUserAuthenticated()) {
      console.log('❌ Not authenticated, skipping sync');
      return;
    }

    try {
      if (task.googleCalendarEventId) {
        console.log('🔄 Updating existing Google Calendar event:', task.googleCalendarEventId);
        // Update existing event with board information
        await googleCalendarService.updateEvent(task, task.googleCalendarEventId, settings.selectedCalendarId, boardInfo);
        console.log('✅ Successfully updated Google Calendar event');
      } else {
        console.log('➕ Creating new Google Calendar event');
        // Create new event with board information
        const eventId = await googleCalendarService.createEvent(task, settings.selectedCalendarId, boardInfo);
        console.log('📅 Created event with ID:', eventId);
        if (eventId) {
          // Update the task with the Google Calendar event ID
          await originalOnUpdateTask(task.id, {
            googleCalendarEventId: eventId,
            googleCalendarSynced: true,
          });
          console.log('✅ Successfully linked task to Google Calendar event');
        }
      }
    } catch (error) {
      console.error('❌ Failed to sync task to Google Calendar:', error);
      // Update task to indicate sync failure
      await originalOnUpdateTask(task.id, {
        googleCalendarSynced: false,
      });
    }
  }, [getSettings, originalOnUpdateTask, getBoardForTask]);

  const removeTaskFromCalendar = useCallback(async (task: Task) => {
    const googleCalendarService = getGoogleCalendarService();
    const settings = getSettings();
    
    if (!googleCalendarService?.isUserAuthenticated() || !task.googleCalendarEventId) {
      return;
    }

    try {
      await googleCalendarService.deleteEvent(task.googleCalendarEventId, settings.selectedCalendarId);
    } catch (error) {
      console.error('Failed to remove task from Google Calendar:', error);
    }
  }, [getSettings]);

  // Enhanced update task function that includes Google Calendar sync
  const updateTask = useCallback(async (id: number, updates: Partial<Task>): Promise<boolean> => {
    const task = tasks.find(t => t.id === id);
    if (!task) {
      return originalOnUpdateTask(id, updates);
    }

    console.log('🔄 updateTask called:', { taskId: id, taskTitle: task.title, updates });

    // First update the task in the database
    const success = await originalOnUpdateTask(id, updates);
    console.log('💾 Database update result:', success);
    
    if (success && shouldSyncTask(task, updates)) {
      console.log('🚀 Starting Google Calendar sync...');
      const updatedTask = { ...task, ...updates };
      
      // Check if the task was unscheduled (scheduled date was removed)
      if (task.scheduledDate && !updatedTask.scheduledDate && !updatedTask.startDate) {
        console.log('🗑️ Removing from Google Calendar (task unscheduled)');
        // Remove from Google Calendar
        await removeTaskFromCalendar(task);
        // Update task to remove Google Calendar info
        await originalOnUpdateTask(id, {
          googleCalendarEventId: undefined,
          googleCalendarSynced: false,
        });
      } else if (updatedTask.scheduledDate || updatedTask.startDate) {
        console.log('📅 Syncing to Google Calendar...');
        // Sync to Google Calendar
        await syncTaskToCalendar(updatedTask);
      }
    } else {
      console.log('⏭️ Skipping Google Calendar sync');
    }

    return success;
  }, [tasks, originalOnUpdateTask, shouldSyncTask, syncTaskToCalendar, removeTaskFromCalendar]);

  // Enhanced delete task function that includes Google Calendar cleanup
  const deleteTask = useCallback(async (id: number): Promise<boolean> => {
    const task = tasks.find(t => t.id === id);
    
    // Remove from Google Calendar first if synced
    if (task && task.googleCalendarEventId) {
      await removeTaskFromCalendar(task);
    }

    // Then delete from database
    return originalOnDeleteTask(id);
  }, [tasks, originalOnDeleteTask, removeTaskFromCalendar]);

  // Manual sync functions
  const manualSyncTask = useCallback(async (task: Task): Promise<void> => {
    if (!task.scheduledDate && !task.startDate) {
      throw new Error('Task must have a scheduled date or start date to sync');
    }
    
    await syncTaskToCalendar(task);
  }, [syncTaskToCalendar]);

  const manualUnsyncTask = useCallback(async (task: Task): Promise<void> => {
    if (task.googleCalendarEventId) {
      await removeTaskFromCalendar(task);
      await originalOnUpdateTask(task.id, {
        googleCalendarEventId: undefined,
        googleCalendarSynced: false,
      });
    }
  }, [removeTaskFromCalendar, originalOnUpdateTask]);

  return {
    updateTask,
    deleteTask,
    manualSyncTask,
    manualUnsyncTask,
    isGoogleCalendarConnected: () => {
      const service = getGoogleCalendarService();
      return service?.isUserAuthenticated() || false;
    },
  };
} 