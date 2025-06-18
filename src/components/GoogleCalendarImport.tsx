import { useState } from 'react';
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

  const {
    isLoading,
    error,
    previewTasks,
    importEvents,
    confirmImport,
    clearPreview
  } = useGoogleCalendarImport(onAddTask, tasks);

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

      const preview = await importEvents(selectedCalendar, selectedBoard, timeMin, timeMax);
      
      if (preview.length === 0) {
        toast.info('No new events found to import');
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
      toast.success(`Successfully imported ${tasksToImport.length} tasks from Google Calendar`);
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
            Import existing calendar events as tasks in DayFlow. Duplicates and DayFlow-created events are automatically filtered out.
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