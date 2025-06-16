import { Task } from '../types';

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export class GoogleCalendarService {
  private tokens: GoogleTokens | null = null;
  private isAuthenticated = false;
  private readonly CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
  private readonly OAUTH_BASE = 'https://oauth2.googleapis.com/token';

  constructor(private config: GoogleCalendarConfig) {}

  /**
   * Get the authorization URL for Google OAuth
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Authenticate with the authorization code
   */
  async authenticate(code: string): Promise<void> {
    try {
      console.log('Starting Google Calendar authentication...');
      
      const response = await fetch(this.OAUTH_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          // Note: client_secret is not used in client-side OAuth flows
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirectUri,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Authentication response error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const tokens = await response.json();
      console.log('Authentication successful, received tokens:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresIn: tokens.expires_in
      });
      
      this.tokens = tokens;
      this.isAuthenticated = true;
      
      // Store tokens in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('google_calendar_tokens', JSON.stringify(tokens));
        console.log('Tokens stored in localStorage');
      }
    } catch (error) {
      console.error('Error authenticating with Google Calendar:', error);
      this.isAuthenticated = false;
      this.tokens = null;
      throw error;
    }
  }

  /**
   * Load tokens from localStorage
   */
  loadStoredTokens(): boolean {
    if (typeof window !== 'undefined') {
      const storedTokens = localStorage.getItem('google_calendar_tokens');
      if (storedTokens) {
        try {
          this.tokens = JSON.parse(storedTokens);
          this.isAuthenticated = true;
          console.log('Loaded stored Google Calendar tokens');
          return true;
        } catch (error) {
          console.error('Failed to parse stored tokens:', error);
          // Clear invalid tokens
          localStorage.removeItem('google_calendar_tokens');
        }
      }
    }
    this.isAuthenticated = false;
    this.tokens = null;
    return false;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated(): boolean {
    return this.isAuthenticated && this.tokens !== null;
  }

  /**
   * Disconnect from Google Calendar
   */
  disconnect(): void {
    this.isAuthenticated = false;
    this.tokens = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('google_calendar_tokens');
    }
  }

  /**
   * Make authenticated API request
   */
  private async makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.tokens) {
      throw new Error('Not authenticated with Google Calendar');
    }

    console.log('Making API request to:', `${this.CALENDAR_API_BASE}${endpoint}`);

    const response = await fetch(`${this.CALENDAR_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.tokens.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log('API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API request failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });

      if (response.status === 401) {
        console.log('Token expired, attempting to refresh...');
        // Token might be expired, try to refresh
        await this.refreshToken();
        // Retry the request with new token
        console.log('Retrying API request after token refresh...');
        return this.makeApiRequest(endpoint, options);
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('API request successful, response data:', responseData);
    return responseData;
  }

  /**
   * Refresh access token
   */
  private async refreshToken(): Promise<void> {
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(this.OAUTH_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        // Note: client_secret is not used in client-side OAuth flows
        refresh_token: this.tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const newTokens = await response.json();
    this.tokens = { ...this.tokens, ...newTokens };
    
    // Update stored tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('google_calendar_tokens', JSON.stringify(this.tokens));
    }
  }

  /**
   * Convert task to Google Calendar event format
   */
  private taskToCalendarEvent(task: Task) {
    const startDate = task.scheduledDate || task.startDate;
    const endDate = task.dueDate;
    
    if (!startDate) {
      throw new Error('Task must have a scheduled date or start date');
    }

    const start = new Date(startDate);
    let end = new Date(startDate);
    
    // If task has a time estimate, use it for the end time
    if (task.timeEstimate && task.timeEstimate > 0) {
      end = new Date(start.getTime() + task.timeEstimate * 60 * 1000);
    } else if (endDate) {
      end = new Date(endDate);
    } else {
      // Default to 1 hour duration
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }

    const event = {
      summary: task.title,
      description: task.description || `Task from DayFlow\n\nPriority: ${task.priority}\nStatus: ${task.status}`,
      start: {
        dateTime: start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      extendedProperties: {
        private: {
          dayflow_task_id: task.id.toString(),
          dayflow_board_id: task.boardId?.toString() || '',
        }
      }
    };

    return event;
  }

  /**
   * Create a Google Calendar event from a task
   */
  async createEvent(task: Task, calendarId: string = 'primary'): Promise<string | null> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      const event = this.taskToCalendarEvent(task);
      
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
  async updateEvent(task: Task, eventId: string, calendarId: string = 'primary'): Promise<void> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      const event = this.taskToCalendarEvent(task);
      
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
    if (!this.isAuthenticated) {
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
   * Get user's calendar list
   */
  async getCalendarList(): Promise<any[]> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      console.log('Fetching calendar list from Google Calendar API...');
      const response = await this.makeApiRequest('/users/me/calendarList');
      console.log('Calendar list response:', response);
      
      const calendars = response.items || [];
      console.log('Parsed calendars:', calendars.length, 'calendars found');
      
      return calendars;
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
  // Try to load stored tokens
  googleCalendarService.loadStoredTokens();
  return googleCalendarService;
}

export function getGoogleCalendarService(): GoogleCalendarService | null {
  return googleCalendarService;
} 