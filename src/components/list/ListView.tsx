import { CompactListView } from './CompactListView'; // Ensure file exists
import { Task, Board, UserPreferences, BoardViewType } from '@/types';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { GlobalSidebar } from '@/components/ui/global-sidebar';
import { UnifiedHeader } from '@/components/ui/unified-header';

interface ListViewProps {
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
	user?: any; // Consider using a more specific type for user
	onSignOut?: () => Promise<{ error: any }>;
	onViewChange?: (board: Board, viewType: BoardViewType) => Promise<void>;
	onOpenSettings?: () => void;
	userPreferences?: UserPreferences;
}

export function ListView(props: ListViewProps) {
	// GlobalSidebar requiring minimal props
	return (
		<SidebarProvider>
			<div className='h-screen bg-background flex w-full'>
				<GlobalSidebar
					boards={props.boards || []}
					currentBoard={props.board}
					onSelectBoard={(selectedBoard: Board) => {
						if (props.onSelectBoard) {
							props.onSelectBoard(selectedBoard);
						} else {
							props.onBack();
						}
					}}
				/>
				<SidebarInset className='flex flex-col flex-1 overflow-y-auto'>
					{/* Header for List View */}
					<UnifiedHeader
						title={props.board.name}
						subtitle={props.board.description}
						board={props.board}
						currentView='list'
						onViewChange={props.onViewChange}
						user={props.user}
						onSignOut={props.onSignOut}
						onOpenSettings={props.onOpenSettings}
					/>
					<CompactListView {...props} />
				</SidebarInset>
			</div>
		</SidebarProvider>
	);
}
