/**
 * Google Calendar Integration Service
 * Handles authentication, event management, and task sync with Google Calendar
 */

import { Task } from '@/types';
import supabase from '../utils/supabase';

export interface GoogleCalendarTokens {
	id: string;
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	scope: string;
	createdAt: string;
	updatedAt: string;
}

export interface GoogleCalendarConfig {
	clientId: string;
	redirectUri: string;
	// clientSecret removed - now handled server-side
}

export class GoogleCalendarService {
  private tokens: GoogleCalendarTokens | null = null;
  private readonly CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
  private readonly TASKS_API_BASE = 'https://www.googleapis.com/tasks/v1';
  private readonly AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks';
  private userId: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(private config: GoogleCalendarConfig) {}

  /**
   * Set the current user ID for token management
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Generate OAuth 2.0 authorization URL
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.SCOPES,
      response_type: 'code',
      access_type: 'offline', // Critical: This ensures we get a refresh token
      prompt: 'consent', // Force consent to ensure refresh token
      include_granted_scopes: 'true',
    });

    return `${this.AUTH_BASE}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens using secure backend
   */
  async exchangeCodeForTokens(code: string): Promise<void> {
    if (!this.userId) {
      throw new Error('User ID must be set before exchanging tokens');
    }

    try {
      console.log('Exchanging authorization code for tokens via secure backend...');
      
      // Get current auth session to ensure we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      const { data, error } = await supabase.functions.invoke('google-oauth-exchange', {
        body: {
          code,
          redirectUri: this.config.redirectUri,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Token exchange failed:', error);
        throw new Error(`Token exchange failed: ${error.message || 'Unknown error'}`);
      }

      if (!data?.success) {
        console.error('Token exchange response:', data);
        throw new Error('Token exchange was not successful');
      }

      // Load the newly stored tokens
      const tokensLoaded = await this.loadStoredTokens();
      if (!tokensLoaded) {
        throw new Error('Tokens were not stored properly');
      }

      console.log('✅ Google Calendar tokens exchanged and stored successfully');
    } catch (error) {
      console.error('❌ Failed to exchange code for tokens:', error);
      throw error;
    }
  }

  /**
   * Load tokens from Supabase database
   */
  async loadStoredTokens(): Promise<boolean> {
    if (!this.userId) {
      console.log('No user ID set, cannot load tokens');
      return false;
    }

    try {
      console.log(`🔍 Loading stored tokens for user: ${this.userId}`);
      
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('id', this.userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

      if (error) {
        console.error('Error loading tokens from database:', error);
        this.tokens = null;
        return false;
      }

      if (!data) {
        console.log('No Google Calendar tokens found for user in database');
        this.tokens = null;
        return false;
      }

      console.log('📦 Found stored tokens, checking validity...');

      // Transform database row to client type
      this.tokens = {
        id: data.id,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        scope: data.scope,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Check token expiration
      const expiresAt = new Date(this.tokens.expiresAt);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      
      console.log(`⏰ Token expires in ${Math.round(timeUntilExpiry / 60000)} minutes`);

      // Check if tokens are about to expire and refresh if necessary
      await this.ensureValidTokens();

      console.log('✅ Google Calendar tokens loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load stored tokens:', error);
      this.tokens = null;
      return false;
    }
  }

  /**
   * Ensure we have valid, non-expired tokens
   */
  private async ensureValidTokens(): Promise<void> {
    if (!this.tokens) {
      throw new Error('No tokens available');
    }

    const expiresAt = new Date(this.tokens.expiresAt);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds

    // Refresh if token expires within 10 minutes (less aggressive)
    if (timeUntilExpiry <= tenMinutes) {
      console.log(`🔄 Access token expires in ${Math.round(timeUntilExpiry / 60000)} minutes, refreshing...`);
      
      // Prevent concurrent refresh attempts
      if (this.refreshPromise) {
        console.log('⏳ Waiting for existing refresh attempt...');
        await this.refreshPromise;
        return;
      }

      this.refreshPromise = this.refreshAccessToken();
      try {
        await this.refreshPromise;
      } finally {
        this.refreshPromise = null;
      }
    }
  }

  /**
   * Refresh access token using secure backend
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.tokens || !this.userId) {
      throw new Error('No tokens or user ID available for refresh');
    }

    try {
      console.log('🔄 Refreshing Google Calendar access token via secure backend...');

      // Get current auth session to ensure we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('google-oauth-exchange', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Token refresh failed:', error);
        
        // Only disconnect if it's specifically an authentication/authorization error
        // Network errors, server errors, etc. should NOT force re-authentication
        if (error.message?.includes('401') || error.message?.includes('403') || 
            error.message?.includes('needsReauth') || error.message?.includes('invalid_grant')) {
          console.warn('Authentication error detected, forcing re-authentication');
          await this.disconnect();
          throw new Error('Authentication expired. Please reconnect to Google Calendar.');
        }
        
        // For other errors (network, server issues), just throw without disconnecting
        throw new Error(`Failed to refresh access token: ${error.message}. Please try again.`);
      }

      if (!data?.access_token || !data?.expires_at) {
        console.error('Invalid refresh response:', data);
        
        // Only disconnect if the response explicitly indicates auth failure
        if (data?.needsReauth) {
          await this.disconnect();
          throw new Error('Authentication expired. Please reconnect to Google Calendar.');
        }
        
        // For other invalid responses, don't disconnect - might be temporary
        throw new Error('Invalid refresh response. Please try again later.');
      }

      // Update local tokens with new access token
      this.tokens = {
        ...this.tokens,
        accessToken: data.access_token,
        expiresAt: data.expires_at,
        updatedAt: new Date().toISOString(),
      };

      console.log('✅ Access token refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh access token:', error);
      // Don't clear tokens on network/temporary errors - only on auth errors
      // The specific error handling above will call disconnect() when appropriate
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated(): boolean {
    return this.tokens !== null && this.userId !== null;
  }

  /**
   * Disconnect and clear all authentication data
   */
  async disconnect(): Promise<void> {
    if (this.userId) {
      try {
        // Remove tokens from database
        await supabase
          .from('google_calendar_tokens')
          .delete()
          .eq('id', this.userId);
      } catch (error) {
        console.error('Failed to remove tokens from database:', error);
      }
    }

    // Clear local tokens
    this.tokens = null;
    this.refreshPromise = null;

    // Clear localStorage (for backward compatibility)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('google_calendar_tokens');
    }

    console.log('✅ Google Calendar disconnected successfully');
  }

  /**
   * Make authenticated API request with automatic token refresh
   */
  private async makeApiRequest(endpoint: string, options: Record<string, any> = {}): Promise<any> {
    if (!this.tokens) {
      throw new Error('Not authenticated with Google Calendar');
    }

    // Ensure tokens are valid before making request
    await this.ensureValidTokens();

    const response = await fetch(`${this.CALENDAR_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.tokens.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API request failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });

      if (response.status === 401) {
        // Token might be expired, try refreshing once more
        try {
          await this.refreshAccessToken();
          
          // Retry the request with refreshed token
          const retryResponse = await fetch(`${this.CALENDAR_API_BASE}${endpoint}`, {
            ...options,
            headers: {
              'Authorization': `Bearer ${this.tokens.accessToken}`,
              'Content-Type': 'application/json',
              ...options.headers,
            },
          });

          if (!retryResponse.ok) {
            throw new Error(`API request failed after refresh: ${retryResponse.status}`);
          }

          return await retryResponse.json();
        } catch (refreshError) {
          console.error('Failed to refresh and retry request:', refreshError);
          throw new Error('Authentication expired. Please reconnect to Google Calendar.');
        }
      } else {
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }

    return await response.json();
  }

  /**
   * Convert task to Google Calendar event format
   */
  private taskToCalendarEvent(task: Task, board?: { name: string; color?: string }) {
    const startDateTime = task.scheduledDate || task.startDate;
    
    if (!startDateTime) {
      throw new Error('Task must have a scheduled date or start date');
    }

    // Parse the date and create event times
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + (task.timeEstimate * 60 * 1000)); // Add time estimate

    // Enhanced title with board information
    const boardPrefix = board?.name ? `[${board.name}] ` : '';
    const enhancedTitle = `${boardPrefix}${task.title}`;

    // Enhanced description with comprehensive task information
    const taskDetails = [
      board?.name ? `📋 Board: ${board.name}` : '',
      task.description ? `📝 ${task.description}` : '',
      `⏱️ Time Estimate: ${task.timeEstimate} minutes`,
      task.priority ? `🔥 Priority: ${this.getPriorityText(task.priority)}` : '',
      task.category ? `🏷️ Category: ${task.category}` : '',
      task.status ? `📊 Status: ${this.getStatusText(task.status)}` : '',
      task.tags && task.tags.length > 0 ? `🏷️ Tags: ${task.tags.join(', ')}` : '',
      task.progressPercentage > 0 ? `📈 Progress: ${task.progressPercentage}%` : '',
      task.timeSpent > 0 ? `⏰ Time Spent: ${task.timeSpent} minutes` : '',
      '',
      '📱 Created in DayFlow'
    ].filter(Boolean).join('\n');

    const event = {
      summary: enhancedTitle,
      description: taskDetails,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      source: {
        title: 'DayFlow',
        url: window.location.origin,
      },
      // Add color mapping if board has a color
      ...(board?.color && this.getCalendarColorId(board.color) && {
        colorId: this.getCalendarColorId(board.color)
      }),
    };

    return event;
  }

  /**
   * Get priority text representation
   */
  private getPriorityText(priority: number): string {
    const priorityMap: Record<number, string> = {
      1: 'Low',
      2: 'Medium', 
      3: 'High',
      4: 'Critical'
    };
    return priorityMap[priority] || 'Medium';
  }

  /**
   * Get status text representation
   */
  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'backlog': 'Backlog',
      'this-week': 'This Week',
      'today': 'Today',
      'done': 'Done'
    };
    return statusMap[status] || status;
  }

  /**
   * Map board colors to Google Calendar color IDs
   */
  private getCalendarColorId(boardColor: string): string | null {
    // Google Calendar color mapping - these are the available color IDs
    const colorMap: Record<string, string> = {
      // Basic colors
      '#1f2937': '8', // Gray
      '#dc2626': '11', // Red
      '#ea580c': '6', // Orange
      '#ca8a04': '5', // Yellow
      '#16a34a': '10', // Green
      '#0ea5e9': '9', // Blue
      '#7c3aed': '3', // Purple
      '#db2777': '4', // Pink
      
      // Additional mappings for common Tailwind colors
      '#ef4444': '11', // red-500
      '#f97316': '6', // orange-500
      '#eab308': '5', // yellow-500
      '#22c55e': '10', // green-500
      '#3b82f6': '9', // blue-500
      '#8b5cf6': '3', // violet-500
      '#ec4899': '4', // pink-500
      '#6b7280': '8', // gray-500
    };
    
    return colorMap[boardColor.toLowerCase()] || null;
  }

  /**
   * Create a Google Calendar event from a task
   */
  async createEvent(task: Task, calendarId: string = 'primary', board?: { name: string; color?: string }): Promise<string | null> {
    if (!this.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      const event = this.taskToCalendarEvent(task, board);
      
      const response = await this.makeApiRequest(`/calendars/${calendarId}/events`, {
        method: 'POST',
        body: JSON.stringify(event),
      });

      return response.id;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Update a Google Calendar event
   */
  async updateEvent(task: Task, eventId: string, calendarId: string = 'primary', board?: { name: string; color?: string }): Promise<void> {
    if (!this.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      const event = this.taskToCalendarEvent(task, board);
      
      await this.makeApiRequest(`/calendars/${calendarId}/events/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a Google Calendar event
   */
  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    if (!this.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      await this.makeApiRequest(`/calendars/${calendarId}/events/${eventId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Get list of user's calendars
   */
  async getCalendarList(): Promise<any[]> {
    if (!this.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      const response = await this.makeApiRequest('/users/me/calendarList');
      return response.items || [];
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      throw error;
    }
  }

  /**
   * Get events from Google Calendar within a date range
   */
  async getEvents(calendarId: string = 'primary', timeMin?: Date, timeMax?: Date): Promise<any[]> {
    if (!this.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      // Set default time range if not provided (next 30 days)
      const now = new Date();
      const defaultTimeMin = timeMin || new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
      const defaultTimeMax = timeMax || new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now

      const params = new URLSearchParams({
        timeMin: defaultTimeMin.toISOString(),
        timeMax: defaultTimeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '100' // Limit to prevent huge responses
      });

      const response = await this.makeApiRequest(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
      return response.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  /**
   * Make authenticated API request to Google Tasks API
   */
  private async makeTasksApiRequest(endpoint: string, options: Record<string, any> = {}): Promise<any> {
    if (!this.tokens) {
      throw new Error('Not authenticated with Google Tasks');
    }

    // Ensure tokens are valid before making request
    await this.ensureValidTokens();

    const response = await fetch(`${this.TASKS_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.tokens.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tasks API request failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });

      if (response.status === 401) {
        // Token might be expired, try refreshing once more
        try {
          await this.refreshAccessToken();
          
          // Retry the request with refreshed token
          const retryResponse = await fetch(`${this.TASKS_API_BASE}${endpoint}`, {
            ...options,
            headers: {
              'Authorization': `Bearer ${this.tokens.accessToken}`,
              'Content-Type': 'application/json',
              ...options.headers,
            },
          });

          if (!retryResponse.ok) {
            throw new Error(`Tasks API request failed after refresh: ${retryResponse.status}`);
          }

          return await retryResponse.json();
        } catch (refreshError) {
          console.error('Failed to refresh and retry Tasks request:', refreshError);
          throw new Error('Authentication expired. Please reconnect to Google Calendar.');
        }
      } else {
        throw new Error(`Tasks API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }

    return await response.json();
  }

  /**
   * Check if the current tokens have Google Tasks scope
   */
  async hasTasksScope(): Promise<boolean> {
    if (!this.tokens) {
      return false;
    }

    try {
      // Try to make a simple request to the Tasks API to check if we have permission
      const response = await fetch(`${this.TASKS_API_BASE}/users/@me/lists?maxResults=1`, {
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.log('Tasks scope check failed:', error);
      return false;
    }
  }

  /**
   * Get Google Task Lists
   */
  async getTaskLists(): Promise<any[]> {
    if (!this.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Tasks');
    }

    // Check if we have the required Tasks scope
    const hasScope = await this.hasTasksScope();
    if (!hasScope) {
      throw new Error('Google Tasks access not granted. Please reconnect to Google Calendar to enable Google Tasks import.');
    }

    try {
      console.log('📋 Fetching Google Task Lists...');
      const response = await this.makeTasksApiRequest('/users/@me/lists');
      const taskLists = response.items || [];
      console.log(`📋 Found ${taskLists.length} task lists`);
      return taskLists;
    } catch (error) {
      console.error('❌ Failed to fetch task lists:', error);
      // Provide more specific error message
      if (error instanceof Error && error.message.includes('403')) {
        throw new Error('Google Tasks access denied. Please reconnect to Google Calendar to grant Tasks permissions.');
      } else if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Authentication expired. Please reconnect to Google Calendar.');
      }
      throw error;
    }
  }

  /**
   * Get Google Tasks from a specific task list
   */
  async getTasks(taskListId: string = '@default', showCompleted: boolean = true, showDeleted: boolean = false): Promise<any[]> {
    if (!this.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Tasks');
    }

    try {
      console.log(`📋 Fetching Google Tasks from list: ${taskListId}...`);
      
      const params = new URLSearchParams({
        showCompleted: showCompleted.toString(),
        showDeleted: showDeleted.toString(),
        showHidden: 'true',
        maxResults: '100'
      });

      const response = await this.makeTasksApiRequest(`/lists/${taskListId}/tasks?${params.toString()}`);
      const tasks = response.items || [];
      console.log(`📋 Found ${tasks.length} tasks in list ${taskListId}`);
      return tasks;
    } catch (error) {
      console.error('❌ Failed to fetch tasks:', error);
      throw error;
    }
  }

  /**
   * Filter Google Tasks that are suitable for import
   */
  filterImportableTasks(tasks: any[]): any[] {
    return tasks.filter(task => {
      // Skip tasks without titles
      if (!task.title || task.title.trim() === '') {
        return false;
      }

      // Skip deleted tasks
      if (task.deleted) {
        return false;
      }

      // Skip subtasks (tasks with parent)
      if (task.parent) {
        return false;
      }

      // Skip tasks that might be created by DayFlow
      if (task.notes?.includes('📱 Created in DayFlow')) {
        return false;
      }

      return true;
    });
  }

  /**
   * Convert Google Task to DayFlow task format
   */
  private googleTaskToTask(googleTask: any, boardId?: number): Omit<Task, 'id' | 'createdAt'> {
    // Parse due date
    const dueDate = googleTask.due ? new Date(googleTask.due).toISOString() : undefined;
    
    // Extract description and clean it
    let description = googleTask.notes || '';
    
    // Try to extract DayFlow-like information if it exists
    let priority: 1 | 2 | 3 | 4 = 2; // Default medium
    let category = '';
    let tags: string[] = [];
    let timeEstimate = 60; // Default 1 hour

    // Parse DayFlow-style notes if they exist
    if (description.includes('🔥 Priority:')) {
      const priorityMatch = description.match(/🔥 Priority: (Low|Medium|High|Critical)/);
      if (priorityMatch) {
        const priorityMap: Record<string, 1 | 2 | 3 | 4> = {
          'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4
        };
        priority = priorityMap[priorityMatch[1]] || 2;
      }
    }

    if (description.includes('🏷️ Category:')) {
      const categoryMatch = description.match(/🏷️ Category: ([^\n]+)/);
      if (categoryMatch) {
        category = categoryMatch[1].trim();
      }
    }

    if (description.includes('🏷️ Tags:')) {
      const tagsMatch = description.match(/🏷️ Tags: ([^\n]+)/);
      if (tagsMatch) {
        tags = tagsMatch[1].split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }
    }

    if (description.includes('⏱️ Time Estimate:')) {
      const timeMatch = description.match(/⏱️ Time Estimate: (\d+)/);
      if (timeMatch) {
        timeEstimate = parseInt(timeMatch[1]) || 60;
      }
    }

    // Clean description by removing DayFlow metadata
    description = description
      .replace(/📋 Board: [^\n]+\n?/g, '')
      .replace(/⏱️ Time Estimate: [^\n]+\n?/g, '')
      .replace(/🔥 Priority: [^\n]+\n?/g, '')
      .replace(/🏷️ Category: [^\n]+\n?/g, '')
      .replace(/📊 Status: [^\n]+\n?/g, '')
      .replace(/🏷️ Tags: [^\n]+\n?/g, '')
      .replace(/📈 Progress: [^\n]+\n?/g, '')
      .replace(/⏰ Time Spent: [^\n]+\n?/g, '')
      .replace(/📱 Created in DayFlow\n?/g, '')
      .replace(/📝 /g, '')
      .trim();

    // Determine status based on completion and due date
    let status: Task['status'] = 'backlog';
    
    if (googleTask.status === 'completed') {
      status = 'done';
    } else if (dueDate) {
      const now = new Date();
      const due = new Date(dueDate);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      
      if (dueDay.getTime() === today.getTime()) {
        status = 'today';
      } else if (dueDay > today) {
        // Check if it's this week
        const daysDiff = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) {
          status = 'this-week';
        }
      } else {
        // Overdue tasks go to today
        status = 'today';
      }
    }

    return {
      title: googleTask.title.trim(),
      description,
      timeEstimate,
      priority,
      status,
      position: 0, // Will be set properly when added
      scheduledDate: dueDate,
      startDate: dueDate,
      dueDate,
      category,
      tags,
      boardId,
      progressPercentage: googleTask.status === 'completed' ? 100 : 0,
      timeSpent: 0,
      labels: [],
      attachments: [],
      // Store the original Google Task ID to prevent re-import
      googleCalendarEventId: `task_${googleTask.id}`,
      googleCalendarSynced: false // Tasks are not synced to calendar
    };
  }

  /**
   * Import Google Tasks as DayFlow tasks
   */
  async importTasks(
    taskListId: string = '@default',
    boardId?: number,
    showCompleted: boolean = false
  ): Promise<Omit<Task, 'id' | 'createdAt'>[]> {
    if (!this.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Tasks');
    }

    try {
      console.log('🔄 Fetching tasks from Google Tasks...');
      const tasks = await this.getTasks(taskListId, showCompleted, false);
      
      console.log(`📋 Found ${tasks.length} tasks`);
      const importableTasks = this.filterImportableTasks(tasks);
      
      console.log(`✅ ${importableTasks.length} tasks suitable for import`);
      const dayflowTasks = importableTasks.map(task => this.googleTaskToTask(task, boardId));
      
      return dayflowTasks;
    } catch (error) {
      console.error('❌ Failed to import tasks from Google Tasks:', error);
      throw error;
    }
  }

  /**
   * Filter events that are suitable for import as tasks
   */
  filterImportableEvents(events: any[]): any[] {
    return events.filter(event => {
      // Skip events created by DayFlow (check source or description)
      if (event.source?.title === 'DayFlow' || 
          event.description?.includes('📱 Created in DayFlow')) {
        return false;
      }

      // Skip all-day events (they're usually not tasks)
      if (event.start?.date && !event.start?.dateTime) {
        return false;
      }

      // Skip events without titles
      if (!event.summary || event.summary.trim() === '') {
        return false;
      }

      // Skip recurring events that are part of a series (focus on main events)
      if (event.recurringEventId) {
        return false;
      }

      // Skip declined events
      if (event.status === 'cancelled') {
        return false;
      }

      // Skip events the user has declined
      if (event.attendees) {
        const userEmail = event.organizer?.email;
        const userAttendee = event.attendees.find((attendee: any) => attendee.email === userEmail);
        if (userAttendee && userAttendee.responseStatus === 'declined') {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Convert Google Calendar event to DayFlow task format
   */
  private eventToTask(event: any, boardId?: number): Omit<Task, 'id' | 'createdAt'> {
    // Parse start time
    const startTime = event.start?.dateTime || event.start?.date;
    const endTime = event.end?.dateTime || event.end?.date;
    
    // Calculate duration in minutes
    let timeEstimate = 60; // Default 1 hour
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      timeEstimate = Math.max(15, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
    }

    // Extract description and clean it
    let description = event.description || '';
    
    // Try to extract DayFlow-like information if it exists
    let priority: 1 | 2 | 3 | 4 = 2; // Default medium
    let category = '';
    let tags: string[] = [];

    // Parse DayFlow-style descriptions if they exist
    if (description.includes('🔥 Priority:')) {
      const priorityMatch = description.match(/🔥 Priority: (Low|Medium|High|Critical)/);
      if (priorityMatch) {
        const priorityMap: Record<string, 1 | 2 | 3 | 4> = {
          'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4
        };
        priority = priorityMap[priorityMatch[1]] || 2;
      }
    }

    if (description.includes('🏷️ Category:')) {
      const categoryMatch = description.match(/🏷️ Category: ([^\n]+)/);
      if (categoryMatch) {
        category = categoryMatch[1].trim();
      }
    }

    if (description.includes('🏷️ Tags:')) {
      const tagsMatch = description.match(/🏷️ Tags: ([^\n]+)/);
      if (tagsMatch) {
        tags = tagsMatch[1].split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }
    }

    // Clean description by removing DayFlow metadata
    description = description
      .replace(/📋 Board: [^\n]+\n?/g, '')
      .replace(/⏱️ Time Estimate: [^\n]+\n?/g, '')
      .replace(/🔥 Priority: [^\n]+\n?/g, '')
      .replace(/🏷️ Category: [^\n]+\n?/g, '')
      .replace(/📊 Status: [^\n]+\n?/g, '')
      .replace(/🏷️ Tags: [^\n]+\n?/g, '')
      .replace(/📈 Progress: [^\n]+\n?/g, '')
      .replace(/⏰ Time Spent: [^\n]+\n?/g, '')
      .replace(/📱 Created in DayFlow\n?/g, '')
      .replace(/📝 /g, '')
      .trim();

    // Determine status based on event timing
    const now = new Date();
    const eventStart = new Date(startTime);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
    
    let status: Task['status'] = 'backlog';
    if (eventDate.getTime() === today.getTime()) {
      status = 'today';
    } else if (eventDate > today) {
      // Check if it's this week
      const daysDiff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 7) {
        status = 'this-week';
      }
    } else {
      // Past events are considered done
      status = 'done';
    }

    return {
      title: event.summary.trim(),
      description,
      timeEstimate,
      priority,
      status,
      position: 0, // Will be set properly when added
      scheduledDate: startTime ? new Date(startTime).toISOString() : undefined,
      startDate: startTime ? new Date(startTime).toISOString() : undefined,
      dueDate: endTime ? new Date(endTime).toISOString() : undefined,
      category,
      tags,
      boardId,
      progressPercentage: status === 'done' ? 100 : 0,
      timeSpent: 0,
      labels: [],
      attachments: [],
      // Store the original Google Calendar event ID to prevent re-import
      googleCalendarEventId: event.id,
      googleCalendarSynced: true
    };
  }

  /**
   * Import both events and tasks from Google Calendar and Google Tasks
   */
  async importEvents(
    calendarId: string = 'primary', 
    boardId?: number, 
    timeMin?: Date, 
    timeMax?: Date,
    includeGoogleTasks: boolean = true,
    taskListId: string = '@default',
    showCompletedTasks: boolean = false
  ): Promise<Omit<Task, 'id' | 'createdAt'>[]> {
    if (!this.isUserAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      console.log('🔄 Fetching events and tasks from Google...');
      
      const allTasks: Omit<Task, 'id' | 'createdAt'>[] = [];

      // Import Google Calendar Events
      console.log('📅 Fetching events from Google Calendar...');
      const events = await this.getEvents(calendarId, timeMin, timeMax);
      console.log(`📅 Found ${events.length} events`);
      
      const importableEvents = this.filterImportableEvents(events);
      console.log(`✅ ${importableEvents.length} events suitable for import`);
      
      const eventTasks = importableEvents.map(event => this.eventToTask(event, boardId));
      allTasks.push(...eventTasks);

      // Import Google Tasks (if enabled)
      if (includeGoogleTasks) {
        try {
          console.log('📋 Fetching tasks from Google Tasks...');
          const googleTasks = await this.importTasks(taskListId, boardId, showCompletedTasks);
          console.log(`✅ ${googleTasks.length} Google Tasks suitable for import`);
          allTasks.push(...googleTasks);
        } catch (tasksError) {
          console.warn('⚠️ Failed to import Google Tasks (continuing with Calendar events only):', tasksError);
          // Continue with just calendar events if tasks fail
        }
      }

      console.log(`🎉 Total: ${allTasks.length} items ready for import (${eventTasks.length} events, ${allTasks.length - eventTasks.length} tasks)`);
      return allTasks;
    } catch (error) {
      console.error('❌ Failed to import from Google:', error);
      throw error;
    }
  }
}

// Export a singleton instance
let googleCalendarService: GoogleCalendarService | null = null;

export function initializeGoogleCalendar(config: GoogleCalendarConfig): GoogleCalendarService {
  googleCalendarService = new GoogleCalendarService(config);
  return googleCalendarService;
}

export function getGoogleCalendarService(): GoogleCalendarService | null {
  return googleCalendarService;
}

export function clearGoogleCalendarAuthData(): void {
  if (googleCalendarService) {
    googleCalendarService.disconnect();
  }
} 