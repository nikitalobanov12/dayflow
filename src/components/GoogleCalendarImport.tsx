import { useState, useEffect } from 'react';
import { Task, Board } from '../types';
import { useGoogleCalendarImport } from '../hooks/useGoogleCalendarImport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Download, CheckCircle, AlertCircle, Clock, Tag, Target, Folder } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface GoogleCalendarImportProps {
  calendars: any[];
  boards: Board[];
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  selectedBoardId?: number;
}

export function GoogleCalendarImport({ 
  calendars, 
  boards, 
  tasks, 
  onAddTask, 
  selectedBoardId 
}: GoogleCalendarImportProps) {
  const [selectedCalendar, setSelectedCalendar] = useState('primary');
  const [selectedBoard, setSelectedBoard] = useState<number | undefined>(selectedBoardId);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'custom'>('month');
  const [includeGoogleTasks, setIncludeGoogleTasks] = useState(true);
  const [selectedTaskList, setSelectedTaskList] = useState('@default');
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [taskLists, setTaskLists] = useState<any[]>([]);

  const {
    isLoading,
    error,
    previewTasks,
    importEvents,
    confirmImport,
    clearPreview,
    getTaskLists
  } = useGoogleCalendarImport(onAddTask, tasks);

  // Load Google Task Lists when component mounts
  useEffect(() => {
    const loadTaskLists = async () => {
      if (!includeGoogleTasks) return;
      
      try {
        const lists = await getTaskLists();
        setTaskLists(lists);
        console.log(`✅ Loaded ${lists.length} Google Task Lists`);
      } catch (error) {
        console.warn('Failed to load task lists:', error);
        
        // Check if it's a scope issue
        if (error instanceof Error && error.message.includes('Google Tasks access not granted')) {
          // Show a helpful error message to the user
          toast.error('Google Tasks access not available. Please reconnect to Google Calendar to enable Google Tasks import.');
        } else if (error instanceof Error && error.message.includes('Authentication expired')) {
          toast.error('Google authentication expired. Please reconnect to Google Calendar.');
        } else {
          console.error('Unexpected error loading task lists:', error);
        }
        
        // Disable Google Tasks option
        setIncludeGoogleTasks(false);
      }
    };

    loadTaskLists();
  }, [getTaskLists, includeGoogleTasks]);

  const handleStartImport = async () => {
    try {
      const now = new Date();
      let timeMin: Date;
      let timeMax: Date;

      switch (dateRange) {
        case 'week':
          timeMin = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
          timeMax = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
          break;
        case 'month':
          timeMin = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          timeMax = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
          break;
        default:
          timeMin = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          timeMax = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      }

      const preview = await importEvents(selectedCalendar, selectedBoard, timeMin, timeMax, includeGoogleTasks, selectedTaskList, showCompletedTasks);
      
              if (preview.length === 0) {
          const sourceText = includeGoogleTasks ? 'events or tasks' : 'events';
          toast.info(`No new ${sourceText} found to import`);
          return;
        }

      // Select all tasks by default
      setSelectedTasks(new Set(preview.map(task => task.originalEventId)));
      setShowPreview(true);
    } catch (err) {
      toast.error('Failed to load calendar events');
      console.error('Import preview failed:', err);
    }
  };

  const handleConfirmImport = async () => {
    try {
      const tasksToImport = previewTasks.filter(task => selectedTasks.has(task.originalEventId));
      
      if (tasksToImport.length === 0) {
        toast.error('No tasks selected for import');
        return;
      }

      await confirmImport(tasksToImport, selectedBoard);
      const sourceText = includeGoogleTasks ? 'Google Calendar & Tasks' : 'Google Calendar';
      toast.success(`Successfully imported ${tasksToImport.length} items from ${sourceText}`);
      setShowPreview(false);
      setSelectedTasks(new Set());
    } catch (err) {
      toast.error('Failed to import selected tasks');
      console.error('Import confirmation failed:', err);
    }
  };

  const handleTaskToggle = (eventId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === previewTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(previewTasks.map(task => task.originalEventId)));
    }
  };

  const selectedTasksCount = selectedTasks.size;
  const allSelected = selectedTasksCount === previewTasks.length;

  const getPriorityColor = (priority: 1 | 2 | 3 | 4) => {
    const colors = {
      1: 'bg-gray-100 text-gray-800',
      2: 'bg-blue-100 text-blue-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-red-100 text-red-800'
    };
    return colors[priority];
  };

  const getPriorityText = (priority: 1 | 2 | 3 | 4) => {
    const text = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };
    return text[priority];
  };

  const getStatusColor = (status: Task['status']) => {
    const colors = {
      'backlog': 'bg-gray-100 text-gray-800',
      'this-week': 'bg-blue-100 text-blue-800',
      'today': 'bg-green-100 text-green-800',
      'done': 'bg-purple-100 text-purple-800'
    };
    return colors[status];
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import from Google Calendar
          </CardTitle>
          <CardDescription>
            Import existing calendar events and Google Tasks into DayFlow. Duplicates and DayFlow-created items are automatically filtered out.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Calendar Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Source Calendar</label>
            <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
              <SelectTrigger>
                <SelectValue placeholder="Select calendar to import from" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary Calendar</SelectItem>
                {calendars.map((calendar) => (
                  <SelectItem key={calendar.id} value={calendar.id}>
                    {calendar.summary || calendar.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Board Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Target Board</label>
            <Select 
              value={selectedBoard?.toString() || ''} 
              onValueChange={(value) => setSelectedBoard(value ? parseInt(value) : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select board for imported tasks" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((board) => (
                  <SelectItem key={board.id} value={board.id.toString()}>
                    <div className="flex items-center gap-2">
                      {board.icon && <span>{board.icon}</span>}
                      <span>{board.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Date Range</label>
            <Select value={dateRange} onValueChange={(value: 'week' | 'month' | 'custom') => setDateRange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Past & Next Week</SelectItem>
                <SelectItem value="month">Past & Next Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Google Tasks Options */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Import Sources</label>
              <Badge variant="outline">Enhanced Import</Badge>
            </div>
            
            {/* Information Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Note:</strong> Google Tasks import requires additional permissions. If you connected to Google Calendar before this feature was added, you may need to reconnect in Settings to enable Google Tasks access.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              {/* Google Tasks Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Include Google Tasks</label>
                  <p className="text-xs text-muted-foreground">
                    Import tasks from Google Tasks in addition to calendar events
                  </p>
                </div>
                <Checkbox
                  checked={includeGoogleTasks}
                  onCheckedChange={(checked) => setIncludeGoogleTasks(checked === true)}
                />
              </div>

              {/* Google Tasks Options (only show when enabled) */}
              {includeGoogleTasks && (
                <>
                  {/* Task List Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Google Task List</label>
                    <Select value={selectedTaskList} onValueChange={setSelectedTaskList}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select task list" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="@default">My Tasks (Default)</SelectItem>
                        {taskLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Completed Tasks Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">Include Completed Tasks</label>
                      <p className="text-xs text-muted-foreground">
                        Import tasks that are already marked as completed
                      </p>
                    </div>
                    <Checkbox
                      checked={showCompletedTasks}
                      onCheckedChange={(checked) => setShowCompletedTasks(checked === true)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Import Button */}
          <Button 
            onClick={handleStartImport} 
            disabled={isLoading || !selectedCalendar}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Loading Events...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Preview Import
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={(open) => {
        setShowPreview(open);
        if (!open) {
          clearPreview();
          setSelectedTasks(new Set());
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
            <DialogDescription>
              Review and select events to import as tasks. {previewTasks.length} events found.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Select All Controls */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Select All ({selectedTasksCount} of {previewTasks.length})
                </span>
              </div>
              <Badge variant="outline">
                {selectedTasksCount} task{selectedTasksCount !== 1 ? 's' : ''} selected
              </Badge>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {previewTasks.map((task) => (
                <div 
                  key={task.originalEventId}
                  className={`border rounded-lg p-4 space-y-3 ${
                    selectedTasks.has(task.originalEventId) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedTasks.has(task.originalEventId)}
                      onCheckedChange={() => handleTaskToggle(task.originalEventId)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="font-medium">{task.title}</div>
                      
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          <Target className="h-3 w-3 mr-1" />
                          {getPriorityText(task.priority)}
                        </Badge>
                        
                        <Badge className={getStatusColor(task.status)}>
                          <Folder className="h-3 w-3 mr-1" />
                          {task.status.replace('-', ' ')}
                        </Badge>
                        
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {task.timeEstimate}m
                        </Badge>

                        {task.scheduledDate && (
                          <Badge variant="outline">
                            <Calendar className="h-3 w-3 mr-1" />
                            {format(new Date(task.scheduledDate), 'MMM d, h:mm a')}
                          </Badge>
                        )}

                        {task.category && (
                          <Badge variant="outline">
                            <Tag className="h-3 w-3 mr-1" />
                            {task.category}
                          </Badge>
                        )}
                      </div>

                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.tags.map((tag, index) => (
                            <span key={index} className="text-xs bg-muted px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPreview(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmImport}
              disabled={isLoading || selectedTasksCount === 0}
            >
              {isLoading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Import {selectedTasksCount} Task{selectedTasksCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 