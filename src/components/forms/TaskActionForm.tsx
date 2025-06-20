import React from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Save } from 'lucide-react';
import { Task } from '@/types';
import { useTaskActions } from '@/hooks/useTaskActions';

/**
 * React 19: useFormStatus provides form state without prop drilling
 */
function SubmitButton({ mode, isAnyPending }: { mode: 'create' | 'update', isAnyPending: boolean }) {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      type="submit" 
      disabled={pending || isAnyPending}
      className="min-w-[120px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {mode === 'create' ? 'Creating...' : 'Updating...'}
        </>
      ) : (
        <>
          {mode === 'create' ? <Plus className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {mode === 'create' ? 'Create Task' : 'Update Task'}
        </>
      )}
    </Button>
  );
}

/**
 * React 19: Form Actions Component demonstrating new form patterns
 */
interface TaskActionFormProps {
  mode: 'create' | 'update';
  task?: Task;
  boardId?: number;
  userId?: string;
  createAction: (formData: FormData) => void;
  updateAction: (formData: FormData) => void;
  createState: { error: string | null; success: boolean };
  updateState: { error: string | null; success: boolean };
  isCreatePending: boolean;
  isUpdatePending: boolean;
  onSuccess?: () => void;
}

export function TaskActionForm({
  mode,
  task,
  boardId,
  userId,
  createAction,
  updateAction,
  createState,
  updateState,
  isCreatePending,
  isUpdatePending,
  onSuccess
}: TaskActionFormProps) {
  const isAnyPending = isCreatePending || isUpdatePending;
  const currentState = mode === 'create' ? createState : updateState;
  const currentAction = mode === 'create' ? createAction : updateAction;

  // Success handling
  React.useEffect(() => {
    if (currentState.success && onSuccess) {
      onSuccess();
    }
  }, [currentState.success, onSuccess]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {mode === 'create' ? (
            <>
              <Plus className="w-5 h-5" />
              Create New Task
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Update Task
            </>
          )}
          {isAnyPending && <Badge variant="secondary">React 19 Actions</Badge>}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* React 19: Form with Action - automatic form handling */}
        <form action={currentAction} className="space-y-6">
          {/* Hidden fields for action context */}
          {mode === 'update' && task && (
            <input type="hidden" name="taskId" value={task.id} />
          )}
          {mode === 'create' && boardId && (
            <input type="hidden" name="boardId" value={boardId} />
          )}
          {userId && (
            <input type="hidden" name="userId" value={userId} />
          )}
          
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Enter task title..."
              defaultValue={task?.title || ''}
              required
              disabled={isAnyPending}
              className="transition-opacity duration-200"
            />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Enter task description..."
              defaultValue={task?.description || ''}
              disabled={isAnyPending}
              className="min-h-[100px] transition-opacity duration-200"
            />
          </div>

          {/* Priority and Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue={task?.priority?.toString() || '2'} disabled={isAnyPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">🟢 Low</SelectItem>
                  <SelectItem value="2">🟡 Medium</SelectItem>
                  <SelectItem value="3">🟠 High</SelectItem>
                  <SelectItem value="4">🔴 Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={task?.status || 'backlog'} disabled={isAnyPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">📋 Backlog</SelectItem>
                  <SelectItem value="this-week">📅 This Week</SelectItem>
                  <SelectItem value="today">⚡ Today</SelectItem>
                  <SelectItem value="done">✅ Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error Display */}
          {currentState.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{currentState.error}</p>
            </div>
          )}

          {/* Success Display */}
          {currentState.success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                Task {mode === 'create' ? 'created' : 'updated'} successfully!
              </p>
            </div>
          )}

          {/* Submit Button - Uses React 19 useFormStatus internally */}
          <SubmitButton mode={mode} isAnyPending={isAnyPending} />
        </form>

        {/* React 19 Features Showcase */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2">🚀 React 19 Features in Use:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Form Actions:</strong> Automatic form submission handling</li>
            <li>• <strong>useFormStatus:</strong> Form state without prop drilling</li>
            <li>• <strong>useActionState:</strong> Built-in error and pending management</li>
            <li>• <strong>useOptimistic:</strong> Instant UI feedback (in parent hook)</li>
            <li>• <strong>React Compiler:</strong> Automatic performance optimization</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example usage with React 19 Actions hook
 */
export function TaskActionFormExample() {
  const { 
    createTaskAction, 
    updateTaskAction,
    createState,
    updateState,
    isCreatePending,
    isUpdatePending 
  } = useTaskActions({
    tasks: [], // Your tasks array
    boards: [], // Your boards array  
    onTaskCreate: async () => null, // Your create function
    onTaskUpdate: async () => false, // Your update function
    onTaskDelete: async () => false, // Your delete function
  });

  return (
    <TaskActionForm
      mode="create"
      boardId={1}
      userId="user-123"
      createAction={createTaskAction}
      updateAction={updateTaskAction}
      createState={createState}
      updateState={updateState}
      isCreatePending={isCreatePending}
      isUpdatePending={isUpdatePending}
      onSuccess={() => console.log('Task action completed!')}
    />
  );
} 