import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Layers, PlusCircle, List } from 'lucide-react';
import { ProfileDropdown } from '@/components/profile/ProfileDropdown';
import { Board } from '@/types';
import { isTauri } from '@/lib/platform';
import { ThemeToggle } from './theme-toggle';
import { renderIcon } from '@/constants/board-constants';

interface ViewHeaderProps {
	board: Board;
	currentView: 'kanban' | 'calendar' | 'list';
	onBack: () => void;
	onViewChange?: (board: Board, viewType: 'kanban' | 'calendar' | 'list') => Promise<void>;
	onCreateDetailedTask?: () => void;
	user?: unknown;
	onSignOut?: () => Promise<{ error: unknown }>;
	onOpenSettings?: () => void;
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

export function ViewHeader({ board, currentView, onBack, onViewChange, onCreateDetailedTask, user, onSignOut, onOpenSettings }: ViewHeaderProps) {
	return (
		<div className={`${!isTauri() ? '' : ''} p-4 border-b border-border bg-card relative z-10`}>
			<div className='flex items-center justify-between container max-w-screen mx-auto'>
				<div className='flex items-center gap-4'>
					<Button
						variant='ghost'
						size='sm'
						onClick={onBack}
						className='gap-2 relative z-[60] pointer-events-auto'
					>
						<ArrowLeft className='h-8 w-8' />
					</Button>

					<div className='flex items-center gap-3'>
						<div
							className='w-8 h-8 rounded-lg flex items-center justify-center text-white'
							style={{ backgroundColor: board.color || '#3B82F6' }}
						>
							{renderIcon(board.icon, 'h-5 w-5')}
						</div>
						<div>
							<h1 className='text-xl font-bold text-foreground'>{board.name}</h1>
							{board.description && <p className='text-sm text-muted-foreground'>{board.description}</p>}
						</div>
					</div>
				</div>

				<div className='flex items-center gap-4'>
					{onCreateDetailedTask && (
						<Button
							variant='default'
							size='sm'
							onClick={onCreateDetailedTask}
							className='gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
						>
							<PlusCircle className='h-4 w-4' />
							New Task
						</Button>
					)}

					{onViewChange && (
						<div className='flex items-center gap-2 bg-muted rounded-lg p-1'>
							{(['kanban', 'calendar', 'list'] as const).map(view => (
								<Button
									key={view}
									variant='ghost'
									size='sm'
									className={`text-xs px-3 py-1 gap-1.5 ${currentView === view ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10'}`}
									onClick={() => onViewChange(board, view)}
								>
									{VIEW_ICONS[view]}
									{VIEW_NAMES[view]}
								</Button>
							))}
						</div>
					)}
					<ThemeToggle />
					<ProfileDropdown
						user={user}
						onSignOut={onSignOut}
						onOpenSettings={onOpenSettings}
					/>
				</div>
			</div>
		</div>
	);
}
