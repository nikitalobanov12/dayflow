import { useState, useEffect } from 'react';
import { UserPreferences, Profile, UserPreferencesRow, ProfileRow } from '@/types';
import supabase from '@/utils/supabase';

// Transform database row to client type
const transformUserPreferences = (row: UserPreferencesRow): UserPreferences => ({
	id: row.id,
	theme: row.theme as 'light' | 'dark' | 'system',
	language: row.language,
	dateFormat: row.date_format as 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD',
	timeFormat: row.time_format as '12h' | '24h',
	weekStartsOn: row.week_starts_on as 0 | 1,
	autoSave: row.auto_save,
	showCompletedTasks: row.show_completed_tasks,
	taskSortBy: row.task_sort_by as 'priority' | 'dueDate' | 'created' | 'alphabetical',
	taskSortOrder: row.task_sort_order as 'asc' | 'desc',
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

// Transform database row to client type
const transformProfile = (row: ProfileRow): Profile => ({
	id: row.id,
	firstName: row.first_name || undefined,
	lastName: row.last_name || undefined,
	avatarUrl: row.avatar_url || undefined,
	timezone: row.timezone,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

// Transform client type to database row
const transformUserPreferencesToRow = (preferences: Partial<UserPreferences>): Partial<UserPreferencesRow> => ({
	...(preferences.id && { id: preferences.id }),
	...(preferences.theme && { theme: preferences.theme }),
	...(preferences.language && { language: preferences.language }),
	...(preferences.dateFormat && { date_format: preferences.dateFormat }),
	...(preferences.timeFormat && { time_format: preferences.timeFormat }),
	...(preferences.weekStartsOn !== undefined && { week_starts_on: preferences.weekStartsOn }),
	...(preferences.autoSave !== undefined && { auto_save: preferences.autoSave }),
	...(preferences.showCompletedTasks !== undefined && { show_completed_tasks: preferences.showCompletedTasks }),
	...(preferences.taskSortBy && { task_sort_by: preferences.taskSortBy }),
	...(preferences.taskSortOrder && { task_sort_order: preferences.taskSortOrder }),
	updated_at: new Date().toISOString(),
});

// Transform client type to database row
const transformProfileToRow = (profile: Partial<Profile>): Partial<ProfileRow> => ({
	...(profile.id && { id: profile.id }),
	...(profile.firstName !== undefined && { first_name: profile.firstName }),
	...(profile.lastName !== undefined && { last_name: profile.lastName }),
	...(profile.avatarUrl !== undefined && { avatar_url: profile.avatarUrl }),
	...(profile.timezone && { timezone: profile.timezone }),
	updated_at: new Date().toISOString(),
});

export function useUserSettings(userId?: string) {
	const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
	const [userProfile, setUserProfile] = useState<Profile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Load user preferences and profile
	const loadUserSettings = async () => {
		if (!userId) return;

		setIsLoading(true);
		setError(null);

		try {
			// Load preferences and profile in parallel
			const [preferencesResult, profileResult] = await Promise.allSettled([
				supabase
					.from('user_preferences')
					.select('*')
					.eq('id', userId)
					.single(),
				supabase
					.from('profiles')
					.select('*')
					.eq('id', userId)
					.single()
			]);

			// Handle preferences result
			if (preferencesResult.status === 'fulfilled' && preferencesResult.value.data) {
				setUserPreferences(transformUserPreferences(preferencesResult.value.data));
			} else if (preferencesResult.status === 'rejected' || 
					   (preferencesResult.status === 'fulfilled' && preferencesResult.value.error?.code === 'PGRST116')) {
				// Create default preferences if they don't exist
				await createDefaultUserPreferences(userId);
			}

			// Handle profile result
			if (profileResult.status === 'fulfilled' && profileResult.value.data) {
				setUserProfile(transformProfile(profileResult.value.data));
			} else if (profileResult.status === 'rejected' || 
					  (profileResult.status === 'fulfilled' && profileResult.value.error?.code === 'PGRST116')) {
				// Create default profile if it doesn't exist
				await createDefaultProfile(userId);
			}
		} catch (err) {
			console.error('Error loading user settings:', err);
			setError('Failed to load user settings');
		} finally {
			setIsLoading(false);
		}
	};

	// Create default user preferences
	const createDefaultUserPreferences = async (userId: string) => {
		const defaultPreferences: Partial<UserPreferencesRow> = {
			id: userId,
			theme: 'system',
			language: 'en',
			date_format: 'MM/DD/YYYY',
			time_format: '12h',
			week_starts_on: 0,
			auto_save: true,
			show_completed_tasks: false,
			task_sort_by: 'priority',
			task_sort_order: 'asc',
		};

		const { data, error } = await supabase
			.from('user_preferences')
			.insert(defaultPreferences)
			.select()
			.single();

		if (error) {
			console.error('Error creating default preferences:', error);
			throw error;
		}

		if (data) {
			setUserPreferences(transformUserPreferences(data));
		}
	};

	// Create default profile
	const createDefaultProfile = async (userId: string) => {
		const defaultProfile: Partial<ProfileRow> = {
			id: userId,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		};

		const { data, error } = await supabase
			.from('profiles')
			.insert(defaultProfile)
			.select()
			.single();

		if (error) {
			console.error('Error creating default profile:', error);
			throw error;
		}

		if (data) {
			setUserProfile(transformProfile(data));
		}
	};

	// Update user preferences
	const updateUserPreferences = async (updates: Partial<UserPreferences>) => {
		if (!userId) throw new Error('User ID required');

		setError(null);

		try {
			const updateData = transformUserPreferencesToRow(updates);

			// Update local state optimistically
			setUserPreferences(prev => prev ? { ...prev, ...updates } : null);

			const { data, error } = await supabase
				.from('user_preferences')
				.update(updateData)
				.eq('id', userId)
				.select()
				.single();

			if (error) throw error;

			if (data) {
				setUserPreferences(transformUserPreferences(data));
			}
		} catch (err) {
			console.error('Error updating user preferences:', err);
			setError('Failed to update preferences');
			// Revert optimistic update on error
			await loadUserSettings();
			throw err;
		}
	};

	// Update user profile
	const updateUserProfile = async (updates: Partial<Profile>) => {
		if (!userId) throw new Error('User ID required');

		setError(null);

		try {
			const updateData = transformProfileToRow(updates);

			// Update local state optimistically
			setUserProfile(prev => prev ? { ...prev, ...updates } : null);

			const { data, error } = await supabase
				.from('profiles')
				.update(updateData)
				.eq('id', userId)
				.select()
				.single();

			if (error) throw error;

			if (data) {
				setUserProfile(transformProfile(data));
			}
		} catch (err) {
			console.error('Error updating user profile:', err);
			setError('Failed to update profile');
			// Revert optimistic update on error
			await loadUserSettings();
			throw err;
		}
	};

	// Load settings when userId changes
	useEffect(() => {
		if (userId) {
			loadUserSettings();
		} else {
			setUserPreferences(null);
			setUserProfile(null);
			setIsLoading(false);
		}
	}, [userId]);

	return {
		userPreferences,
		userProfile,
		isLoading,
		error,
		updateUserPreferences,
		updateUserProfile,
		refetch: loadUserSettings,
	};
}
