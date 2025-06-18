import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types';
import { getGoogleCalendarService, initializeGoogleCalendar, GoogleCalendarConfig } from '../lib/googleCalendar';
import supabase from '../utils/supabase';

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
  getAuthUrl: () => string;
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
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize Google Calendar service and check for stored tokens
  useEffect(() => {
    const initializeService = async () => {
      const service = initializeGoogleCalendar(config);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return;
      }

      // Set user ID for token management
      service.setUserId(user.id);
      
      // Check if we have stored tokens and they're valid
      const hasStoredTokens = await service.loadStoredTokens();
      const isServiceAuthenticated = service.isUserAuthenticated();
      
      console.log('Google Calendar initialization:', {
        hasStoredTokens,
        isServiceAuthenticated,
        userId: user.id,
        config: {
          hasClientId: !!config.clientId,
          redirectUri: config.redirectUri
        }
      });
      
      setIsAuthenticated(isServiceAuthenticated);
      
      if (isServiceAuthenticated) {
        await loadCalendars();
      }
    };

    initializeService();
  }, [config, loadCalendars]);

  const getAuthUrl = useCallback(() => {
    const service = getGoogleCalendarService();
    if (!service) {
      throw new Error('Google Calendar service not initialized');
    }
    return service.getAuthUrl();
  }, []);

  const authenticate = useCallback(() => {
    const authUrl = getAuthUrl();
    // Open Google OAuth URL in current window
    window.location.href = authUrl;
  }, [getAuthUrl]);

  const handleAuthCallback = useCallback(async (code: string) => {
    const service = getGoogleCalendarService();
    if (!service) {
      setError('Google Calendar service not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Processing Google Calendar authorization code...');
      
      // Ensure user ID is set before exchanging tokens
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      console.log('User authenticated, setting user ID:', user.id);
      
      // Set user ID for token management
      service.setUserId(user.id);
      
      // Exchange the authorization code for tokens
      console.log('Calling exchangeCodeForTokens...');
      await service.exchangeCodeForTokens(code);
      
      const isServiceAuthenticated = service.isUserAuthenticated();
      console.log('Authentication result:', isServiceAuthenticated);
      setIsAuthenticated(isServiceAuthenticated);
      
      if (isServiceAuthenticated) {
        await loadCalendars();
        console.log('✅ Google Calendar connected successfully');
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      setError(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [loadCalendars]);

  const disconnect = useCallback(async () => {
    const service = getGoogleCalendarService();
    if (!service) return;

    try {
      setIsLoading(true);
      console.log('Disconnecting from Google Calendar');
      await service.disconnect();
      setIsAuthenticated(false);
      setCalendars([]);
      setSelectedCalendarId('primary');
      setError(null);
      console.log('✅ Google Calendar disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect from Google Calendar:', error);
      setError('Failed to disconnect from Google Calendar');
    } finally {
      setIsLoading(false);
    }
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
      let eventId: string | null = null;

      // Update existing event or create new one
      if (task.googleCalendarEventId) {
        console.log('🔄 Updating existing Google Calendar event:', task.googleCalendarEventId);
        await service.updateEvent(task, task.googleCalendarEventId, selectedCalendarId);
        eventId = task.googleCalendarEventId;
      } else {
        console.log('➕ Creating new Google Calendar event');
        eventId = await service.createEvent(task, selectedCalendarId);
      }

      // Update task with Google Calendar info
      if (onTaskUpdate && eventId) {
        await onTaskUpdate(task.id, {
          googleCalendarEventId: eventId,
          googleCalendarSynced: true,
        });
        console.log('✅ Successfully linked task to Google Calendar event');
      }
    } catch (error) {
      console.error('❌ Failed to sync task to Google Calendar:', error);
      // Update task to mark sync as failed
      if (onTaskUpdate) {
        await onTaskUpdate(task.id, {
          googleCalendarSynced: false,
        });
      }
      throw error;
    }
  }, [selectedCalendarId, onTaskUpdate]);

  const unsyncTask = useCallback(async (task: Task) => {
    const service = getGoogleCalendarService();
    if (!service || !service.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    if (!task.googleCalendarEventId) {
      throw new Error('Task is not synced with Google Calendar');
    }

    try {
      // Delete the event from Google Calendar
      await service.deleteEvent(task.googleCalendarEventId, selectedCalendarId);

      // Update task to remove Google Calendar info
      if (onTaskUpdate) {
        await onTaskUpdate(task.id, {
          googleCalendarEventId: undefined,
          googleCalendarSynced: false,
        });
      }
    } catch (error) {
      console.error('❌ Failed to remove task from Google Calendar:', error);
      throw error;
    }
  }, [selectedCalendarId, onTaskUpdate]);

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