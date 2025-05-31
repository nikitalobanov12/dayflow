import { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { Task } from '@/types';

export const useDatabase = () => {
	const [db, setDb] = useState<any>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		initializeDatabase();
	}, []);
	const initializeDatabase = async () => {
		try {
			setIsLoading(true);
			const database = await Database.load('sqlite:dayflow.db'); // Create tables
			await database.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          priority TEXT NOT NULL DEFAULT 'medium',
          time_estimate INTEGER NOT NULL DEFAULT 30,
          status TEXT NOT NULL DEFAULT 'backlog',
          position INTEGER NOT NULL DEFAULT 0,
          scheduled_date TEXT,
          tags TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `); // Add position column if it doesn't exist (for existing databases)
			await database
				.execute(
					`
        ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0
      `
				)
				.catch(() => {
					// Column already exists, ignore error
				});

			// Add completed_at column if it doesn't exist (for existing databases)
			await database
				.execute(
					`
        ALTER TABLE tasks ADD COLUMN completed_at DATETIME
      `
				)
				.catch(() => {
					// Column already exists, ignore error
				});

			await database.execute(`
        CREATE TABLE IF NOT EXISTS journals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          content TEXT NOT NULL,
          mood TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

			await database.execute(`
        CREATE TABLE IF NOT EXISTS sprints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_ids TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT,
          total_estimated_time INTEGER NOT NULL,
          actual_time INTEGER,
          is_active BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

			setDb(database);
			setIsInitialized(true);

			// Load initial tasks
			await loadTasks(database);
			setIsLoading(false);
		} catch (error) {
			console.error('Failed to initialize database:', error);
			setIsLoading(false);
		}
	};
	const loadTasks = async (database = db) => {
		if (!database) return;

		try {
			const result = (await database.select('SELECT * FROM tasks ORDER BY status, position ASC, created_at DESC')) as any[];
			const taskList = result.map((row: any) => ({
				id: row.id,
				title: row.title,
				description: row.description,
				timeEstimate: row.time_estimate,
				status: row.status,
				position: row.position || 0,
				scheduledDate: row.scheduled_date,
				tags: row.tags ? JSON.parse(row.tags) : [],
				createdAt: row.created_at,
				completedAt: row.completed_at,
			}));
			setTasks(taskList);
		} catch (error) {
			console.error('Failed to load tasks:', error);
		}
	};
	const addTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
		if (!db) return null;

		try {
			// Get the highest position for the given status and add 1
			const maxPositionResult = await db.select('SELECT MAX(position) as max_pos FROM tasks WHERE status = $1', [task.status]);
			const maxPosition = maxPositionResult[0]?.max_pos || 0;
			const newPosition = maxPosition + 1;

			const result = await db.execute('INSERT INTO tasks (title, description, time_estimate, status, position, scheduled_date, tags) VALUES ($1, $2, $3, $4, $5, $6, $7)', [task.title, task.description, task.timeEstimate, task.status, newPosition, task.scheduledDate || null, task.tags ? JSON.stringify(task.tags) : null]);
			await loadTasks(); // Refresh tasks after adding
			return result.lastInsertId;
		} catch (error) {
			console.error('Failed to add task:', error);
			return null;
		}
	};
	const getTasks = async (): Promise<Task[]> => {
		if (!db) return [];

		try {
			const result = (await db.select('SELECT * FROM tasks ORDER BY status, position ASC, created_at DESC')) as any[];
			return result.map((row: any) => ({
				id: row.id,
				title: row.title,
				description: row.description,
				timeEstimate: row.time_estimate,
				status: row.status,
				position: row.position || 0,
				scheduledDate: row.scheduled_date,
				tags: row.tags ? JSON.parse(row.tags) : [],
				createdAt: row.created_at,
				completedAt: row.completed_at,
			}));
		} catch (error) {
			console.error('Failed to get tasks:', error);
			return [];
		}
	};

	const updateTask = async (id: number, updates: Partial<Task>) => {
		if (!db) return false;

		try {
			const updateFields = [];
			const values = [];
			if (updates.title) {
				updateFields.push('title = ?');
				values.push(updates.title);
			}
			if (updates.description !== undefined) {
				updateFields.push('description = ?');
				values.push(updates.description);
			}
			if (updates.timeEstimate !== undefined) {
				updateFields.push('time_estimate = ?');
				values.push(updates.timeEstimate);
			}
			if (updates.status) {
				updateFields.push('status = ?');
				values.push(updates.status);
			}
			if (updates.position !== undefined) {
				updateFields.push('position = ?');
				values.push(updates.position);
			}
			if (updates.scheduledDate !== undefined) {
				updateFields.push('scheduled_date = ?');
				values.push(updates.scheduledDate);
			}
			if (updates.tags !== undefined) {
				updateFields.push('tags = ?');
				values.push(JSON.stringify(updates.tags));
			}
			if (updates.completedAt !== undefined) {
				updateFields.push('completed_at = ?');
				values.push(updates.completedAt);
			}

			values.push(id);
			await db.execute(`UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`, values);
			await loadTasks(); // Refresh tasks after updating
			return true;
		} catch (error) {
			console.error('Failed to update task:', error);
			return false;
		}
	};
	const deleteTask = async (id: number) => {
		if (!db) return false;

		try {
			await db.execute('DELETE FROM tasks WHERE id = ?', [id]);
			await loadTasks(); // Refresh tasks after deleting
			return true;
		} catch (error) {
			console.error('Failed to delete task:', error);
			return false;
		}
	};
	const moveTask = async (id: number, newStatus: Task['status'], newPosition?: number) => {
		if (!db) return false;

		try {
			// Prepare update object
			const updateData: Partial<Task> = { status: newStatus };

			// Set completion date when moving to done, clear it when moving away from done
			if (newStatus === 'done') {
				updateData.completedAt = new Date().toISOString();
			} else {
				updateData.completedAt = undefined;
			}

			if (newPosition !== undefined) {
				// Get all tasks in the target status
				const tasksInStatus = await db.select('SELECT id, position FROM tasks WHERE status = $1 ORDER BY position ASC', [newStatus]);

				// Update positions of other tasks to make room
				for (let i = 0; i < tasksInStatus.length; i++) {
					const task = tasksInStatus[i];
					if (task.id !== id) {
						const adjustedPosition = i >= newPosition ? i + 1 : i;
						if (adjustedPosition !== task.position) {
							await db.execute('UPDATE tasks SET position = $1 WHERE id = $2', [adjustedPosition, task.id]);
						}
					}
				}

				// Update the moved task with position
				updateData.position = newPosition;
				return await updateTask(id, updateData);
			} else {
				// Just move to end of column
				const maxPositionResult = await db.select('SELECT MAX(position) as max_pos FROM tasks WHERE status = $1', [newStatus]);
				const maxPosition = maxPositionResult[0]?.max_pos || 0;
				updateData.position = maxPosition + 1;
				return await updateTask(id, updateData);
			}
		} catch (error) {
			console.error('Failed to move task:', error);
			return false;
		}
	};
	const reorderTask = async (id: number, newPosition: number, status: Task['status']) => {
		return await moveTask(id, status, newPosition);
	};

	const reorderTasksInColumn = async (taskIds: number[], status: Task['status']) => {
		if (!db) return false;

		try {
			// Update all tasks in the column with their new positions
			for (let i = 0; i < taskIds.length; i++) {
				const taskId = taskIds[i];
				const newPosition = i + 1; // Start positions from 1
				await db.execute('UPDATE tasks SET position = $1 WHERE id = $2 AND status = $3', [newPosition, taskId, status]);
			}

			await loadTasks(); // Refresh tasks after reordering
			return true;
		} catch (error) {
			console.error('Failed to reorder tasks in column:', error);
			return false;
		}
	};
	return {
		db,
		isInitialized,
		tasks,
		isLoading,
		addTask,
		getTasks,
		updateTask,
		deleteTask,
		moveTask,
		reorderTask,
		reorderTasksInColumn,
	};
};
