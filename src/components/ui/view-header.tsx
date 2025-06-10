import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Layers, BarChart3, Grid } from 'lucide-react';
import { ProfileDropdown } from '@/components/profile/ProfileDropdown';
import { Board } from '@/types';
import { isTauri } from '@/lib/platform';
import { ThemeToggle } from './theme-toggle';

interface ViewHeaderProps {
	board: Board;
	currentView: 'kanban' | 'calendar' | 'eisenhower' | 'gantt';
	onBack: () => void;
	onViewChange?: (board: Board, viewType: 'kanban' | 'calendar' | 'eisenhower' | 'gantt') => Promise<void>;
	user?: any;
	onSignOut?: () => Promise<{ error: any }>;
	onOpenSettings?: () => void;
}

const VIEW_ICONS = {
	kanban: <Layers className='h-4 w-4' />,
	calendar: <Calendar className='h-4 w-4' />,
	eisenhower: <Grid className='h-4 w-4' />,
	gantt: <BarChart3 className='h-4 w-4' />,
};

const VIEW_NAMES = {
	kanban: 'Kanban',
	calendar: 'Calendar',
	eisenhower: 'Matrix',
	gantt: 'Gantt',
};

export function ViewHeader({ board, currentView, onBack, onViewChange, user, onSignOut, onOpenSettings }: ViewHeaderProps) {
	return (
		<div className={`${!isTauri() ? '' : ''} p-4 border-b border-border bg-card relative z-10`}>
			<div className='flex items-center justify-between container max-w-[1376px] mx-auto'>
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
							className='w-8 h-8 rounded-lg flex items-center justify-center text-xl'
							style={{ backgroundColor: board.color || '#3B82F6' }}
						>
							{board.icon || '📋'}
						</div>
						<div>
							<h1 className='text-xl font-bold text-foreground'>{board.name}</h1>
							{board.description && <p className='text-sm text-muted-foreground'>{board.description}</p>}
						</div>
					</div>
				</div>

				<div className='flex items-center gap-4'>
					{onViewChange && (
						<div className='flex items-center gap-2 bg-muted rounded-lg p-1'>
							{(['kanban', 'calendar', 'eisenhower', 'gantt'] as const).map(view => (
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
					<ThemeToggle />{' '}
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
