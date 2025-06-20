import { useState, useEffect } from 'react';
import { UserPreferences } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CheckCircle, AlertCircle, ExternalLink, Unlink, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { getGoogleCalendarService } from '../lib/googleCalendar';

interface GoogleCalendar {
  id: string;
  summary?: string;
  description?: string;
  primary?: boolean;
}

interface GoogleCalendarSettingsProps {
  userPreferences?: UserPreferences | null;
  onUpdateUserPreferences?: (updates: Partial<UserPreferences>) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  calendars: GoogleCalendar[];
  handleAuthCallback: (code: string) => Promise<void>;
  disconnect: () => Promise<void>;
  setSelectedCalendarId: (id: string) => void;
  authenticate: () => void;
}

// Filter out system calendars that users typically don't want to sync tasks to
const isUserCalendar = (calendar: GoogleCalendar): boolean => {
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
  userPreferences, 
  onUpdateUserPreferences,
  isAuthenticated,
  isLoading,
  error,
  calendars,
  handleAuthCallback,
  disconnect,
  setSelectedCalendarId,
  authenticate,
}: GoogleCalendarSettingsProps) {
  // Local state for form values
  const [autoSync, setAutoSync] = useState(false);
  const [syncOnlyScheduled, setSyncOnlyScheduled] = useState(true);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasTasksScope, setHasTasksScope] = useState<boolean | null>(null);

  // Filter calendars to show only user calendars
  const userCalendars = calendars.filter(isUserCalendar);

  // Check for OAuth callback in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (code && !isAuthenticated) {
      console.log('Found OAuth authorization code in URL, processing...');
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Process the code
      handleAuthCallback(code);
    } else if (error) {
      console.error('OAuth error:', error);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isAuthenticated, handleAuthCallback]);

  // Check Google Tasks scope when authenticated
  useEffect(() => {
    const checkTasksScope = async () => {
      if (!isAuthenticated) {
        setHasTasksScope(null);
        return;
      }

      try {
        const service = getGoogleCalendarService();
        if (service) {
          const hasScope = await service.hasTasksScope();
          setHasTasksScope(hasScope);
        }
      } catch (error) {
        console.warn('Failed to check Tasks scope:', error);
        setHasTasksScope(false);
      }
    };

    checkTasksScope();
  }, [isAuthenticated]);

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
    console.log('Starting Google Calendar OAuth flow...');
    // This will redirect to Google's OAuth page
    authenticate();
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Connect once and your scheduled tasks will automatically sync with Google Calendar forever.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">Connection Status</span>
            {isAuthenticated ? (
              <div className="flex gap-2">
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Connected & Persistent
                </Badge>
                {hasTasksScope === false && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    No Tasks Access
                  </Badge>
                )}
                {hasTasksScope === true && (
                  <Badge variant="outline" className="flex items-center gap-1 text-green-700 border-green-200 bg-green-50">
                    <CheckCircle className="h-3 w-3" />
                    Tasks Enabled
                  </Badge>
                )}
              </div>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Not Connected
              </Badge>
            )}
          </div>
          
          {isAuthenticated ? (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Unlink className="h-4 w-4" />
              Disconnect
            </Button>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {isLoading ? 'Connecting...' : 'Connect to Google Calendar'}
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Information about persistent connection */}
        {!isAuthenticated && (
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              <strong>One-time setup:</strong> Connect your Google Calendar once and your tasks will automatically sync forever. 
              No need to reconnect or worry about expired sessions.
            </AlertDescription>
          </Alert>
        )}

        {/* Google Tasks scope warning */}
        {isAuthenticated && hasTasksScope === false && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Google Tasks Import:</strong> Your connection doesn't have access to Google Tasks. 
              To enable importing from Google Tasks, please disconnect and reconnect to grant additional permissions.
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Settings - Only show when authenticated */}
        {isAuthenticated && (
          <>
            <Separator />
            
            {/* Calendar Selection */}
            <div className="space-y-3">
              <Label htmlFor="calendar-select" className="text-sm font-medium">
                Target Calendar
              </Label>
              <Select
                value={selectedCalendar}
                onValueChange={handleCalendarChange}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a calendar for syncing tasks" />
                </SelectTrigger>
                <SelectContent>
                  {userCalendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{calendar.summary}</span>
                        {calendar.primary && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {userCalendars.length} calendars available
              </p>
            </div>

            {/* Sync Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-sync" className="text-sm font-medium">
                    Auto-sync
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync tasks to Google Calendar when scheduled
                  </p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-only-scheduled" className="text-sm font-medium">
                    Sync only scheduled tasks
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Only sync tasks that have a scheduled date or time
                  </p>
                </div>
                <Switch
                  id="sync-only-scheduled"
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
                    variant="default"
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saveStatus === 'saving' ? 'Saving...' : 
                     saveStatus === 'saved' ? 'Saved!' : 
                     saveStatus === 'error' ? 'Error - Try Again' : 'Save Settings'}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 