import { Task } from '../types';

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string; // Not used in GIS flow
  redirectUri: string;
}

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

// Type definitions for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
        };
      };
    };
  }
}

export class GoogleCalendarService {
  private tokens: GoogleTokens | null = null;
  private isAuthenticated = false;
  private readonly CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
  private tokenClient: any = null;
  private isGISLoaded = false;

  constructor(private config: GoogleCalendarConfig) {}

  /**
   * Load Google Identity Services script
   */
  private async loadGIS(): Promise<void> {
    if (this.isGISLoaded) return;

    return new Promise((resolve, reject) => {
      // Check if script already exists
      if (document.getElementById('google-identity-script')) {
        this.isGISLoaded = true;
        resolve();
        return;
      }

      // Create and load the script
      const script = document.createElement('script');
      script.id = 'google-identity-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        this.isGISLoaded = true;
        console.log('Google Identity Services loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load Google Identity Services');
        reject(new Error('Failed to load Google Identity Services'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize the token client
   */
  private async initializeTokenClient(): Promise<void> {
    await this.loadGIS();

    if (typeof window.google === 'undefined') {
      throw new Error('Google Identity Services not available');
    }

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.config.clientId,
      scope: 'https://www.googleapis.com/auth/calendar',
      callback: (tokenResponse: any) => {
        console.log('Token response received:', {
          hasAccessToken: !!tokenResponse.access_token,
          hasError: !!tokenResponse.error,
          expiresIn: tokenResponse.expires_in
        });

        if (tokenResponse.error) {
          console.error('GIS authentication error:', tokenResponse.error);
          this.handleAuthError(tokenResponse.error);
          return;
        }

        // Store the tokens
        this.tokens = {
          access_token: tokenResponse.access_token,
          expires_in: tokenResponse.expires_in,
          token_type: 'Bearer'
        };
        this.isAuthenticated = true;

        // Store in localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('google_calendar_tokens', JSON.stringify(this.tokens));
          console.log('Tokens stored successfully');
        }

        // Trigger a custom event to notify components
        window.dispatchEvent(new CustomEvent('google-auth-success'));
      },
    });

    console.log('Google Identity Services token client initialized');
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): void {
    console.error('Google authentication error:', error);
    this.isAuthenticated = false;
    this.tokens = null;
    window.dispatchEvent(new CustomEvent('google-auth-error', { detail: error }));
  }

  /**
   * Get the authorization URL - for GIS, we trigger the popup directly
   */
  async getAuthUrl(): Promise<string> {
    // GIS doesn't use URLs, but we return a placeholder for compatibility
    return 'javascript:void(0)'; // This will be ignored as we call authenticate directly
  }

  /**
   * Authenticate using Google Identity Services
   */
  async authenticate(): Promise<void> {
    try {
      console.log('Starting Google Calendar authentication with GIS...');
      
      if (!this.tokenClient) {
        await this.initializeTokenClient();
      }

      return new Promise((resolve, reject) => {
        // Set up one-time event listeners for this authentication attempt
        const handleSuccess = () => {
          window.removeEventListener('google-auth-success', handleSuccess);
          window.removeEventListener('google-auth-error', handleError);
          resolve();
        };

        const handleError = (event: any) => {
          window.removeEventListener('google-auth-success', handleSuccess);
          window.removeEventListener('google-auth-error', handleError);
          reject(new Error(`Authentication failed: ${event.detail || 'Unknown error'}`));
        };

        window.addEventListener('google-auth-success', handleSuccess);
        window.addEventListener('google-auth-error', handleError);

        // Request access token - this will show Google's popup
        console.log('Requesting access token...');
        this.tokenClient.requestAccessToken({
          prompt: 'consent', // Force consent screen to get refresh token behavior
        });
      });
    } catch (error) {
      console.error('Error during authentication:', error);
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
          const tokens = JSON.parse(storedTokens);
          
          // Check if we have required token data
          if (tokens && tokens.access_token) {
            this.tokens = tokens;
            this.isAuthenticated = true; // Restore authenticated state
            
            console.log('Restored Google Calendar authentication from stored tokens');
            
            // Optionally verify the token by making a quick API call
            // This will automatically handle expired tokens
            this.verifyTokenAsync();
            
            return true;
          } else {
            console.log('Stored tokens are invalid, clearing...');
            localStorage.removeItem('google_calendar_tokens');
          }
        } catch (error) {
          console.error('Failed to parse stored tokens:', error);
          localStorage.removeItem('google_calendar_tokens');
        }
      }
    }
    
    this.isAuthenticated = false;
    this.tokens = null;
    return false;
  }

  /**
   * Verify stored tokens are still valid (async, non-blocking)
   */
  private async verifyTokenAsync(): Promise<void> {
    try {
      // Make a lightweight API call to verify the token
      await this.makeApiRequest('/users/me/calendarList?maxResults=1');
      console.log('Stored tokens verified as valid');
    } catch (error) {
      console.log('Stored tokens are expired or invalid, user will need to re-authenticate');
      // Don't set isAuthenticated to false immediately - let the user try to use the feature
      // The error will be handled when they actually try to use Google Calendar features
    }
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
   * Clear all stored authentication data (for debugging)
   */
  clearAllAuthData(): void {
    console.log('Clearing all Google Calendar authentication data...');
    this.isAuthenticated = false;
    this.tokens = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('google_calendar_tokens');
      console.log('All authentication data cleared');
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
        console.log('Token expired, user needs to re-authenticate...');
        this.isAuthenticated = false;
        this.tokens = null;
        // Clear stored tokens
        if (typeof window !== 'undefined') {
          localStorage.removeItem('google_calendar_tokens');
        }
        throw new Error('Authentication expired. Please reconnect to Google Calendar.');
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('API request successful, response data:', responseData);
    return responseData;
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

export function clearGoogleCalendarAuthData(): void {
  if (googleCalendarService) {
    googleCalendarService.clearAllAuthData();
  }
} 