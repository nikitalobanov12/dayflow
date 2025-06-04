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
