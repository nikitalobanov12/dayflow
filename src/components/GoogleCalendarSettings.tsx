import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar, CheckCircle, AlertCircle, ExternalLink, Unlink, Save } from 'lucide-react';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { GoogleCalendarConfig } from '../lib/googleCalendar';
import { UserPreferences } from '../types';

interface GoogleCalendarSettingsProps {
  onTaskUpdate?: (taskId: number, updates: any) => Promise<void>;
  config: GoogleCalendarConfig;
  userPreferences?: UserPreferences | null;
  onUpdateUserPreferences?: (updates: Partial<UserPreferences>) => Promise<void>;
}

// Filter out system calendars that users typically don't want to sync tasks to
const isUserCalendar = (calendar: any) => {
  const summary = calendar.summary?.toLowerCase() || '';
  const id = calendar.id?.toLowerCase() || '';
  
  // Filter out holiday calendars and other system calendars
  const systemCalendarPatterns = [
    'holiday',
    'holidays',
    'observance',
    'phases of the moon',
    'week numbers',
    '#contacts@group.v.calendar.google.com',
    '@import.calendar.google.com'
  ];
  
  return !systemCalendarPatterns.some(pattern => 
    summary.includes(pattern) || id.includes(pattern)
  );
};

export function GoogleCalendarSettings({ 
  onTaskUpdate, 
  config, 
  userPreferences, 
  onUpdateUserPreferences 
}: GoogleCalendarSettingsProps) {
  // Local state for form values
  const [autoSync, setAutoSync] = useState(false);
  const [syncOnlyScheduled, setSyncOnlyScheduled] = useState(true);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [authCode, setAuthCode] = useState('');
  const [showAuthInput, setShowAuthInput] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const {
    isAuthenticated,
    isLoading,
    error,
    calendars,
    handleAuthCallback,
    disconnect,
    setSelectedCalendarId,
    getAuthUrl,
  } = useGoogleCalendar(config, onTaskUpdate);

  // Filter calendars to show only user calendars
  const userCalendars = calendars.filter(isUserCalendar);

  // Check for stored authorization code from OAuth callback
  useEffect(() => {
    const storedAuthCode = localStorage.getItem('google_calendar_auth_code');
    if (storedAuthCode && !isAuthenticated) {
      console.log('Found stored Google Calendar auth code, processing automatically...');
      // Clear the stored code immediately
      localStorage.removeItem('google_calendar_auth_code');
      // Process the code
      handleAuthCallback(storedAuthCode);
    }
  }, [isAuthenticated, handleAuthCallback]);

  // Load settings from user preferences
  useEffect(() => {
    if (userPreferences) {
      setAutoSync(userPreferences.googleCalendarAutoSync);
      setSyncOnlyScheduled(userPreferences.googleCalendarSyncOnlyScheduled);
      if (userPreferences.googleCalendarSelectedCalendar) {
        setSelectedCalendar(userPreferences.googleCalendarSelectedCalendar);
        setSelectedCalendarId(userPreferences.googleCalendarSelectedCalendar);
      }
    }
  }, [userPreferences, setSelectedCalendarId]);

  // Track changes to show save button
  useEffect(() => {
    if (!userPreferences) return;

    const hasChanges = (
      userPreferences.googleCalendarAutoSync !== autoSync ||
      userPreferences.googleCalendarSyncOnlyScheduled !== syncOnlyScheduled ||
      userPreferences.googleCalendarSelectedCalendar !== selectedCalendar
    );

    setHasUnsavedChanges(hasChanges);
    if (hasChanges) {
      setSaveStatus('idle');
    }
  }, [autoSync, syncOnlyScheduled, selectedCalendar, userPreferences]);

  // Save settings to user preferences
  const saveSettings = async () => {
    if (!onUpdateUserPreferences) {
      console.error('onUpdateUserPreferences not provided');
      return;
    }

    try {
      setSaveStatus('saving');
      
      await onUpdateUserPreferences({
        googleCalendarEnabled: isAuthenticated,
        googleCalendarAutoSync: autoSync,
        googleCalendarSyncOnlyScheduled: syncOnlyScheduled,
        googleCalendarSelectedCalendar: selectedCalendar || undefined,
      });
      
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      
      // Reset to idle after showing success
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleConnect = () => {
    const authUrl = getAuthUrl();
    if (authUrl) {
      console.log('Redirecting to Google Calendar OAuth:', authUrl);
      // Navigate to the OAuth URL in the same window
      window.location.href = authUrl;
    }
  };

  const handleAuthCodeSubmit = async () => {
    if (authCode.trim()) {
      try {
        console.log('Submitting auth code for Google Calendar...');
        await handleAuthCallback(authCode.trim());
        setAuthCode('');
        setShowAuthInput(false);
        console.log('Auth code submission successful');
      } catch (error) {
        console.error('Failed to authenticate:', error);
        // Error will be shown via the error state from the hook
      }
    }
  };

  const handleCalendarChange = (calendarId: string) => {
    setSelectedCalendar(calendarId);
    setSelectedCalendarId(calendarId);
  };

  const handleDisconnect = async () => {
    await disconnect();
    // Clear the selected calendar when disconnecting
    if (onUpdateUserPreferences) {
      await onUpdateUserPreferences({
        googleCalendarEnabled: false,
        googleCalendarSelectedCalendar: undefined,
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Sync your scheduled tasks with Google Calendar to keep everything in one place.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">Connection Status</span>
            {isAuthenticated ? (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Not Connected
              </Badge>
            )}
          </div>
          
          {isAuthenticated ? (
            <Button variant="outline" onClick={handleDisconnect} size="sm">
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={isLoading} size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect to Google Calendar
            </Button>
          )}
        </div>

        {/* Auth Code Input (shown when connecting) */}
        {showAuthInput && !isAuthenticated && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p>
                  The authorization URL has been copied to your clipboard and opened in your browser. 
                  After authorizing the app, copy the authorization code and paste it below.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste authorization code here..."
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm"
                  />
                  <Button 
                    onClick={handleAuthCodeSubmit} 
                    disabled={!authCode.trim() || isLoading}
                    size="sm"
                  >
                    Connect
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isAuthenticated && (
          <>
            <Separator />
            
            {/* Calendar Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Calendar</Label>
              {/* Debug info */}
              {import.meta.env.DEV && (
                <div className="text-xs text-muted-foreground">
                  Debug: {userCalendars.length} user calendars loaded (filtered from {calendars.length} total)
                  {userCalendars.length > 0 && (
                    <pre className="mt-1 text-xs bg-muted p-2 rounded">
                      {JSON.stringify(userCalendars.map(cal => ({ id: cal.id, summary: cal.summary })), null, 2)}
                    </pre>
                  )}
                </div>
              )}
              <Select value={selectedCalendar} onValueChange={handleCalendarChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a calendar..." />
                </SelectTrigger>
                <SelectContent>
                  {userCalendars.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      {calendars.length === 0 ? 'Loading calendars...' : 'No user calendars found'}
                    </SelectItem>
                  ) : (
                    userCalendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: calendar.backgroundColor || '#3b82f6' }}
                          />
                          {calendar.summary || calendar.id}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Your scheduled tasks will be synced to this calendar. System calendars (like holidays) are filtered out.
              </p>
            </div>

            <Separator />

            {/* Sync Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Sync Settings</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Auto-sync tasks</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync tasks when they are scheduled or updated
                  </p>
                </div>
                <Switch
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Sync only scheduled tasks</Label>
                  <p className="text-xs text-muted-foreground">
                    Only sync tasks that have a specific date and time
                  </p>
                </div>
                <Switch
                  checked={syncOnlyScheduled}
                  onCheckedChange={setSyncOnlyScheduled}
                />
              </div>
            </div>

            {/* Save Button */}
            {hasUnsavedChanges && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    You have unsaved changes
                  </p>
                  <Button 
                    onClick={saveSettings} 
                    disabled={saveStatus === 'saving'}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saveStatus === 'saving' ? 'Saving...' : 
                     saveStatus === 'saved' ? 'Saved!' : 
                     saveStatus === 'error' ? 'Error' : 'Save Settings'}
                  </Button>
                </div>
              </>
            )}

            <Separator />

            {/* Usage Instructions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">How it works</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• When you schedule a task with a specific date and time, it will appear in your Google Calendar</li>
                <li>• Task updates (title, description, time) will sync automatically if auto-sync is enabled</li>
                <li>• Deleting a scheduled task will remove it from Google Calendar</li>
                <li>• You can manually sync individual tasks from the task context menu</li>
              </ul>
            </div>
          </>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 