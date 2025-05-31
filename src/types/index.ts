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
}

export interface Journal {
	id: number;
	date: string;
	content: string;
	mood?: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
	createdAt: string;
}

export interface Sprint {
	id: number;
	taskIds: number[];
	startTime: string;
	endTime?: string;
	totalEstimatedTime: number;
	actualTime?: number;
	isActive: boolean;
}

export interface Timer {
	isRunning: boolean;
	currentTaskId?: number;
	startTime?: string;
	elapsedTime: number; // in seconds
	mode: 'pomodoro' | 'countdown' | 'stopwatch';
	pomodoroLength: number; // in minutes
}
