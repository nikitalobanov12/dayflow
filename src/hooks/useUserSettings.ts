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
	calendarDefaultZoom: row.calendar_default_zoom || 1,
	calendarDefaultView: (row.calendar_default_view as '3-day' | 'week') || '3-day',
	boardDefaultView: (row.board_default_view as 'grid' | 'compact' | 'list') || 'compact',
	// Google Calendar integration settings
	googleCalendarEnabled: row.google_calendar_enabled || false,
	googleCalendarSelectedCalendar: row.google_calendar_selected_calendar || undefined,
	googleCalendarAutoSync: row.google_calendar_auto_sync || false,
	googleCalendarSyncOnlyScheduled: row.google_calendar_sync_only_scheduled !== undefined ? row.google_calendar_sync_only_scheduled : true,
	// AI Scheduling settings
	autoScheduleEnabled: row.auto_schedule_enabled || false,
	workingHoursMondayStart: row.working_hours_monday_start || '09:00',
	workingHoursMondayEnd: row.working_hours_monday_end || '17:00',
	workingHoursMondayEnabled: row.working_hours_monday_enabled !== undefined ? row.working_hours_monday_enabled : true,
	workingHoursTuesdayStart: row.working_hours_tuesday_start || '09:00',
	workingHoursTuesdayEnd: row.working_hours_tuesday_end || '17:00',
	workingHoursTuesdayEnabled: row.working_hours_tuesday_enabled !== undefined ? row.working_hours_tuesday_enabled : true,
	workingHoursWednesdayStart: row.working_hours_wednesday_start || '09:00',
	workingHoursWednesdayEnd: row.working_hours_wednesday_end || '17:00',
	workingHoursWednesdayEnabled: row.working_hours_wednesday_enabled !== undefined ? row.working_hours_wednesday_enabled : true,
	workingHoursThursdayStart: row.working_hours_thursday_start || '09:00',
	workingHoursThursdayEnd: row.working_hours_thursday_end || '17:00',
	workingHoursThursdayEnabled: row.working_hours_thursday_enabled !== undefined ? row.working_hours_thursday_enabled : true,
	workingHoursFridayStart: row.working_hours_friday_start || '09:00',
	workingHoursFridayEnd: row.working_hours_friday_end || '17:00',
	workingHoursFridayEnabled: row.working_hours_friday_enabled !== undefined ? row.working_hours_friday_enabled : true,
	workingHoursSaturdayStart: row.working_hours_saturday_start || '10:00',
	workingHoursSaturdayEnd: row.working_hours_saturday_end || '15:00',
	workingHoursSaturdayEnabled: row.working_hours_saturday_enabled || false,
	workingHoursSundayStart: row.working_hours_sunday_start || '10:00',
	workingHoursSundayEnd: row.working_hours_sunday_end || '15:00',
	workingHoursSundayEnabled: row.working_hours_sunday_enabled || false,
	bufferTimeBetweenTasks: row.buffer_time_between_tasks || 15,
	maxTaskChunkSize: row.max_task_chunk_size || 120,
	minTaskChunkSize: row.min_task_chunk_size || 30,
	allowOvertimeScheduling: row.allow_overtime_scheduling || false,
	schedulingLookaheadDays: row.scheduling_lookahead_days || 14,
	aiSuggestionPreference: (row.ai_suggestion_preference as 'conservative' | 'balanced' | 'aggressive') || 'balanced',
	respectCalendarEvents: row.respect_calendar_events !== undefined ? row.respect_calendar_events : true,
	autoRescheduleOnConflict: row.auto_reschedule_on_conflict || false,
	energyPeakHours: row.energy_peak_hours ? JSON.parse(JSON.stringify(row.energy_peak_hours)) : [],
	deepWorkTimeSlots: row.deep_work_time_slots ? JSON.parse(JSON.stringify(row.deep_work_time_slots)) : [],
	deadlineBufferDays: row.deadline_buffer_days || 1,
	priorityBoostForOverdue: row.priority_boost_for_overdue !== undefined ? row.priority_boost_for_overdue : true,
	maxDailyWorkHours: row.max_daily_work_hours || 8.0,
	focusTimeMinimumMinutes: row.focus_time_minimum_minutes || 90,
	contextSwitchPenaltyMinutes: row.context_switch_penalty_minutes || 10,
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
	...(preferences.calendarDefaultZoom !== undefined && { calendar_default_zoom: preferences.calendarDefaultZoom }),
	...(preferences.calendarDefaultView && { calendar_default_view: preferences.calendarDefaultView }),
	...(preferences.boardDefaultView && { board_default_view: preferences.boardDefaultView }),
	...(preferences.googleCalendarEnabled !== undefined && { google_calendar_enabled: preferences.googleCalendarEnabled }),
	...(preferences.googleCalendarSelectedCalendar !== undefined && { google_calendar_selected_calendar: preferences.googleCalendarSelectedCalendar }),
	...(preferences.googleCalendarAutoSync !== undefined && { google_calendar_auto_sync: preferences.googleCalendarAutoSync }),
	...(preferences.googleCalendarSyncOnlyScheduled !== undefined && { google_calendar_sync_only_scheduled: preferences.googleCalendarSyncOnlyScheduled }),
	// AI Scheduling settings
	...(preferences.autoScheduleEnabled !== undefined && { auto_schedule_enabled: preferences.autoScheduleEnabled }),
	...(preferences.workingHoursMondayStart && { working_hours_monday_start: preferences.workingHoursMondayStart }),
	...(preferences.workingHoursMondayEnd && { working_hours_monday_end: preferences.workingHoursMondayEnd }),
	...(preferences.workingHoursMondayEnabled !== undefined && { working_hours_monday_enabled: preferences.workingHoursMondayEnabled }),
	...(preferences.workingHoursTuesdayStart && { working_hours_tuesday_start: preferences.workingHoursTuesdayStart }),
	...(preferences.workingHoursTuesdayEnd && { working_hours_tuesday_end: preferences.workingHoursTuesdayEnd }),
	...(preferences.workingHoursTuesdayEnabled !== undefined && { working_hours_tuesday_enabled: preferences.workingHoursTuesdayEnabled }),
	...(preferences.workingHoursWednesdayStart && { working_hours_wednesday_start: preferences.workingHoursWednesdayStart }),
	...(preferences.workingHoursWednesdayEnd && { working_hours_wednesday_end: preferences.workingHoursWednesdayEnd }),
	...(preferences.workingHoursWednesdayEnabled !== undefined && { working_hours_wednesday_enabled: preferences.workingHoursWednesdayEnabled }),
	...(preferences.workingHoursThursdayStart && { working_hours_thursday_start: preferences.workingHoursThursdayStart }),
	...(preferences.workingHoursThursdayEnd && { working_hours_thursday_end: preferences.workingHoursThursdayEnd }),
	...(preferences.workingHoursThursdayEnabled !== undefined && { working_hours_thursday_enabled: preferences.workingHoursThursdayEnabled }),
	...(preferences.workingHoursFridayStart && { working_hours_friday_start: preferences.workingHoursFridayStart }),
	...(preferences.workingHoursFridayEnd && { working_hours_friday_end: preferences.workingHoursFridayEnd }),
	...(preferences.workingHoursFridayEnabled !== undefined && { working_hours_friday_enabled: preferences.workingHoursFridayEnabled }),
	...(preferences.workingHoursSaturdayStart && { working_hours_saturday_start: preferences.workingHoursSaturdayStart }),
	...(preferences.workingHoursSaturdayEnd && { working_hours_saturday_end: preferences.workingHoursSaturdayEnd }),
	...(preferences.workingHoursSaturdayEnabled !== undefined && { working_hours_saturday_enabled: preferences.workingHoursSaturdayEnabled }),
	...(preferences.workingHoursSundayStart && { working_hours_sunday_start: preferences.workingHoursSundayStart }),
	...(preferences.workingHoursSundayEnd && { working_hours_sunday_end: preferences.workingHoursSundayEnd }),
	...(preferences.workingHoursSundayEnabled !== undefined && { working_hours_sunday_enabled: preferences.workingHoursSundayEnabled }),
	...(preferences.bufferTimeBetweenTasks !== undefined && { buffer_time_between_tasks: preferences.bufferTimeBetweenTasks }),
	...(preferences.maxTaskChunkSize !== undefined && { max_task_chunk_size: preferences.maxTaskChunkSize }),
	...(preferences.minTaskChunkSize !== undefined && { min_task_chunk_size: preferences.minTaskChunkSize }),
	...(preferences.allowOvertimeScheduling !== undefined && { allow_overtime_scheduling: preferences.allowOvertimeScheduling }),
	...(preferences.schedulingLookaheadDays !== undefined && { scheduling_lookahead_days: preferences.schedulingLookaheadDays }),
	...(preferences.aiSuggestionPreference && { ai_suggestion_preference: preferences.aiSuggestionPreference }),
	...(preferences.respectCalendarEvents !== undefined && { respect_calendar_events: preferences.respectCalendarEvents }),
	...(preferences.autoRescheduleOnConflict !== undefined && { auto_reschedule_on_conflict: preferences.autoRescheduleOnConflict }),
	...(preferences.energyPeakHours && { energy_peak_hours: preferences.energyPeakHours }),
	...(preferences.deepWorkTimeSlots && { deep_work_time_slots: preferences.deepWorkTimeSlots }),
	...(preferences.deadlineBufferDays !== undefined && { deadline_buffer_days: preferences.deadlineBufferDays }),
	...(preferences.priorityBoostForOverdue !== undefined && { priority_boost_for_overdue: preferences.priorityBoostForOverdue }),
	...(preferences.maxDailyWorkHours !== undefined && { max_daily_work_hours: preferences.maxDailyWorkHours }),
	...(preferences.focusTimeMinimumMinutes !== undefined && { focus_time_minimum_minutes: preferences.focusTimeMinimumMinutes }),
	...(preferences.contextSwitchPenaltyMinutes !== undefined && { context_switch_penalty_minutes: preferences.contextSwitchPenaltyMinutes }),
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
			const [preferencesResult, profileResult] = await Promise.allSettled([supabase.from('user_preferences').select('*').eq('id', userId).single(), supabase.from('profiles').select('*').eq('id', userId).single()]);

			// Handle preferences result
			if (preferencesResult.status === 'fulfilled' && preferencesResult.value.data) {
				setUserPreferences(transformUserPreferences(preferencesResult.value.data));
			} else if (preferencesResult.status === 'rejected' || (preferencesResult.status === 'fulfilled' && preferencesResult.value.error?.code === 'PGRST116')) {
				// Create default preferences if they don't exist
				await createDefaultUserPreferences(userId);
			}

			// Handle profile result
			if (profileResult.status === 'fulfilled' && profileResult.value.data) {
				setUserProfile(transformProfile(profileResult.value.data));
			} else if (profileResult.status === 'rejected' || (profileResult.status === 'fulfilled' && profileResult.value.error?.code === 'PGRST116')) {
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
			calendar_default_zoom: 1,
			calendar_default_view: '3-day',
			board_default_view: 'compact',
			// Google Calendar integration defaults
			google_calendar_enabled: false,
			google_calendar_selected_calendar: null,
			google_calendar_auto_sync: false,
			google_calendar_sync_only_scheduled: true,
			// AI Scheduling defaults
			auto_schedule_enabled: true,
		};

		const { data, error } = await supabase.from('user_preferences').insert(defaultPreferences).select().single();

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

		const { data, error } = await supabase.from('profiles').insert(defaultProfile).select().single();

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
			setUserPreferences(prev => (prev ? { ...prev, ...updates } : null));

			const { data, error } = await supabase.from('user_preferences').update(updateData).eq('id', userId).select().single();

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
			setUserProfile(prev => (prev ? { ...prev, ...updates } : null));

			const { data, error } = await supabase.from('profiles').update(updateData).eq('id', userId).select().single();

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
