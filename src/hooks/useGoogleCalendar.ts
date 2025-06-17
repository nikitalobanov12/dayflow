import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types';
import { getGoogleCalendarService, initializeGoogleCalendar, GoogleCalendarConfig } from '../lib/googleCalendar';

export interface UseGoogleCalendarReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  calendars: any[];
  selectedCalendarId: string;
  authenticate: () => void;
  handleAuthCallback: (code: string) => Promise<void>;
  disconnect: () => void;
  syncTask: (task: Task) => Promise<void>;
  unsyncTask: (task: Task) => Promise<void>;
  setSelectedCalendarId: (calendarId: string) => void;
  getAuthUrl: () => Promise<string | null>;
}

export function useGoogleCalendar(
  config: GoogleCalendarConfig,
  onTaskUpdate?: (taskId: number, updates: Partial<Task>) => Promise<void>
): UseGoogleCalendarReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState('primary');

  const loadCalendars = useCallback(async () => {
    const service = getGoogleCalendarService();
    if (!service || !service.isUserAuthenticated()) {
      console.log('Cannot load calendars: service not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading calendars...');
      const calendarList = await service.getCalendarList();
      console.log('Calendars loaded:', calendarList);
      setCalendars(calendarList);
    } catch (err) {
      console.error('Failed to load calendars:', err);
      
      // Check if it's an authentication error (expired tokens)
      if (err instanceof Error && err.message.includes('Authentication expired')) {
        setError('Your Google Calendar session has expired. Please reconnect to continue.');
        setIsAuthenticated(false);
      } else {
        setError('Failed to load calendars. Please try reconnecting.');
        // If loading calendars fails and it's not an auth error, keep authenticated status
        // This allows users to retry without re-authenticating
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize Google Calendar service and check for stored tokens
  useEffect(() => {
    const service = initializeGoogleCalendar(config);
    
    // Check if we have stored tokens and they're valid
    const hasStoredTokens = service.loadStoredTokens();
    const isServiceAuthenticated = service.isUserAuthenticated();
    
    console.log('Google Calendar initialization:', {
      hasStoredTokens,
      isServiceAuthenticated,
      config: {
        hasClientId: !!config.clientId,
        hasClientSecret: !!config.clientSecret,
        redirectUri: config.redirectUri
      }
    });
    
    setIsAuthenticated(isServiceAuthenticated);
    
    if (isServiceAuthenticated) {
      loadCalendars();
    }
  }, [config, loadCalendars]);

  const authenticate = useCallback(async () => {
    const service = getGoogleCalendarService();
    if (!service) {
      setError('Google Calendar service not initialized');
      return;
    }

    try {
      setIsLoading(true); 
      setError(null);
      console.log('Starting Google Calendar authentication...');
      
      // For GIS, we call authenticate directly (no URL needed)
      await service.authenticate();
      
      const isServiceAuthenticated = service.isUserAuthenticated();
      console.log('Authentication result:', isServiceAuthenticated);
      setIsAuthenticated(isServiceAuthenticated);
      
      if (isServiceAuthenticated) {
        await loadCalendars();
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      setError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [loadCalendars]);

  const handleAuthCallback = useCallback(async (_code: string) => {
    // Note: With GIS, this function is no longer used for authentication
    // GIS handles authentication through popups automatically
    // This is kept for backward compatibility but logs a deprecation notice
    console.log('handleAuthCallback called but not needed with GIS - authentication handled automatically');
  }, []);

  const disconnect = useCallback(() => {
    const service = getGoogleCalendarService();
    if (!service) return;

    console.log('Disconnecting from Google Calendar');
    service.disconnect();
    setIsAuthenticated(false);
    setCalendars([]);
    setSelectedCalendarId('primary');
    setError(null);
  }, []);

  const syncTask = useCallback(async (task: Task) => {
    const service = getGoogleCalendarService();
    if (!service || !service.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    if (!task.scheduledDate && !task.startDate) {
      throw new Error('Task must have a scheduled date or start date to sync');
    }

    try {
      setIsLoading(true);
      
      let eventId: string | null = null;
      
      if (task.googleCalendarEventId) {
        // Update existing event
        await service.updateEvent(task, task.googleCalendarEventId, selectedCalendarId);
        eventId = task.googleCalendarEventId;
      } else {
        // Create new event
        eventId = await service.createEvent(task, selectedCalendarId);
      }

      // Update task with Google Calendar info
      if (onTaskUpdate && eventId) {
        await onTaskUpdate(task.id, {
          googleCalendarEventId: eventId,
          googleCalendarSynced: true,
        });
      }

      setError(null);
    } catch (err) {
      console.error('Failed to sync task:', err);
      setError('Failed to sync task with Google Calendar');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedCalendarId, onTaskUpdate]);

  const unsyncTask = useCallback(async (task: Task) => {
    const service = getGoogleCalendarService();
    if (!service || !service.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    if (!task.googleCalendarEventId) {
      return; // Nothing to unsync
    }

    try {
      setIsLoading(true);
      
      // Delete the event from Google Calendar
      await service.deleteEvent(task.googleCalendarEventId, selectedCalendarId);

      // Update task to remove Google Calendar info
      if (onTaskUpdate) {
        await onTaskUpdate(task.id, {
          googleCalendarEventId: undefined,
          googleCalendarSynced: false,
        });
      }

      setError(null);
    } catch (err) {
      console.error('Failed to unsync task:', err);
      setError('Failed to remove task from Google Calendar');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedCalendarId, onTaskUpdate]);

  const getAuthUrl = useCallback(async () => {
    const service = getGoogleCalendarService();
    try {
      return service ? await service.getAuthUrl() : null;
    } catch (error) {
      console.error('Failed to generate auth URL:', error);
      return null;
    }
  }, []);

  return {
    isAuthenticated,
    isLoading,
    error,
    calendars,
    selectedCalendarId,
    authenticate,
    handleAuthCallback,
    disconnect,
    syncTask,
    unsyncTask,
    setSelectedCalendarId,
    getAuthUrl,
  };
} 