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
			const database = await Database.load('sqlite:dayflow.db');

			// Create tables
			await database.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          priority TEXT NOT NULL DEFAULT 'medium',
          time_estimate INTEGER NOT NULL DEFAULT 30,
          status TEXT NOT NULL DEFAULT 'backlog',
          scheduled_date TEXT,
          tags TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

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
			const result = (await database.select('SELECT * FROM tasks ORDER BY created_at DESC')) as any[];
			const taskList = result.map((row: any) => ({
				id: row.id,
				title: row.title,
				description: row.description,
				timeEstimate: row.time_estimate,
				status: row.status,
				scheduledDate: row.scheduled_date,
				tags: row.tags ? JSON.parse(row.tags) : [],
				createdAt: row.created_at,
			}));
			setTasks(taskList);
		} catch (error) {
			console.error('Failed to load tasks:', error);
		}
	};
	const addTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
		if (!db) return null;

		try {
			const result = await db.execute('INSERT INTO tasks (title, description, time_estimate, status, scheduled_date, tags) VALUES ($1, $2, $3, $4, $5, $6)', [task.title, task.description, task.timeEstimate, task.status, task.scheduledDate || null, task.tags ? JSON.stringify(task.tags) : null]);
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
			const result = (await db.select('SELECT * FROM tasks ORDER BY created_at DESC')) as any[];
			return result.map((row: any) => ({
				id: row.id,
				title: row.title,
				description: row.description,
				timeEstimate: row.time_estimate,
				status: row.status,
				scheduledDate: row.scheduled_date,
				tags: row.tags ? JSON.parse(row.tags) : [],
				createdAt: row.created_at,
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
			if (updates.timeEstimate) {
				updateFields.push('time_estimate = ?');
				values.push(updates.timeEstimate);
			}
			if (updates.status) {
				updateFields.push('status = ?');
				values.push(updates.status);
			}
			if (updates.scheduledDate !== undefined) {
				updateFields.push('scheduled_date = ?');
				values.push(updates.scheduledDate);
			}
			if (updates.tags !== undefined) {
				updateFields.push('tags = ?');
				values.push(JSON.stringify(updates.tags));
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

	const moveTask = async (id: number, newStatus: Task['status']) => {
		return await updateTask(id, { status: newStatus });
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
	};
};
