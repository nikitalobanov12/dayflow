import { useState, useEffect, useCallback } from 'react';
import supabase from '@/utils/supabase';
import { Task, TaskRow, Board, BoardRow } from '@/types';

// Helper functions to convert between database rows and application types
const convertTaskFromDb = (row: TaskRow): Task => ({
	id: row.id,
	title: row.title,
	description: row.description || '',
	timeEstimate: row.time_estimate,
	status: row.status as Task['status'],
	position: row.position,
	scheduledDate: row.scheduled_date || undefined,
	createdAt: row.created_at,
	completedAt: row.completed_at || undefined,
	tags: row.tags || [],
	userId: row.user_id,
	boardId: row.board_id || undefined,
});

const convertTaskToDb = (task: Omit<Task, 'id' | 'createdAt' | 'userId'>, userId: string): Omit<TaskRow, 'id' | 'created_at'> => ({
	title: task.title,
	description: task.description || null,
	time_estimate: task.timeEstimate,
	status: task.status,
	position: task.position,
	scheduled_date: task.scheduledDate || null,
	tags: task.tags || [],
	completed_at: task.completedAt || null,
	user_id: userId,
	board_id: task.boardId || null,
});

const convertBoardFromDb = (row: BoardRow): Board => ({
	id: row.id,
	name: row.name,
	description: row.description || undefined,
	color: row.color || undefined,
	icon: row.icon || undefined,
	createdAt: row.created_at,
	userId: row.user_id,
	isDefault: row.is_default,
});

const convertBoardToDb = (board: Omit<Board, 'id' | 'createdAt' | 'userId'>, userId: string): Omit<BoardRow, 'id' | 'created_at'> => ({
	name: board.name,
	description: board.description || null,
	color: board.color || null,
	icon: board.icon || null,
	user_id: userId,
	is_default: board.isDefault || false,
});

export const useSupabaseDatabase = () => {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [boards, setBoards] = useState<Board[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [user, setUser] = useState<any>(null);
	const [isInitialized, setIsInitialized] = useState(false);

	// Initialize auth state
	useEffect(() => {
		// Get initial session
		supabase.auth.getSession().then(({ data: { session } }) => {
			setUser(session?.user ?? null);
			setIsInitialized(true);
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			setUser(session?.user ?? null);
			if (event === 'SIGNED_IN') {
				loadTasks();
				loadBoards();
			} else if (event === 'SIGNED_OUT') {
				setTasks([]);
				setBoards([]);
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	// Load tasks and boards when user is available
	useEffect(() => {
		if (user && isInitialized) {
			loadTasks();
			loadBoards();
		} else if (!user && isInitialized) {
			setTasks([]);
			setBoards([]);
			setIsLoading(false);
		}
	}, [user, isInitialized]);
	const loadTasks = useCallback(
		async (boardId?: number) => {
			if (!user) {
				setIsLoading(false);
				return;
			}

			try {
				setIsLoading(true);
				let query = supabase.from('tasks').select('*').eq('user_id', user.id);

				// Filter by board if boardId is provided
				if (boardId !== undefined) {
					query = query.eq('board_id', boardId);
				}

				const { data, error } = await query.order('status').order('position', { ascending: true }).order('created_at', { ascending: false });

				if (error) {
					console.error('Failed to load tasks:', error);
					return;
				}

				const taskList = (data as TaskRow[]).map(convertTaskFromDb);
				setTasks(taskList);
			} catch (error) {
				console.error('Failed to load tasks:', error);
			} finally {
				setIsLoading(false);
			}
		},
		[user]
	);

	const loadBoards = useCallback(async () => {
		if (!user) return;

		try {
			const { data, error } = await supabase.from('boards').select('*').eq('user_id', user.id).order('created_at', { ascending: true });

			if (error) {
				console.error('Failed to load boards:', error);
				return;
			}

			let boardList = (data as BoardRow[]).map(convertBoardFromDb);

			// Ensure "All Tasks" board exists
			const allTasksBoard = boardList.find(board => board.isDefault);
			if (!allTasksBoard) {
				const { data: newBoard, error: createError } = await supabase
					.from('boards')
					.insert([{ name: 'All Tasks', description: 'View all tasks across all boards', user_id: user.id, is_default: true }])
					.select()
					.single();

				if (!createError && newBoard) {
					boardList.unshift(convertBoardFromDb(newBoard as BoardRow));
				}
			}

			setBoards(boardList);
		} catch (error) {
			console.error('Failed to load boards:', error);
		}
	}, [user]);

	const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'userId'>): Promise<number | null> => {
		if (!user) return null;

		try {
			// Get the highest position for the given status and add 1
			const { data: maxPositionData } = await supabase.from('tasks').select('position').eq('user_id', user.id).eq('status', task.status).order('position', { ascending: false }).limit(1);

			const maxPosition = maxPositionData?.[0]?.position || 0;
			const newPosition = maxPosition + 1;

			const taskToInsert = convertTaskToDb({ ...task, position: newPosition }, user.id);
			const { data, error } = await supabase.from('tasks').insert([taskToInsert]).select().single();

			if (error) {
				console.error('Failed to add task:', error);
				return null;
			}

			// Optimistically add the new task to local state
			const newTask = convertTaskFromDb(data as TaskRow);
			setTasks(prevTasks => [...prevTasks, newTask]);

			return data.id;
		} catch (error) {
			console.error('Failed to add task:', error);
			return null;
		}
	};

	const getTasks = async (): Promise<Task[]> => {
		if (!user) return [];

		try {
			const { data, error } = await supabase.from('tasks').select('*').eq('user_id', user.id).order('status').order('position', { ascending: true }).order('created_at', { ascending: false });

			if (error) {
				console.error('Failed to get tasks:', error);
				return [];
			}

			return (data as TaskRow[]).map(convertTaskFromDb);
		} catch (error) {
			console.error('Failed to get tasks:', error);
			return [];
		}
	};
	const updateTask = async (id: number, updates: Partial<Task>): Promise<boolean> => {
		if (!user) return false;

		try {
			// Optimistic update: Update local state immediately
			setTasks(prevTasks => prevTasks.map(task => (task.id === id ? { ...task, ...updates } : task))); // Convert updates to database format
			const dbUpdates: any = {};
			if (updates.title !== undefined) dbUpdates.title = updates.title;
			if (updates.description !== undefined) dbUpdates.description = updates.description || null;
			if (updates.timeEstimate !== undefined) dbUpdates.time_estimate = updates.timeEstimate;
			if (updates.status !== undefined) dbUpdates.status = updates.status;
			if (updates.position !== undefined) dbUpdates.position = updates.position;
			if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate || null;
			if (updates.tags !== undefined) dbUpdates.tags = updates.tags || [];
			if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt || null;
			if (updates.boardId !== undefined) dbUpdates.board_id = updates.boardId || null;

			const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id).eq('user_id', user.id);

			if (error) {
				console.error('Failed to update task:', error);
				// Revert optimistic update on error
				await loadTasks();
				return false;
			}

			return true;
		} catch (error) {
			console.error('Failed to update task:', error);
			// Revert optimistic update on error
			await loadTasks();
			return false;
		}
	};
	const deleteTask = async (id: number): Promise<boolean> => {
		if (!user) return false;

		try {
			// Optimistic update: Remove task from local state immediately
			setTasks(prevTasks => prevTasks.filter(task => task.id !== id));

			const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id);

			if (error) {
				console.error('Failed to delete task:', error);
				// Revert optimistic update on error
				await loadTasks();
				return false;
			}

			return true;
		} catch (error) {
			console.error('Failed to delete task:', error);
			// Revert optimistic update on error
			await loadTasks();
			return false;
		}
	};

	const duplicateTask = async (originalTask: Task): Promise<number | null> => {
		if (!user) return null;

		try {
			// Create a new task object without id and createdAt
			const duplicatedTask = {
				title: `${originalTask.title} (Copy)`,
				description: originalTask.description,
				timeEstimate: originalTask.timeEstimate,
				status: originalTask.status,
				position: 0, // Will be set by addTask
				scheduledDate: originalTask.scheduledDate,
				tags: originalTask.tags,
				boardId: originalTask.boardId,
			};

			// Use the existing addTask function
			return await addTask(duplicatedTask);
		} catch (error) {
			console.error('Failed to duplicate task:', error);
			return null;
		}
	};

	const moveTask = async (id: number, newStatus: Task['status'], newPosition?: number): Promise<boolean> => {
		if (!user) return false;

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
				const { data: tasksInStatus } = await supabase.from('tasks').select('id, position').eq('user_id', user.id).eq('status', newStatus).order('position', { ascending: true });

				if (tasksInStatus) {
					// Update positions of other tasks to make room
					for (let i = 0; i < tasksInStatus.length; i++) {
						const task = tasksInStatus[i];
						if (task.id !== id) {
							const adjustedPosition = i >= newPosition ? i + 1 : i;
							if (adjustedPosition !== task.position) {
								await supabase.from('tasks').update({ position: adjustedPosition }).eq('id', task.id).eq('user_id', user.id);
							}
						}
					}
				}

				// Update the moved task with position
				updateData.position = newPosition;
				return await updateTask(id, updateData);
			} else {
				// Just move to end of column
				const { data: maxPositionData } = await supabase.from('tasks').select('position').eq('user_id', user.id).eq('status', newStatus).order('position', { ascending: false }).limit(1);

				const maxPosition = maxPositionData?.[0]?.position || 0;
				updateData.position = maxPosition + 1;
				return await updateTask(id, updateData);
			}
		} catch (error) {
			console.error('Failed to move task:', error);
			return false;
		}
	};

	const reorderTask = async (id: number, newPosition: number, status: Task['status']): Promise<boolean> => {
		return await moveTask(id, status, newPosition);
	};
	const reorderTasksInColumn = async (taskIds: number[], status: Task['status']): Promise<boolean> => {
		if (!user) return false;

		try {
			// Optimistic update: Update local state immediately
			setTasks(prevTasks => {
				const updatedTasks = [...prevTasks];

				// Update positions for the reordered tasks
				taskIds.forEach((taskId, index) => {
					const taskIndex = updatedTasks.findIndex(task => task.id === taskId);
					if (taskIndex !== -1) {
						updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], position: index + 1 };
					}
				});

				return updatedTasks;
			});

			// Update all tasks in the column with their new positions
			for (let i = 0; i < taskIds.length; i++) {
				const taskId = taskIds[i];
				const newPosition = i + 1; // Start positions from 1
				const { error } = await supabase.from('tasks').update({ position: newPosition }).eq('id', taskId).eq('user_id', user.id).eq('status', status);

				if (error) {
					console.error('Failed to update task position:', error);
					// Revert optimistic update on error
					await loadTasks();
					return false;
				}
			}

			return true;
		} catch (error) {
			console.error('Failed to reorder tasks in column:', error);
			// Revert optimistic update on error
			await loadTasks();
			return false;
		}
	};

	// Authentication methods
	const signUp = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
		});
		return { data, error };
	};

	const signIn = async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		return { data, error };
	};
	const signOut = async () => {
		const { error } = await supabase.auth.signOut();
		return { error };
	};

	const resetPasswordForEmail = async (email: string) => {
		const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/auth/reset-password`,
		});
		return { data, error };
	};

	// Board operations
	const addBoard = async (board: Omit<Board, 'id' | 'createdAt' | 'userId'>): Promise<number | null> => {
		if (!user) return null;

		try {
			const boardToInsert = convertBoardToDb(board, user.id);
			const { data, error } = await supabase.from('boards').insert([boardToInsert]).select().single();

			if (error) {
				console.error('Failed to add board:', error);
				return null;
			}

			// Optimistically add the new board to local state
			const newBoard = convertBoardFromDb(data as BoardRow);
			setBoards(prevBoards => [...prevBoards, newBoard]);

			return data.id;
		} catch (error) {
			console.error('Failed to add board:', error);
			return null;
		}
	};

	const updateBoard = async (id: number, updates: Partial<Board>): Promise<boolean> => {
		if (!user) return false;

		try {
			// Optimistic update: Update local state immediately
			setBoards(prevBoards => prevBoards.map(board => (board.id === id ? { ...board, ...updates } : board))); // Convert updates to database format
			const dbUpdates: any = {};
			if (updates.name !== undefined) dbUpdates.name = updates.name;
			if (updates.description !== undefined) dbUpdates.description = updates.description || null;
			if (updates.color !== undefined) dbUpdates.color = updates.color || null;
			if (updates.icon !== undefined) dbUpdates.icon = updates.icon || null;

			const { error } = await supabase.from('boards').update(dbUpdates).eq('id', id).eq('user_id', user.id);

			if (error) {
				console.error('Failed to update board:', error);
				// Revert optimistic update on error
				await loadBoards();
				return false;
			}

			return true;
		} catch (error) {
			console.error('Failed to update board:', error);
			// Revert optimistic update on error
			await loadBoards();
			return false;
		}
	};

	const deleteBoard = async (id: number): Promise<boolean> => {
		if (!user) return false;

		try {
			// Don't allow deleting the default board
			const board = boards.find(b => b.id === id);
			if (board?.isDefault) {
				console.error('Cannot delete the default "All Tasks" board');
				return false;
			}

			// Move all tasks from this board to the default board
			const defaultBoard = boards.find(b => b.isDefault);
			if (defaultBoard) {
				const { error: tasksError } = await supabase.from('tasks').update({ board_id: defaultBoard.id }).eq('board_id', id).eq('user_id', user.id);

				if (tasksError) {
					console.error('Failed to move tasks to default board:', tasksError);
					return false;
				}
			}

			// Optimistic update: Remove board from local state immediately
			setBoards(prevBoards => prevBoards.filter(board => board.id !== id));

			const { error } = await supabase.from('boards').delete().eq('id', id).eq('user_id', user.id);

			if (error) {
				console.error('Failed to delete board:', error);
				// Revert optimistic update on error
				await loadBoards();
				return false;
			}

			// Reload tasks to reflect the moved tasks
			await loadTasks();
			return true;
		} catch (error) {
			console.error('Failed to delete board:', error);
			// Revert optimistic update on error
			await loadBoards();
			return false;
		}
	};
	return {
		// Database state
		isInitialized,
		tasks,
		boards,
		isLoading,
		user,

		// Task operations
		addTask,
		getTasks,
		updateTask,
		deleteTask,
		duplicateTask,
		moveTask,
		reorderTask,
		reorderTasksInColumn,

		// Board operations
		addBoard,
		updateBoard,
		deleteBoard,
		loadBoards,
		// Auth operations
		signUp,
		signIn,
		signOut,
		resetPasswordForEmail,

		// Utility
		loadTasks,
	};
};
