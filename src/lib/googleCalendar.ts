import { Task, GoogleCalendarTokens } from '../types';
import supabase from '../utils/supabase';

export interface GoogleCalendarConfig {
  clientId: string;
  redirectUri: string;
  // clientSecret removed - now handled server-side
}

export class GoogleCalendarService {
  private tokens: GoogleCalendarTokens | null = null;
  private readonly CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
  private readonly AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly SCOPES = 'https://www.googleapis.com/auth/calendar';
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
      
      const { data, error } = await supabase.functions.invoke('google-oauth-exchange', {
        body: {
          code,
          redirectUri: this.config.redirectUri,
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
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('id', this.userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

      if (error) {
        console.error('Error loading tokens:', error);
        throw error;
      }

      if (!data) {
        console.log('No Google Calendar tokens found for user');
        this.tokens = null;
        return false;
      }

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
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Refresh if token expires within 5 minutes
    if (timeUntilExpiry <= fiveMinutes) {
      console.log('🔄 Access token expires soon, refreshing...');
      
      // Prevent concurrent refresh attempts
      if (this.refreshPromise) {
        await this.refreshPromise;
        return;
      }

      this.refreshPromise = this.refreshAccessToken();
      await this.refreshPromise;
      this.refreshPromise = null;
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

      const { data, error } = await supabase.functions.invoke('google-oauth-exchange', {
        method: 'PUT',
      });

      if (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, user needs to re-authenticate
        await this.disconnect();
        throw new Error('Authentication expired. Please reconnect to Google Calendar.');
      }

      if (!data?.access_token || !data?.expires_at) {
        throw new Error('Invalid refresh response');
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
  private async makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
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