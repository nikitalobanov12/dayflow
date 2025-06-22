import { useMemo } from 'react';
import { UserPreferences, Task, Profile } from '@/types';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Hook to apply user preferences for task filtering, sorting, and formatting
 */
export function useUserPreferences(userPreferences?: UserPreferences | null, userProfile?: Profile | null) {
	// Format date according to user preference with timezone support
	const formatDate = useMemo(() => {
		return (date: string | Date, includeTime = false): string => {
			if (!date) return '';

			const dateObj = typeof date === 'string' ? new Date(date) : date;
			if (isNaN(dateObj.getTime())) return '';

			// Use user's timezone if available, otherwise fall back to browser's timezone
			const userTimezone = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
			const format = userPreferences?.dateFormat || 'MM/DD/YYYY';
			const timeFormat = userPreferences?.timeFormat || '12h';

			let datePattern = '';
			switch (format) {
				case 'DD/MM/YYYY':
					datePattern = 'dd/MM/yyyy';
					break;
				case 'YYYY-MM-DD':
					datePattern = 'yyyy-MM-dd';
					break;
				case 'MM/DD/YYYY':
				default:
					datePattern = 'MM/dd/yyyy';
					break;
			}

			// Format date using user's timezone
			const dateStr = formatInTimeZone(dateObj, userTimezone, datePattern);

			if (includeTime) {
				const timePattern = timeFormat === '12h' ? 'h:mm a' : 'HH:mm';
				const timeStr = formatInTimeZone(dateObj, userTimezone, timePattern);
				return `${dateStr} ${timeStr}`;
			}

			return dateStr;
		};
	}, [userPreferences?.dateFormat, userPreferences?.timeFormat, userProfile?.timezone]);

	// Filter tasks based on user preferences
	const filterTasks = useMemo(() => {
		return (tasks: Task[]): Task[] => {
			if (!userPreferences?.showCompletedTasks) {
				return tasks.filter(task => task.status !== 'done');
			}
			return tasks;
		};
	}, [userPreferences?.showCompletedTasks]);

	// Sort tasks based on user preferences
	const sortTasks = useMemo(() => {
		return (tasks: Task[]): Task[] => {
			const sortBy = userPreferences?.taskSortBy || 'priority';
			const sortOrder = userPreferences?.taskSortOrder || 'asc';

			const sorted = [...tasks].sort((a, b) => {
				let comparison = 0;

				switch (sortBy) {
					case 'priority': {
						// Higher priority numbers (4=Critical) should come first
						comparison = (b.priority || 2) - (a.priority || 2);
						break;
					}
					case 'dueDate': {
						const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
						const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
						comparison = aDate - bDate;
						break;
					}
					case 'created': {
						const aCreated = new Date(a.createdAt).getTime();
						const bCreated = new Date(b.createdAt).getTime();
						comparison = bCreated - aCreated; // Newest first by default
						break;
					}
					case 'alphabetical':
						comparison = a.title.localeCompare(b.title);
						break;
					default:
						comparison = 0;
				}

				return sortOrder === 'desc' ? -comparison : comparison;
			});

			return sorted;
		};
	}, [userPreferences?.taskSortBy, userPreferences?.taskSortOrder]);

	// Get week start day for calendar views
	const weekStartsOn = useMemo(() => {
		return userPreferences?.weekStartsOn ?? 0; // Default to Sunday
	}, [userPreferences?.weekStartsOn]);
	// Check if auto-save is enabled
	const isAutoSaveEnabled = useMemo(() => {
		return userPreferences?.autoSave !== false; // Default to true
	}, [userPreferences?.autoSave]);

	// Get calendar default zoom level
	const calendarDefaultZoom = useMemo(() => {
		return userPreferences?.calendarDefaultZoom ?? 1; // Default to comfortable view
	}, [userPreferences?.calendarDefaultZoom]);

	// Get calendar default view mode
	const calendarDefaultView = useMemo(() => {
		return userPreferences?.calendarDefaultView ?? '3-day'; // Default to 3-day view
	}, [userPreferences?.calendarDefaultView]);

	return {
		formatDate,
		filterTasks,
		sortTasks,
		weekStartsOn,
		isAutoSaveEnabled,
		calendarDefaultZoom,
		calendarDefaultView,
		preferences: userPreferences,
	};
}
