import { CompactCalendarView } from './CompactCalendarView';
import { Task, Board } from '@/types';

interface CalendarViewProps {
	board: Board;
	tasks: Task[];
	onBack: () => void;
	onMoveTask: (taskId: number, newStatus: Task['status']) => Promise<void>;
	onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
	onUpdateTask: (id: number, updates: Partial<Task>) => Promise<void>;
	onDeleteTask: (id: number) => Promise<void>;
	onDuplicateTask?: (task: Task) => Promise<void>;
	onUpdateTimeEstimate: (taskId: number, timeEstimate: number) => Promise<void>;
	isAllTasksBoard?: boolean;
	boards?: Board[];
	user?: any;
	onSignOut?: () => Promise<{ error: any }>;
	onViewChange?: (board: Board, viewType: 'kanban' | 'calendar') => Promise<void>;
	onOpenSettings?: () => void;
	userPreferences?: any;
}
// WIP solution
export function CalendarView(props: CalendarViewProps) {
	// Simply pass through all props to the CompactCalendarView
	return <CompactCalendarView {...props} />;
}
