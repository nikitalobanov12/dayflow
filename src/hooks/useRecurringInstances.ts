import { useState, useEffect, useCallback } from 'react';
import { recurringInstanceDatabase } from '@/lib/recurring-instance-database';
import { RecurringInstance } from '@/types';

export function useRecurringInstances(taskId?: number) {
  const [completionMap, setCompletionMap] = useState<Map<string, boolean>>(new Map());
  const [instances, setInstances] = useState<RecurringInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load completion map for a specific task
  const loadCompletionMap = useCallback(async (id: number) => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const map = await recurringInstanceDatabase.getCompletionMap(id);
      setCompletionMap(map);
    } catch (err) {
      console.error('Error loading completion map:', err);
      setError('Failed to load recurring instance data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all instances for a specific task
  const loadInstances = useCallback(async (id: number) => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const instanceList = await recurringInstanceDatabase.getCompletedInstancesForTask(id);
      setInstances(instanceList);
    } catch (err) {
      console.error('Error loading instances:', err);
      setError('Failed to load instances');
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark instance as completed
  const markCompleted = useCallback(async (id: number, instanceDate: string) => {
    try {
      setError(null);
      const success = await recurringInstanceDatabase.markInstanceCompleted(id, instanceDate);
      if (success) {
        // Update local state
        const instanceId = `${id}-${instanceDate}`;
        setCompletionMap(prev => new Map(prev.set(instanceId, true)));
        
        // Reload instances to get updated data
        await loadInstances(id);
      }
      return success;
    } catch (err) {
      console.error('Error marking instance completed:', err);
      setError('Failed to mark instance as completed');
      return false;
    }
  }, [loadInstances]);

  // Mark instance as incomplete
  const markIncomplete = useCallback(async (id: number, instanceDate: string) => {
    try {
      setError(null);
      const success = await recurringInstanceDatabase.markInstanceIncomplete(id, instanceDate);
      if (success) {
        // Update local state
        const instanceId = `${id}-${instanceDate}`;
        setCompletionMap(prev => {
          const newMap = new Map(prev);
          newMap.delete(instanceId);
          return newMap;
        });
        
        // Reload instances to get updated data
        await loadInstances(id);
      }
      return success;
    } catch (err) {
      console.error('Error marking instance incomplete:', err);
      setError('Failed to mark instance as incomplete');
      return false;
    }
  }, [loadInstances]);

  // Check if an instance is completed
  const isCompleted = useCallback((id: number, instanceDate: string): boolean => {
    const instanceId = `${id}-${instanceDate}`;
    return completionMap.get(instanceId) || false;
  }, [completionMap]);

  // Get completion statistics
  const getStats = useCallback(async (id: number, days: number = 30) => {
    try {
      return await recurringInstanceDatabase.getTaskCompletionStats(id, days);
    } catch (err) {
      console.error('Error getting completion stats:', err);
      return { total: 0, completed: 0, completionRate: 0 };
    }
  }, []);

  // Load data when taskId changes
  useEffect(() => {
    if (taskId) {
      loadCompletionMap(taskId);
      loadInstances(taskId);
    }
  }, [taskId, loadCompletionMap, loadInstances]);

  return {
    completionMap,
    instances,
    loading,
    error,
    markCompleted,
    markIncomplete,
    isCompleted,
    getStats,
    refresh: () => taskId && loadCompletionMap(taskId),
  };
}

// Hook for managing multiple tasks' recurring instances
export function useMultipleRecurringInstances(taskIds: number[]) {
  const [completionMaps, setCompletionMaps] = useState<Map<number, Map<string, boolean>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllCompletionMaps = useCallback(async () => {
    if (taskIds.length === 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const maps = new Map<number, Map<string, boolean>>();
      
      // Load completion maps for all tasks in parallel
      await Promise.all(
        taskIds.map(async (taskId) => {
          try {
            const map = await recurringInstanceDatabase.getCompletionMap(taskId);
            maps.set(taskId, map);
          } catch (err) {
            console.error(`Error loading completion map for task ${taskId}:`, err);
          }
        })
      );
      
      setCompletionMaps(maps);
    } catch (err) {
      console.error('Error loading completion maps:', err);
      setError('Failed to load recurring instance data');
    } finally {
      setLoading(false);
    }
  }, [taskIds]);

  // Get completion map for a specific task
  const getCompletionMap = useCallback((taskId: number): Map<string, boolean> => {
    return completionMaps.get(taskId) || new Map();
  }, [completionMaps]);

  // Mark instance as completed for any task
  const markCompleted = useCallback(async (taskId: number, instanceDate: string) => {
    try {
      setError(null);
      const success = await recurringInstanceDatabase.markInstanceCompleted(taskId, instanceDate);
      if (success) {
        // Update local state
        const instanceId = `${taskId}-${instanceDate}`;
        setCompletionMaps(prev => {
          const newMaps = new Map(prev);
          const taskMap = newMaps.get(taskId) || new Map();
          taskMap.set(instanceId, true);
          newMaps.set(taskId, taskMap);
          return newMaps;
        });
      }
      return success;
    } catch (err) {
      console.error('Error marking instance completed:', err);
      setError('Failed to mark instance as completed');
      return false;
    }
  }, []);

  // Mark instance as incomplete for any task
  const markIncomplete = useCallback(async (taskId: number, instanceDate: string) => {
    try {
      setError(null);
      const success = await recurringInstanceDatabase.markInstanceIncomplete(taskId, instanceDate);
      if (success) {
        // Update local state
        const instanceId = `${taskId}-${instanceDate}`;
        setCompletionMaps(prev => {
          const newMaps = new Map(prev);
          const taskMap = newMaps.get(taskId) || new Map();
          taskMap.delete(instanceId);
          newMaps.set(taskId, taskMap);
          return newMaps;
        });
      }
      return success;
    } catch (err) {
      console.error('Error marking instance incomplete:', err);
      setError('Failed to mark instance as incomplete');
      return false;
    }
  }, []);

  useEffect(() => {
    loadAllCompletionMaps();
  }, [loadAllCompletionMaps]);

  return {
    completionMaps,
    loading,
    error,
    getCompletionMap,
    markCompleted,
    markIncomplete,
    refresh: loadAllCompletionMaps,
  };
} 