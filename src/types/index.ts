export type RecurringPattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringConfig {
	pattern: RecurringPattern;
	interval: number;
	endDate?: string;
	daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
	daysOfMonth?: number[]; // 1-31
	monthsOfYear?: number[]; // 1-12
}

export interface Task {
	id: number;
	title: string;
	description: string;
	timeEstimate: number; // in minutes
	status: 'backlog' | 'this-week' | 'today' | 'done';
	position: number; // for ordering within status
	scheduledDate?: string;
	createdAt: string;
	completedAt?: string; // ISO date string when task was completed
	tags?: string[];
	userId?: string; // UUID from Supabase auth
	boardId?: number; // Reference to which board this task belongs to
	// Enhanced properties for advanced views
	priority: 1 | 2 | 3 | 4; // 1=Low, 2=Medium, 3=High, 4=Critical
	dueDate?: string; // ISO date string
	startDate?: string; // ISO date string
	category?: string; // e.g., 'Development', 'Design', 'Marketing'
	assigneeId?: string; // UUID for team collaboration
	parentTaskId?: number; // For task dependencies
	progressPercentage: number; // 0-100
	recurring?: RecurringConfig; // For recurring tasks
	recurringInstanceId?: string; // Unique identifier for recurring task instances
	labels: TaskLabel[]; // Color-coded labels
	attachments: TaskAttachment[]; // File attachments
	timeSpent: number; // Actual time spent in minutes
	subtasks?: Subtask[]; // Array of subtasks
	dependencies?: TaskDependency[]; // Array of task dependencies
}

export interface Subtask {
	id: number;
	parentTaskId: number;
	title: string;
	description?: string;
	isCompleted: boolean;
	position: number;
	timeEstimate: number; // in minutes
	createdAt: string;
	completedAt?: string;
	userId: string;
}

export interface TaskDependency {
	id: number;
	predecessorTaskId: number;
	successorTaskId: number;
	dependencyType: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
	lagDays: number; // Delay between tasks
	createdAt: string;
	userId: string;
}

export interface TaskLabel {
	id: string;
	name: string;
	color: string; // Hex color
}

export interface TaskAttachment {
	id: string;
	name: string;
	url: string;
	type: 'image' | 'document' | 'link' | 'other';
	size?: number; // File size in bytes
	uploadedAt: string;
}

export interface TimeEntry {
	id: number;
	taskId: number;
	startTime: string;
	endTime?: string;
	durationMinutes?: number;
	description?: string;
	isBillable: boolean;
	createdAt: string;
	userId: string;
}

export interface Board {
	id: number;
	name: string;
	description?: string;
	color?: string; // Hex color for board theme
	icon?: string; // Emoji or icon name for board
	createdAt: string;
	userId?: string; // UUID from Supabase auth
	isDefault?: boolean; // Whether this is the "All Tasks" board
}

export interface Sprint {
	id: number;
	taskIds: number[];
	startTime: string;
	endTime?: string;
	totalEstimatedTime: number;
	actualTime?: number;
	isActive: boolean;
	userId?: string; // UUID from Supabase auth
}

export interface TaskRow {
	id: number;
	title: string;
	description: string | null;
	time_estimate: number;
	status: string;
	position: number;
	scheduled_date: string | null;
	tags: string[];
	created_at: string;
	completed_at: string | null;
	user_id: string;
	board_id: number | null;
}

export interface SprintRow {
	id: number;
	task_ids: number[];
	start_time: string;
	end_time: string | null;
	total_estimated_time: number;
	actual_time: number | null;
	is_active: boolean;
	created_at: string;
	user_id: string;
}

export interface BoardRow {
	id: number;
	name: string;
	description: string | null;
	color: string | null;
	icon: string | null;
	created_at: string;
	user_id: string;
	is_default: boolean;
}

export interface Timer {
	isRunning: boolean;
	currentTaskId?: number;
	startTime?: string;
	elapsedTime: number; // in seconds
	mode: 'pomodoro' | 'countdown' | 'stopwatch';
	pomodoroLength: number; // in minutes
}

export interface UserPreferences {
	id: string; // UUID matching auth.users.id
	theme: 'light' | 'dark' | 'system';
	language: string;
	dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
	timeFormat: '12h' | '24h';
	weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
	autoSave: boolean;
	showCompletedTasks: boolean;
	taskSortBy: 'priority' | 'dueDate' | 'created' | 'alphabetical';
	taskSortOrder: 'asc' | 'desc';
	calendarDefaultZoom: number; // 0-3 for zoom levels
	calendarDefaultView: '3-day' | 'week';
	boardDefaultView: 'grid' | 'compact' | 'list';
	createdAt: string;
	updatedAt: string;
}

export interface Profile {
	id: string; // UUID matching auth.users.id
	firstName?: string;
	lastName?: string;
	avatarUrl?: string;
	timezone: string;
	createdAt: string;
	updatedAt: string;
}

// Database row interfaces for Supabase
export interface UserPreferencesRow {
	id: string;
	theme: string;
	language: string;
	date_format: string;
	time_format: string;
	week_starts_on: number;
	auto_save: boolean;
	show_completed_tasks: boolean;
	task_sort_by: string;
	task_sort_order: string;
	calendar_default_zoom: number;
	calendar_default_view: string;
	board_default_view: string;
	created_at: string;
	updated_at: string;
}

export interface ProfileRow {
	id: string;
	first_name: string | null;
	last_name: string | null;
	avatar_url: string | null;
	timezone: string;
	created_at: string;
	updated_at: string;
}

export interface RecurringInstance {
	id: number;
	originalTaskId: number;
	instanceDate: string; // ISO date string (YYYY-MM-DD)
	completedAt?: string; // ISO timestamp when completed
	createdAt: string;
	updatedAt: string;
	userId: string;
}

export interface RecurringInstanceRow {
	id: number;
	original_task_id: number;
	instance_date: string;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
	user_id: string;
}
