import { useState, useEffect } from 'react';
import { Task } from '../types';
import { GoogleCalendarSettings } from './GoogleCalendarSettings';
import { appConfig } from '../lib/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Settings, Zap, AlertCircle, CheckCircle, Cloud, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { GoogleCalendarConfig } from '../lib/googleCalendar';

interface GoogleCalendarIntegrationProps {
  tasks: Task[];
  onTaskUpdate: (id: number, updates: Partial<Task>) => Promise<void>;
  onManualSyncTask?: (task: Task) => Promise<void>;
  onManualUnsyncTask?: (task: Task) => Promise<void>;
  config: GoogleCalendarConfig;
}

export function GoogleCalendarIntegration({ 
  tasks, 
  onTaskUpdate, 
  onManualSyncTask,
  onManualUnsyncTask
}: GoogleCalendarIntegrationProps) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [syncStats, setSyncStats] = useState({
    totalScheduledTasks: 0,
    syncedTasks: 0,
    unsyncedTasks: 0,
  });

  // Create wrapper function to match expected type signature
  const handleTaskUpdate = async (taskId: number, updates: Partial<Task>): Promise<void> => {
    await onTaskUpdate(taskId, updates);
  };

  const isGoogleCalendarConnected = () => {
    // This would normally check the Google Calendar service
    // For now, return false as a placeholder
    return false;
  };

  // Check if Google Calendar is properly configured
  useEffect(() => {
    setIsConfigured(appConfig.validateGoogleCalendar());
  }, []);

  // Calculate sync stats
  useEffect(() => {
    const scheduledTasks = tasks.filter(task => task.scheduledDate || task.startDate);
    const syncedTasks = tasks.filter(task => task.googleCalendarSynced);
    
    setSyncStats({
      totalScheduledTasks: scheduledTasks.length,
      syncedTasks: syncedTasks.length,
      unsyncedTasks: scheduledTasks.length - syncedTasks.length,
    });
  }, [tasks]);

  const handleBulkSync = async () => {
    if (!onManualSyncTask) {
      toast.error('Sync function not available');
      return;
    }

    const unsyncedScheduledTasks = tasks.filter(task => 
      (task.scheduledDate || task.startDate) && !task.googleCalendarSynced
    );

    if (unsyncedScheduledTasks.length === 0) {
      toast.info('No tasks to sync');
      return;
    }

    const toastId = toast.loading(`Syncing ${unsyncedScheduledTasks.length} tasks...`);
    
    try {
      const results = await Promise.allSettled(
        unsyncedScheduledTasks.map(task => onManualSyncTask(task))
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`Successfully synced ${successful} tasks`, { id: toastId });
      }
      if (failed > 0) {
        toast.error(`Failed to sync ${failed} tasks`, { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to sync tasks', { id: toastId });
    }
  };

  const handleBulkUnsync = async () => {
    if (!onManualUnsyncTask) {
      toast.error('Unsync function not available');
      return;
    }

    const syncedTasks = tasks.filter(task => task.googleCalendarSynced);

    if (syncedTasks.length === 0) {
      toast.info('No synced tasks to remove');
      return;
    }

    const toastId = toast.loading(`Removing ${syncedTasks.length} tasks from calendar...`);
    
    try {
      const results = await Promise.allSettled(
        syncedTasks.map(task => onManualUnsyncTask(task))
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`Successfully removed ${successful} tasks from calendar`, { id: toastId });
      }
      if (failed > 0) {
        toast.error(`Failed to remove ${failed} tasks`, { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to remove tasks from calendar', { id: toastId });
    }
  };

  if (!isConfigured) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Google Calendar Setup Required
          </CardTitle>
          <CardDescription>
            Google Calendar integration is not configured. Please set up your API credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p>To use Google Calendar integration, you need to:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Go to <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                  <li>Create a new project or select an existing one</li>
                  <li>Enable the Google Calendar API</li>
                  <li><strong>Create credentials (OAuth 2.0 Client ID) - Select "Web application" type</strong></li>
                  <li>Add your domain to "Authorized JavaScript origins" (e.g., https://yourdomain.com)</li>
                  <li>For development, add: <code>http://localhost:1420</code></li>
                  <li>Add the Client ID to your environment variables</li>
                </ol>
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    ℹ️ This integration uses Google Identity Services (GIS) - the modern, secure approach for web applications that doesn't require exposing client secrets.
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="bg-muted p-4 rounded-md">
            <h4 className="font-medium mb-2">Required Environment Variables:</h4>
            <pre className="text-sm bg-background p-2 rounded border">
{`VITE_GOOGLE_CLIENT_ID=your_web_application_client_id
VITE_GOOGLE_REDIRECT_URI=http://localhost:1420`}
            </pre>
            <p className="text-sm text-muted-foreground mt-2">
              Note: No client secret required! Google Identity Services handles authentication securely.
            </p>
          </div>

          <Button asChild className="w-full">
            <a 
              href="https://developers.google.com/calendar/api/quickstart" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Setup Guide
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="sync">
            <Zap className="h-4 w-4 mr-2" />
            Sync Manager
          </TabsTrigger>
          <TabsTrigger value="overview">
            <Calendar className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
        </TabsList>

                 <TabsContent value="settings" className="space-y-4">
           <GoogleCalendarSettings 
             config={appConfig.googleCalendar} 
             onTaskUpdate={handleTaskUpdate}
           />
         </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Sync Manager
              </CardTitle>
              <CardDescription>
                Manage synchronization between your tasks and Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sync Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {syncStats.totalScheduledTasks}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Scheduled Tasks
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {syncStats.syncedTasks}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Synced to Calendar
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {syncStats.unsyncedTasks}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Not Synced
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Bulk Actions */}
              <div className="space-y-4">
                <h4 className="font-medium">Bulk Actions</h4>
                <div className="flex gap-4">
                  <Button 
                    onClick={handleBulkSync}
                    disabled={!isGoogleCalendarConnected() || syncStats.unsyncedTasks === 0}
                    className="flex-1"
                  >
                    <Cloud className="h-4 w-4 mr-2" />
                    Sync All Unsynced Tasks
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleBulkUnsync}
                    disabled={!isGoogleCalendarConnected() || syncStats.syncedTasks === 0}
                    className="flex-1"
                  >
                    <Cloud className="h-4 w-4 mr-2" />
                    Remove All from Calendar
                  </Button>
                </div>
              </div>

              {!isGoogleCalendarConnected() && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Connect to Google Calendar in the Settings tab to use sync features.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Integration Overview
              </CardTitle>
              <CardDescription>
                How the Google Calendar integration works with your tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isGoogleCalendarConnected() ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">Google Calendar</span>
                </div>
                <Badge variant={isGoogleCalendarConnected() ? 'default' : 'secondary'}>
                  {isGoogleCalendarConnected() ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>

              <Separator />

              {/* Features */}
              <div className="space-y-4">
                <h4 className="font-medium">Features</h4>
                <div className="grid gap-3">
                  {[
                    {
                      icon: CheckCircle,
                      title: 'Automatic Sync',
                      description: 'Tasks are automatically synced when scheduled or updated',
                      enabled: true
                    },
                    {
                      icon: CheckCircle,
                      title: 'Manual Control',
                      description: 'Right-click any task to manually sync or unsync',
                      enabled: true
                    },
                    {
                      icon: CheckCircle,
                      title: 'Bulk Operations',
                      description: 'Sync or unsync multiple tasks at once',
                      enabled: true
                    },
                    {
                      icon: CheckCircle,
                      title: 'Smart Filtering',
                      description: 'Only scheduled tasks are synced by default',
                      enabled: true
                    },
                  ].map((feature, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <feature.icon className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <div className="font-medium">{feature.title}</div>
                        <div className="text-sm text-muted-foreground">{feature.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Usage Tips */}
              <div className="space-y-4">
                <h4 className="font-medium">Usage Tips</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Schedule tasks with specific dates and times for automatic sync</li>
                  <li>• Use the context menu (right-click) to manually sync individual tasks</li>
                  <li>• Task updates (title, description, time) automatically sync to Google Calendar</li>
                  <li>• Deleting a task will remove it from Google Calendar</li>
                  <li>• Use the Sync Manager to handle multiple tasks at once</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 