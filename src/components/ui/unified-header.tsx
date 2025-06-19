import { Button } from '@/components/ui/button';
import { Calendar, Layers, PlusCircle, Grid3X3, List, LayoutGrid } from 'lucide-react';
import { ProfileDropdown } from '@/components/profile/ProfileDropdown';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Board, Task, UserPreferences } from '@/types';
import { renderIcon } from '@/constants/board-constants';
import { isTauri } from '@/lib/platform';
import { Separator } from '@/components/ui/separator';
import { AISchedulerButton } from '@/components/ai/AISchedulerButton';

interface UnifiedHeaderProps {
	// Basic header info
	title: string;
	subtitle?: string;

	// Board info (for board views)
	board?: Board;
	currentView?: 'kanban' | 'calendar' | 'list';

	// View mode (for board selection)
	viewMode?: 'grid' | 'compact' | 'list';
	boardCount?: number;

	// Actions
	onViewChange?: (board: Board, viewType: 'kanban' | 'calendar' | 'list') => Promise<void>;
	onCreateDetailedTask?: () => void;
	onViewModeChange?: (mode: 'grid' | 'compact' | 'list') => void;

	// Right side actions
	user?: any;
	onSignOut?: () => Promise<{ error: any }>;
	onOpenSettings?: () => void;

	// AI Scheduling
	tasks?: Task[];
	boards?: Board[];
	userPreferences?: UserPreferences;

	// Extra content
	children?: React.ReactNode;
}

const VIEW_ICONS = {
	kanban: <Layers className='h-4 w-4' />,
	calendar: <Calendar className='h-4 w-4' />,
	list: <List className='h-4 w-4' />,
};

const VIEW_NAMES = {
	kanban: 'Kanban',
	calendar: 'Calendar',
	list: 'List',
};

export function UnifiedHeader({ title, subtitle, board, currentView, viewMode, boardCount, onViewChange, onCreateDetailedTask, onViewModeChange, user, onSignOut, onOpenSettings, tasks, boards, userPreferences, children }: UnifiedHeaderProps) {
	return (
		<header className={`${!isTauri() ? '' : ''} flex h-16 shrink-0 items-center gap-2 px-4 border-b border-border bg-card/50 backdrop-blur-sm relative z-10`}>
			<SidebarTrigger className='mr-2.5' />
			<Separator
				orientation='vertical'
				className='mr-2 h-4'
			/>

			{/* Left side - Title and board info */}
			<div className='flex items-center gap-3 flex-1 min-w-0'>
				{board && (
					<div
						className='w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0'
						style={{ backgroundColor: board.color || '#3B82F6' }}
					>
						{renderIcon(board.icon, 'h-5 w-5')}
					</div>
				)}
				<div className='min-w-0 flex-1'>
					<h1 className='text-lg font-semibold text-foreground truncate'>{title}</h1>
					{subtitle && <p className='text-xs text-muted-foreground truncate'>{subtitle}</p>}
				</div>
			</div>

			{/* Center - View controls */}
			<div className='flex items-center gap-3'>
				{children}

				{/* Board view mode toggle */}
				{onViewModeChange && viewMode && (
					<div className='flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/50'>
						<Button
							variant={viewMode === 'compact' ? 'default' : 'ghost'}
							size='sm'
							onClick={() => onViewModeChange('compact')}
							className='h-7 w-7 p-0'
							title='Compact grid view'
						>
							<LayoutGrid className='h-3.5 w-3.5' />
						</Button>
						<Button
							variant={viewMode === 'grid' ? 'default' : 'ghost'}
							size='sm'
							onClick={() => onViewModeChange('grid')}
							className='h-7 w-7 p-0'
							title='Grid view'
						>
							<Grid3X3 className='h-3.5 w-3.5' />
						</Button>
						<Button
							variant={viewMode === 'list' ? 'default' : 'ghost'}
							size='sm'
							onClick={() => onViewModeChange('list')}
							className='h-7 w-7 p-0'
							title='List view'
						>
							<List className='h-3.5 w-3.5' />
						</Button>
					</div>
				)}

				{/* Kanban/Calendar/List view toggle */}
				{onViewChange && board && currentView && (
					<div className='flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/50'>
						{(['kanban', 'calendar', 'list'] as const).map(view => (
							<Button
								key={view}
								variant={currentView === view ? 'default' : 'ghost'}
								size='sm'
								className='gap-1.5 h-7'
								onClick={() => {
									console.log('View change clicked:', view, 'for board:', board.name);
									onViewChange(board, view);
								}}
							>
								{VIEW_ICONS[view]}
								{VIEW_NAMES[view]}
							</Button>
						))}
					</div>
				)}
			</div>

			{/* Right side - Actions and user menu */}
			<div className='flex items-center gap-3'>
				{/* Board count */}
				{boardCount !== undefined && boardCount > 0 && (
					<div className='text-xs text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/50'>
						{boardCount} {boardCount === 1 ? 'board' : 'boards'}
					</div>
				)}

				{/* AI Scheduler button - only show for board views */}
				{tasks && boards && userPreferences && (currentView === 'kanban' || currentView === 'list') && (
					<AISchedulerButton
						tasks={tasks}
						boards={boards}
						userPreferences={userPreferences}
						variant='outline'
						size='sm'
						showDropdown={false}
						onOpenSettings={onOpenSettings}
					/>
				)}

				{/* New task button */}
				{onCreateDetailedTask && (
					<Button
						variant='default'
						size='sm'
						onClick={onCreateDetailedTask}
						className='gap-1.5'
					>
						<PlusCircle className='h-4 w-4' />
						New Task
					</Button>
				)}

				<ProfileDropdown
					user={user}
					onSignOut={onSignOut}
					onOpenSettings={onOpenSettings}
				/>
			</div>
		</header>
	);
}
