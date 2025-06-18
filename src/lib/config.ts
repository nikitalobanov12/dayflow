import { GoogleCalendarConfig } from './googleCalendar';

// Google Calendar API Configuration - client secret handled securely server-side
export const googleCalendarConfig: GoogleCalendarConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:1420',
};

// Validate configuration
export function validateGoogleCalendarConfig(): boolean {
  return !!(
    googleCalendarConfig.clientId &&
    googleCalendarConfig.redirectUri
  );
}

export const appConfig = {
  googleCalendar: googleCalendarConfig,
  validateGoogleCalendar: validateGoogleCalendarConfig,
}; 