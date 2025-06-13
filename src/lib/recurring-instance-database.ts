import { RecurringInstance, RecurringInstanceRow } from '@/types';
import supabase from '@/utils/supabase';

// Helper function to convert database row to application type
const convertRecurringInstanceFromDb = (row: RecurringInstanceRow): RecurringInstance => ({
  id: row.id,
  originalTaskId: row.original_task_id,
  instanceDate: row.instance_date,
  completedAt: row.completed_at || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  userId: row.user_id,
});

// Helper function to convert application type to database row
const convertRecurringInstanceToDb = (instance: Omit<RecurringInstance, 'id' | 'createdAt' | 'updatedAt'>): Omit<RecurringInstanceRow, 'id' | 'created_at' | 'updated_at'> => ({
  original_task_id: instance.originalTaskId,
  instance_date: instance.instanceDate,
  completed_at: instance.completedAt || null,
  user_id: instance.userId,
});

class RecurringInstanceDatabase {
  private async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    return user;
  }

  // Mark a recurring instance as completed
  async markInstanceCompleted(originalTaskId: number, instanceDate: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      const completedAt = new Date().toISOString();

      const { error } = await supabase
        .from('recurring_instances')
        .upsert({
          original_task_id: originalTaskId,
          instance_date: instanceDate,
          completed_at: completedAt,
          user_id: user.id,
        });

      if (error) {
        console.error('Error marking instance as completed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking instance as completed:', error);
      return false;
    }
  }

  // Mark a recurring instance as incomplete
  async markInstanceIncomplete(originalTaskId: number, instanceDate: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();

      const { error } = await supabase
        .from('recurring_instances')
        .delete()
        .eq('original_task_id', originalTaskId)
        .eq('instance_date', instanceDate)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error marking instance as incomplete:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking instance as incomplete:', error);
      return false;
    }
  }

  // Check if a recurring instance is completed
  async isInstanceCompleted(originalTaskId: number, instanceDate: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();

      const { data, error } = await supabase
        .from('recurring_instances')
        .select('id')
        .eq('original_task_id', originalTaskId)
        .eq('instance_date', instanceDate)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking instance completion:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking instance completion:', error);
      return false;
    }
  }

  // Get all completed instances for a specific task
  async getCompletedInstancesForTask(originalTaskId: number): Promise<RecurringInstance[]> {
    try {
      const user = await this.getCurrentUser();

      const { data, error } = await supabase
        .from('recurring_instances')
        .select('*')
        .eq('original_task_id', originalTaskId)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('instance_date', { ascending: true });

      if (error) {
        console.error('Error fetching completed instances:', error);
        return [];
      }

      return data.map(convertRecurringInstanceFromDb);
    } catch (error) {
      console.error('Error fetching completed instances:', error);
      return [];
    }
  }

  // Get completion status map for generateRecurringInstances
  async getCompletionMap(originalTaskId: number): Promise<Map<string, boolean>> {
    try {
      const user = await this.getCurrentUser();

      const { data, error } = await supabase
        .from('recurring_instances')
        .select('instance_date')
        .eq('original_task_id', originalTaskId)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      if (error) {
        console.error('Error fetching completion map:', error);
        return new Map();
      }

      const completionMap = new Map<string, boolean>();
      data.forEach(row => {
        // Create the same format as the localStorage version
        const instanceId = `${originalTaskId}-${row.instance_date}`;
        completionMap.set(instanceId, true);
      });

      return completionMap;
    } catch (error) {
      console.error('Error fetching completion map:', error);
      return new Map();
    }
  }

  // Get all instances for a task within a date range
  async getInstancesForTaskInRange(
    originalTaskId: number, 
    startDate: string, 
    endDate: string
  ): Promise<RecurringInstance[]> {
    try {
      const user = await this.getCurrentUser();

      const { data, error } = await supabase
        .from('recurring_instances')
        .select('*')
        .eq('original_task_id', originalTaskId)
        .eq('user_id', user.id)
        .gte('instance_date', startDate)
        .lte('instance_date', endDate)
        .order('instance_date', { ascending: true });

      if (error) {
        console.error('Error fetching instances in range:', error);
        return [];
      }

      return data.map(convertRecurringInstanceFromDb);
    } catch (error) {
      console.error('Error fetching instances in range:', error);
      return [];
    }
  }

  // Clean up old completed instances (called from the database function)
  async cleanupOldInstances(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_recurring_instances');

      if (error) {
        console.error('Error cleaning up old instances:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error cleaning up old instances:', error);
      return 0;
    }
  }

  // Get instance completion statistics for a task
  async getTaskCompletionStats(originalTaskId: number, days: number = 30): Promise<{
    total: number;
    completed: number;
    completionRate: number;
  }> {
    try {
      const user = await this.getCurrentUser();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('recurring_instances')
        .select('completed_at')
        .eq('original_task_id', originalTaskId)
        .eq('user_id', user.id)
        .gte('instance_date', startDate.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching completion stats:', error);
        return { total: 0, completed: 0, completionRate: 0 };
      }

      const total = data.length;
      const completed = data.filter(row => row.completed_at).length;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      return { total, completed, completionRate };
    } catch (error) {
      console.error('Error fetching completion stats:', error);
      return { total: 0, completed: 0, completionRate: 0 };
    }
  }

  // Migrate data from localStorage (helper function for transition)
  async migrateFromLocalStorage(): Promise<boolean> {
    try {
      const localStorageKey = 'dayflow_recurring_instances';
      const stored = localStorage.getItem(localStorageKey);
      
      if (!stored) {
        console.log('No localStorage data to migrate');
        return true;
      }

      const user = await this.getCurrentUser();
      const data = JSON.parse(stored);
      
      const instancesToInsert = [];
      
      for (const [instanceId, instanceData] of Object.entries(data)) {
        const parsed = instanceId.split('-');
        if (parsed.length >= 4) {
          const originalTaskId = parseInt(parsed[0]);
          const instanceDate = parsed.slice(1).join('-');
          
          instancesToInsert.push({
            original_task_id: originalTaskId,
            instance_date: instanceDate,
            completed_at: (instanceData as any).completedAt || new Date().toISOString(),
            user_id: user.id,
          });
        }
      }

      if (instancesToInsert.length > 0) {
        const { error } = await supabase
          .from('recurring_instances')
          .insert(instancesToInsert);

        if (error) {
          console.error('Error migrating localStorage data:', error);
          return false;
        }

        // Clear localStorage after successful migration
        localStorage.removeItem(localStorageKey);
        console.log(`Migrated ${instancesToInsert.length} recurring instances from localStorage`);
      }

      return true;
    } catch (error) {
      console.error('Error migrating from localStorage:', error);
      return false;
    }
  }
}

// Create singleton instance
export const recurringInstanceDatabase = new RecurringInstanceDatabase();

// Auto-migrate localStorage data and cleanup on module load
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      // Migrate localStorage data
      await recurringInstanceDatabase.migrateFromLocalStorage();
      
      // Cleanup old instances
      const removedCount = await recurringInstanceDatabase.cleanupOldInstances();
      if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} old recurring instance records`);
      }
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }, 2000); // Delay to ensure auth is ready
} 