import { Board, UserPreferences } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Layers, Grid3X3, List, LayoutGrid } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ProfileDropdown } from '@/components/profile/ProfileDropdown';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from '@/components/ui/sidebar';
import { Logo } from '@/components/ui/logo';

interface BoardSelectionProps {
	boards: Board[];
	onSelectBoard: (board: Board) => void;
	onCreateBoard: (board: Omit<Board, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
	onUpdateBoard: (id: number, updates: Partial<Board>) => Promise<void>;
	onDeleteBoard: (id: number) => Promise<void>;
	user?: any;
	onSignOut?: () => Promise<{ error: any }>;
	onOpenSettings?: () => void;
	userPreferences?: UserPreferences | null;
	onUpdateUserPreferences?: (updates: Partial<UserPreferences>) => Promise<void>;
}

const BOARD_COLORS = [
	'#3B82F6', // Blue
	'#10B981', // Green
	'#F59E0B', // Yellow
	'#EF4444', // Red
	'#8B5CF6', // Purple
	'#06B6D4', // Cyanmotion
	'#F97316', // Orange
	'#84CC16', // Lime
	'#EC4899', // Pink
	'#6B7280', // Gray
];

const BOARD_ICONS = ['📋', '📊', '📅', '📝', '💼', '🎯', '📈', '🚀', '⭐', '🔥', '💡', '🎨', '⚡', '🌟', '🏆', '📌', '🎪', '🎭', '🎵', '🎮', '🌈', '🦄', '🍕', '☕', '🌱', '🔮', '🎊', '🎉', '💎', '🗂️'];

type ViewMode = 'grid' | 'compact' | 'list';

export function BoardSelection({ boards, onSelectBoard, onCreateBoard, onUpdateBoard, onDeleteBoard, user, onSignOut, onOpenSettings, userPreferences, onUpdateUserPreferences }: BoardSelectionProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [isEditing, setIsEditing] = useState<Board | null>(null);
	const [viewMode, setViewMode] = useState<ViewMode>('compact');
	const [newBoard, setNewBoard] = useState({
		name: '',
		description: '',
		color: BOARD_COLORS[0],
		icon: '📋',
	});

	const handleCreateBoard = async () => {
		if (!newBoard.name.trim()) return;
		try {
			await onCreateBoard({
				name: newBoard.name,
				description: newBoard.description,
				color: newBoard.color,
				icon: newBoard.icon,
			});
			setNewBoard({ name: '', description: '', color: BOARD_COLORS[0], icon: '📋' });
			setIsCreating(false);
		} catch (error) {
			console.error('Failed to create board:', error);
		}
	};

	const handleUpdateBoard = async () => {
		if (!isEditing || !newBoard.name.trim()) return;
		try {
			await onUpdateBoard(isEditing.id, {
				name: newBoard.name,
				description: newBoard.description,
				color: newBoard.color,
				icon: newBoard.icon,
			});
			setIsEditing(null);
			setNewBoard({ name: '', description: '', color: BOARD_COLORS[0], icon: '📋' });
		} catch (error) {
			console.error('Failed to update board:', error);
		}
	};

	const startEditing = (board: Board) => {
		setIsEditing(board);
		setNewBoard({
			name: board.name,
			description: board.description || '',
			color: board.color || BOARD_COLORS[0],
			icon: board.icon || '📋',
		});
	};

	const regularBoards = boards.filter(board => !board.isDefault);
	const allTasksBoard = boards.find(board => board.isDefault);

	const getGridClasses = () => {
		switch (viewMode) {
			case 'grid':
				return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6';
			case 'compact':
				return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4';
			case 'list':
				return 'flex flex-col gap-3';
			default:
				return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4';
		}
	};

	const renderBoardCard = (board: Board) => {
		const baseClasses = 'bg-card border border-border rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden';
		
		switch (viewMode) {
			case 'grid':
				return (
					<div
						key={board.id}
						className={cn(baseClasses, 'p-6 h-32')}
						onClick={() => onSelectBoard(board)}
					>
						<div className='flex items-start gap-4 h-full'>
							<div
								className='w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm flex-shrink-0'
								style={{ backgroundColor: board.color }}
							>
								{board.icon}
							</div>
							<div className='flex-1 min-w-0 flex flex-col justify-between h-full'>
								<div>
									<h3 className='text-lg font-semibold text-foreground mb-1 truncate'>{board.name}</h3>
									{board.description && (
										<p className='text-sm text-muted-foreground line-clamp-2'>{board.description}</p>
									)}
								</div>
								<div className='flex items-center text-xs text-muted-foreground mt-2'>
									<span>Board • Click to open</span>
								</div>
							</div>
						</div>
						<div className='absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300'>
							<button
								onClick={e => {
									e.stopPropagation();
									startEditing(board);
								}}
								className='text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-accent/50'
								title='Edit board'
							>
								<Edit className='h-4 w-4' />
							</button>
						</div>
					</div>
				);

			case 'compact':
				return (
					<div
						key={board.id}
						className={cn(baseClasses, 'p-4 aspect-square flex flex-col items-center justify-center text-center')}
						onClick={() => onSelectBoard(board)}
					>
						<div
							className='w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl shadow-sm mb-3'
							style={{ backgroundColor: board.color }}
						>
							{board.icon}
						</div>
						<h3 className='text-sm sm:text-base font-semibold text-foreground mb-1 truncate w-full px-1'>{board.name}</h3>
						{board.description && (
							<p className='text-xs text-muted-foreground line-clamp-2 hidden sm:block'>{board.description}</p>
						)}
						<div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300'>
							<button
								onClick={e => {
									e.stopPropagation();
									startEditing(board);
								}}
								className='text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent/50'
								title='Edit board'
							>
								<Edit className='h-3 w-3' />
							</button>
						</div>
					</div>
				);

			case 'list':
				return (
					<div
						key={board.id}
						className={cn(baseClasses, 'p-4 flex items-center gap-4')}
						onClick={() => onSelectBoard(board)}
					>
						<div
							className='w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-sm flex-shrink-0'
							style={{ backgroundColor: board.color }}
						>
							{board.icon}
						</div>
						<div className='flex-1 min-w-0'>
							<h3 className='text-base font-semibold text-foreground mb-1 truncate'>{board.name}</h3>
							{board.description && (
								<p className='text-sm text-muted-foreground truncate'>{board.description}</p>
							)}
						</div>
						<div className='flex items-center gap-2 text-xs text-muted-foreground'>
							<span className='hidden sm:inline'>Board</span>
						</div>
						<div className='opacity-0 group-hover:opacity-100 transition-all duration-300'>
							<button
								onClick={e => {
									e.stopPropagation();
									startEditing(board);
								}}
								className='text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-accent/50'
								title='Edit board'
							>
								<Edit className='h-4 w-4' />
							</button>
						</div>
					</div>
				);

			default:
				return null;
		}
	};

	useEffect(() => {
		if (userPreferences && userPreferences.boardDefaultView) {
			setViewMode(userPreferences.boardDefaultView);
		}
	}, [userPreferences]);

	const handleViewModeChange = async (newViewMode: ViewMode) => {
		setViewMode(newViewMode);
		if (userPreferences && onUpdateUserPreferences) {
			try {
				await onUpdateUserPreferences({ boardDefaultView: newViewMode });
			} catch (error) {
				console.error('Failed to update board view preference:', error);
			}
		}
	};

	return (
		<SidebarProvider>
			<div className='min-h-screen flex w-full'>
				<Sidebar variant='sidebar'>
					<SidebarHeader>
						<div className='flex items-center gap-2 px-2 py-1'>
							<div className='w-8 h-8 flex items-center justify-center'>
								<Logo className='w-full h-full' />
							</div>
							<div>
								<h1 className='text-lg font-semibold'>DayFlow</h1>
								<p className='text-xs text-muted-foreground'>Task Management</p>
							</div>
						</div>
					</SidebarHeader>

					<SidebarContent>
						{/* Quick Actions */}
						<SidebarGroup>
							<SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									<SidebarMenuItem>
										<SidebarMenuButton
											onClick={() => setIsCreating(true)}
											className='gap-2'
										>
											<Plus className='h-4 w-4' />
											<span>New Board</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>

						{/* All Tasks Board */}
						{allTasksBoard && (
							<SidebarGroup>
								<SidebarGroupLabel>Quick Access</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										<SidebarMenuItem>
											<SidebarMenuButton
												onClick={() => onSelectBoard(allTasksBoard)}
												className='gap-2'
											>
												<div
													className='w-4 h-4 rounded flex items-center justify-center text-xs'
													style={{ backgroundColor: allTasksBoard.color || '#3B82F6' }}
												>
													{allTasksBoard.icon || '📋'}
												</div>
												<span>{allTasksBoard.name}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						)}

						{/* Regular Boards */}
						{regularBoards.length > 0 && (
							<SidebarGroup>
								<SidebarGroupLabel>Your Boards</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{regularBoards.map(board => (
											<SidebarMenuItem key={board.id}>
												<SidebarMenuButton
													onClick={() => onSelectBoard(board)}
													className='gap-2 group'
												>
													<div
														className='w-4 h-4 rounded flex items-center justify-center text-xs'
														style={{ backgroundColor: board.color }}
													>
														{board.icon}
													</div>
													<span className='flex-1 truncate'>{board.name}</span>
													<button
															title='edit button'
														onClick={e => {
															e.stopPropagation();
															startEditing(board);
														}}
														className='opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded'
													>
														<Edit className='h-3 w-3' />
													</button>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						)}
					</SidebarContent>

					<SidebarFooter>
						<SidebarMenu></SidebarMenu>
					</SidebarFooter>

					<SidebarRail />
				</Sidebar>
				{/* Main Content */}
				<main className='flex-1 flex flex-col bg-muted/30'>
					<header className='flex h-16 shrink-0 items-center gap-2 px-4 border-b bg-background/50 backdrop-blur-sm'>
						<SidebarTrigger className='-ml-1' />
						<div className='flex-1'>
							<h2 className='text-xl font-semibold'>Your Boards</h2>
							<p className='text-sm text-muted-foreground'>Organize your projects and workflows</p>
						</div>
						
						{/* View Mode Toggle */}
						{regularBoards.length > 0 && (
							<div className='flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/50'>
								<Button
									variant={viewMode === 'compact' ? 'default' : 'ghost'}
									size='sm'
									onClick={() => handleViewModeChange('compact')}
									className='h-7 w-7 p-0'
									title='Compact grid view'
								>
									<LayoutGrid className='h-3.5 w-3.5' />
								</Button>
								<Button
									variant={viewMode === 'grid' ? 'default' : 'ghost'}
									size='sm'
									onClick={() => handleViewModeChange('grid')}
									className='h-7 w-7 p-0'
									title='Grid view'
								>
									<Grid3X3 className='h-3.5 w-3.5' />
								</Button>
								<Button
									variant={viewMode === 'list' ? 'default' : 'ghost'}
									size='sm'
									onClick={() => handleViewModeChange('list')}
									className='h-7 w-7 p-0'
									title='List view'
								>
									<List className='h-3.5 w-3.5' />
								</Button>
							</div>
						)}
						
						{regularBoards.length > 0 && (
							<div className='text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50'>
								{regularBoards.length} {regularBoards.length === 1 ? 'board' : 'boards'}
							</div>
						)}
						<ProfileDropdown
							user={user}
							onSignOut={onSignOut}
							onOpenSettings={onOpenSettings}
						/>{' '}
					</header>
					<div className='flex-1 p-4 sm:p-6 bg-muted/30'>
						{regularBoards.length > 0 ? (
							<div className={getGridClasses()}>
								{regularBoards.map(renderBoardCard)}
							</div>
						) : (
							<div className='flex items-center justify-center h-96'>
								<div className='text-center max-w-md'>
									<div className='w-16 h-16 mx-auto rounded-2xl bg-muted/30 flex items-center justify-center mb-4'>
										<Layers className='h-8 w-8 text-muted-foreground' />
									</div>
									<h3 className='text-xl font-semibold text-foreground mb-2'>Create your first board</h3>
									<p className='text-muted-foreground mb-6'>Boards help you organize tasks into different projects or workflows. Get started by creating your first board.</p>
									<Button
										onClick={() => setIsCreating(true)}
										size='lg'
										className='gap-2'
									>
										<Plus className='h-5 w-5' />
										Create Your First Board
									</Button>
								</div>
							</div>
						)}
					</div>{' '}
				</main>
			</div>

			<Dialog
				open={isCreating || !!isEditing}
				onOpenChange={open => {
					if (!open) {
						setIsCreating(false);
						setIsEditing(null);
						setNewBoard({ name: '', description: '', color: BOARD_COLORS[0], icon: '📋' });
					}
				}}
			>
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>{isEditing ? 'Edit Board' : 'Create New Board'}</DialogTitle>
						<DialogDescription>{isEditing ? 'Make changes to your board settings' : 'Create a new board to organize your tasks'}</DialogDescription>
					</DialogHeader>
					<div className='space-y-6 pt-2'>
						<div className='space-y-2'>
							<label className='text-sm font-medium text-foreground'>Board Name</label>
							<Input
								placeholder='Enter board name'
								value={newBoard.name}
								onChange={e => setNewBoard({ ...newBoard, name: e.target.value })}
							/>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium text-foreground'>Description (optional)</label>
							<Textarea
								placeholder='Describe what this board is for'
								value={newBoard.description}
								onChange={e => setNewBoard({ ...newBoard, description: e.target.value })}
								rows={2}
								className='resize-none'
							/>
						</div>
						<div className='space-y-3'>
							<label className='text-sm font-medium text-foreground'>Color</label>
							<div className='grid grid-cols-5 gap-2'>
								{BOARD_COLORS.map(color => (
									<button
									title='board colors selection'
										key={color}
										type='button'
										className={cn('w-10 h-10 rounded-lg border-2 transition-all hover:scale-105', newBoard.color === color ? 'border-foreground ring-2 ring-primary/20' : 'border-border hover:border-muted-foreground')}
										style={{ backgroundColor: color }}
										onClick={() => setNewBoard({ ...newBoard, color })}
									/>
								))}
							</div>
						</div>
						<div className='space-y-3'>
							<label className='text-sm font-medium text-foreground'>Icon</label>
							<div className='space-y-3'>
								<div className='grid grid-cols-8 gap-1.5'>
									{BOARD_ICONS.slice(0, 16).map(icon => (
										<button
											key={icon}
											type='button'
											className={cn('w-8 h-8 rounded-md border transition-all flex items-center justify-center text-sm hover:scale-110', newBoard.icon === icon ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-muted-foreground hover:bg-accent/50')}
											onClick={() => setNewBoard({ ...newBoard, icon })}
										>
											{icon}
										</button>
									))}
								</div>
								<div className='flex items-center gap-3'>
									<Input
										placeholder='Custom emoji/text'
										value={newBoard.icon}
										onChange={e => setNewBoard({ ...newBoard, icon: e.target.value })}
										className='flex-1'
										maxLength={4}
									/>
									<div
										className='w-10 h-10 rounded-lg border flex items-center justify-center text-lg shadow-sm'
										style={{ backgroundColor: newBoard.color }}
									>
										{newBoard.icon}
									</div>
								</div>
							</div>
						</div>
						<div className='flex gap-3 pt-4'>
							<Button
								onClick={isEditing ? handleUpdateBoard : handleCreateBoard}
								disabled={!newBoard.name.trim()}
								className='flex-1'
							>
								{isEditing ? 'Save Changes' : 'Create Board'}
							</Button>
							{isEditing && !isEditing.isDefault && (
								<Button
									variant='destructive'
									size='sm'
									onClick={async () => {
										if (confirm('Are you sure you want to delete this board? All tasks will be moved to the default board.')) {
											await onDeleteBoard(isEditing.id);
											setIsEditing(null);
										}
									}}
									className='px-3'
								>
									<Trash2 className='h-4 w-4' />
								</Button>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</SidebarProvider>
	);
}
