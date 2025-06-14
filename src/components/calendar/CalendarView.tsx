import { CompactCalendarView } from './CompactCalendarView';
import { Task, Board } from '@/types';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { GlobalSidebar } from '@/components/ui/global-sidebar';

interface CalendarViewProps {
	board: Board;
	tasks: Task[];
	onBack: () => void;
	onSelectBoard?: (board: Board) => void;
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
export function CalendarView(props: CalendarViewProps) {
	return (
		<SidebarProvider>
			<div className='h-screen bg-background flex w-full'>
				<GlobalSidebar
					boards={props.boards || []}
					currentBoard={props.board}
					onSelectBoard={(selectedBoard) => {
						// Use the proper board selection handler if available, otherwise fallback to onBack
						if (props.onSelectBoard) {
							props.onSelectBoard(selectedBoard);
						} else {
							props.onBack();
						}
					}}
				/>
				<SidebarInset className='flex flex-col'>
					<CompactCalendarView {...props} />
				</SidebarInset>
			</div>
		</SidebarProvider>
	);
}
