// Service to manage recurring task instance completion state
// Since we can't easily modify the database structure, we'll use localStorage
// for now to track which recurring instances are completed

const STORAGE_KEY = 'dayflow_recurring_instances';

export interface RecurringInstanceState {
  instanceId: string;
  completedAt: string;
  originalTaskId: number;
  instanceDate: string;
}

class RecurringInstanceStorage {
  private getStoredInstances(): Map<string, RecurringInstanceState> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return new Map(Object.entries(data).map(([key, value]) => [key, value as RecurringInstanceState]));
      }
    } catch (error) {
      console.error('Error reading recurring instances from localStorage:', error);
    }
    return new Map();
  }

  private saveStoredInstances(instances: Map<string, RecurringInstanceState>) {
    try {
      const data = Object.fromEntries(instances);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving recurring instances to localStorage:', error);
    }
  }

  // Mark a recurring instance as completed
  markInstanceCompleted(instanceId: string, originalTaskId: number, instanceDate: string): boolean {
    try {
      const instances = this.getStoredInstances();
      instances.set(instanceId, {
        instanceId,
        completedAt: new Date().toISOString(),
        originalTaskId,
        instanceDate
      });
      this.saveStoredInstances(instances);
      return true;
    } catch (error) {
      console.error('Error marking instance as completed:', error);
      return false;
    }
  }

  // Mark a recurring instance as incomplete
  markInstanceIncomplete(instanceId: string): boolean {
    try {
      const instances = this.getStoredInstances();
      instances.delete(instanceId);
      this.saveStoredInstances(instances);
      return true;
    } catch (error) {
      console.error('Error marking instance as incomplete:', error);
      return false;
    }
  }

  // Check if a recurring instance is completed
  isInstanceCompleted(instanceId: string): boolean {
    const instances = this.getStoredInstances();
    return instances.has(instanceId);
  }

  // Get all completed instances for a specific task
  getCompletedInstancesForTask(originalTaskId: number): Map<string, RecurringInstanceState> {
    const instances = this.getStoredInstances();
    const taskInstances = new Map<string, RecurringInstanceState>();
    
    for (const [key, value] of instances) {
      if (value.originalTaskId === originalTaskId) {
        taskInstances.set(key, value);
      }
    }
    
    return taskInstances;
  }

  // Get completion status map for generateRecurringInstances
  getCompletionMap(originalTaskId: number): Map<string, boolean> {
    const instances = this.getStoredInstances();
    const completionMap = new Map<string, boolean>();
    
    for (const [key, value] of instances) {
      if (value.originalTaskId === originalTaskId) {
        completionMap.set(key, true);
      }
    }
    
    return completionMap;
  }

  // Clean up old completed instances (older than 90 days)
  cleanupOldInstances(): number {
    try {
      const instances = this.getStoredInstances();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      
      let removedCount = 0;
      for (const [key, value] of instances) {
        const instanceDate = new Date(value.instanceDate);
        if (instanceDate < cutoffDate) {
          instances.delete(key);
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        this.saveStoredInstances(instances);
      }
      
      return removedCount;
    } catch (error) {
      console.error('Error cleaning up old instances:', error);
      return 0;
    }
  }

  // Clear all stored instances (for testing or reset)
  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing all instances:', error);
    }
  }

  // Export data for backup
  exportData(): string {
    const instances = this.getStoredInstances();
    return JSON.stringify(Object.fromEntries(instances), null, 2);
  }

  // Import data from backup
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      const instances = new Map<string, RecurringInstanceState>();
      
      for (const [key, value] of Object.entries(data)) {
        instances.set(key, value as RecurringInstanceState);
      }
      
      this.saveStoredInstances(instances);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

// Create singleton instance
export const recurringInstanceStorage = new RecurringInstanceStorage();

// Auto cleanup on module load (runs once when imported)
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setTimeout(() => {
    const removedCount = recurringInstanceStorage.cleanupOldInstances();
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old recurring instance records`);
    }
  }, 1000); // Delay to avoid blocking initial load
} 