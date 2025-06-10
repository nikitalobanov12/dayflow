import { useMemo } from 'react';
import { UserPreferences, Task } from '@/types';

/**
 * Hook to apply user preferences for task filtering, sorting, and formatting
 */
export function useUserPreferences(userPreferences?: UserPreferences | null) {
	// Format date according to user preference
	const formatDate = useMemo(() => {
		return (date: string | Date, includeTime = false): string => {
			if (!date) return '';

			const dateObj = typeof date === 'string' ? new Date(date) : date;
			if (isNaN(dateObj.getTime())) return '';

			const format = userPreferences?.dateFormat || 'MM/DD/YYYY';
			const timeFormat = userPreferences?.timeFormat || '12h';

			let dateStr = '';
			switch (format) {
				case 'DD/MM/YYYY':
					dateStr = dateObj.toLocaleDateString('en-GB', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
					});
					break;
				case 'YYYY-MM-DD':
					dateStr = dateObj.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
					break;
				case 'MM/DD/YYYY':
				default:
					dateStr = dateObj.toLocaleDateString('en-US', {
						month: '2-digit',
						day: '2-digit',
						year: 'numeric',
					});
					break;
			}

			if (includeTime) {
				const timeStr = dateObj.toLocaleTimeString('en-US', {
					hour12: timeFormat === '12h',
					hour: '2-digit',
					minute: '2-digit',
				});
				return `${dateStr} ${timeStr}`;
			}

			return dateStr;
		};
	}, [userPreferences?.dateFormat, userPreferences?.timeFormat]);

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
					case 'priority':
						// Higher priority numbers (4=Critical) should come first
						comparison = (b.priority || 2) - (a.priority || 2);
						break;
					case 'dueDate':
						const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
						const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
						comparison = aDate - bDate;
						break;
					case 'created':
						const aCreated = new Date(a.createdAt).getTime();
						const bCreated = new Date(b.createdAt).getTime();
						comparison = bCreated - aCreated; // Newest first by default
						break;
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

	return {
		formatDate,
		filterTasks,
		sortTasks,
		weekStartsOn,
		isAutoSaveEnabled,
		preferences: userPreferences,
	};
}
