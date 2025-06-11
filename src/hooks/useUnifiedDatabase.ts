import { useState, useEffect } from 'react';
import { useSupabaseDatabase } from './useSupabaseDatabase';

/**
 * Unified database hook that uses Supabase for both web and desktop
 * This allows the app to work in both environments seamlessly
 */
export const useUnifiedDatabase = () => {
	const [isInitialized, setIsInitialized] = useState(false);

	const supabaseDb = useSupabaseDatabase();

	// Initialize database - use Supabase for both web and desktop
	useEffect(() => {
		setIsInitialized(true);
	}, []); // Return the appropriate database interface
	if (!isInitialized) {
		return {
			db: null,
			isInitialized: false,
			tasks: [],
			boards: [],
			isLoading: true,
			addTask: async () => null,
			getTasks: async () => [],
			updateTask: async () => false,
			deleteTask: async () => false,
			moveTask: async () => false,
			reorderTask: async () => false,
			reorderTasksInColumn: async () => false,
			databaseType: null,
			user: null,
			signIn: async () => ({ data: null, error: null }),
			signOut: async () => ({ error: null }),
			signUp: async () => ({ data: null, error: null }),
			resetPasswordForEmail: async () => ({ data: null, error: null }),
			addBoard: async () => null,
			updateBoard: async () => false,
			deleteBoard: async () => false,
			loadTasks: async () => {},
			signInWithGoogle: async () => ({ data: null, error: null }),
		};
	}

	// Always return Supabase database (works in both web and desktop)
	return {
		...supabaseDb,
		databaseType: 'supabase' as const,
	};
};
