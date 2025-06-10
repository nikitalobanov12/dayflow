import { Board } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Plus, Edit, Trash2, Layers } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ProfileDropdown } from '@/components/profile/ProfileDropdown';
import { isTauri } from '@/lib/platform';

interface BoardSelectionProps {
	boards: Board[];
	onSelectBoard: (board: Board) => void;
	onCreateBoard: (board: Omit<Board, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
	onUpdateBoard: (id: number, updates: Partial<Board>) => Promise<void>;
	onDeleteBoard: (id: number) => Promise<void>;
	user?: any;
	onSignOut?: () => Promise<{ error: any }>;
	onOpenSettings?: () => void;
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

export function BoardSelection({ boards, onSelectBoard, onCreateBoard, onUpdateBoard, onDeleteBoard, user, onSignOut, onOpenSettings }: BoardSelectionProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [isEditing, setIsEditing] = useState<Board | null>(null);
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
	return (
		<div className='min-h-screen bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden'>
			{/* Ultra-modern Header */}
			<div className={`${!isTauri() ? '' : ''} sticky top-0 z-50 backdrop-blur-xl bg-background/90 border-b border-border/30`}>
				<div className='container max-w-7xl mx-auto px-8 py-8'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-6'>
							<div className='flex items-center gap-5'>
								<div className='relative group'>
									<div className='w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300'>
										<Layers className='h-7 w-7 text-primary-foreground' />
									</div>
									<div className='absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 blur-sm transition-all duration-300' />
								</div>
								<div>
									<h1 className='text-3xl font-bold text-foreground tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text'>Boards</h1>
									<p className='text-muted-foreground mt-0.5 font-medium'>Organize your workflow</p>
								</div>
							</div>
						</div>
						<div className='flex items-center gap-3'>
							<Button
								onClick={() => setIsCreating(true)}
								className='gap-2 px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 font-medium'
								size='default'
							>
								<Plus className='h-4 w-4' />
								New Board
							</Button>
							<ThemeToggle />{' '}
							<ProfileDropdown
								user={user}
								onSignOut={onSignOut}
								onOpenSettings={onOpenSettings}
							/>
						</div>
					</div>
				</div>
			</div>{' '}
			{/* Main content area */}
			<div className='container max-w-7xl mx-auto px-8 py-16'>
				{/* All Tasks Board - Hero Section */}
				{allTasksBoard && (
					<div className='mb-20'>
						<div className='mb-10'>
							<h2 className='text-2xl font-bold text-foreground mb-3'>Quick Access</h2>
							<p className='text-muted-foreground text-lg'>Get a comprehensive overview of all your tasks</p>
						</div>
						<div
							className='group relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/40 hover:border-primary/25 transition-all duration-500 cursor-pointer hover:shadow-2xl hover:shadow-primary/8 hover:scale-[1.01]'
							onClick={() => onSelectBoard(allTasksBoard)}
						>
							<div className='absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/6 opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
							<div className='absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl opacity-60' />

							<div className='relative p-10 flex items-center gap-8'>
								<div className='relative'>
									<div
										className='w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-2xl group-hover:scale-105 transition-transform duration-500'
										style={{ backgroundColor: allTasksBoard.color || '#3B82F6' }}
									>
										{allTasksBoard.icon || '📋'}
									</div>
									<div
										className='absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-25 blur-xl transition-opacity duration-500'
										style={{ backgroundColor: allTasksBoard.color || '#3B82F6' }}
									/>
								</div>
								<div className='flex-1'>
									<h3 className='text-3xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300'>{allTasksBoard.name}</h3>
									<p className='text-muted-foreground text-lg leading-relaxed'>Access and manage all tasks across your boards in one unified view</p>
								</div>
								<div className='text-primary/40 group-hover:text-primary/70 group-hover:translate-x-1 transition-all duration-300'>
									<svg
										className='w-10 h-10'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M9 5l7 7-7 7'
										/>
									</svg>
								</div>
							</div>
						</div>
					</div>
				)}{' '}
				{/* Regular Boards */}
				<div className='space-y-10'>
					<div className='flex items-center justify-between'>
						<div>
							<h2 className='text-2xl font-bold text-foreground mb-3'>Your Boards</h2>
							<p className='text-muted-foreground text-lg'>Manage your projects and organize tasks</p>
						</div>
						{regularBoards.length > 0 && (
							<div className='text-sm text-muted-foreground bg-muted/30 backdrop-blur-sm px-5 py-2.5 rounded-full border border-border/30'>
								{regularBoards.length} {regularBoards.length === 1 ? 'board' : 'boards'}
							</div>
						)}
					</div>

					{regularBoards.length > 0 ? (
						<div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8'>
							{regularBoards.map(board => (
								<div
									key={board.id}
									className='group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card/98 to-card/95 backdrop-blur-sm border border-border/40 hover:border-primary/25 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-2'
									onClick={() => onSelectBoard(board)}
								>
									<div className='absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
									<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-300' />

									<div className='relative p-7'>
										<div className='flex items-start gap-5 mb-6'>
											<div className='relative'>
												<div
													className='w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-105 transition-transform duration-300'
													style={{ backgroundColor: board.color }}
												>
													{board.icon || '📋'}
												</div>
												<div
													className='absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-300'
													style={{ backgroundColor: board.color }}
												/>
											</div>
											<div className='flex-1 min-w-0'>
												<h3 className='text-xl font-bold text-foreground line-clamp-1 mb-2 group-hover:text-primary transition-colors duration-300'>{board.name}</h3>
												{board.description ? <p className='text-muted-foreground text-sm line-clamp-2 leading-relaxed'>{board.description}</p> : <p className='text-muted-foreground/50 text-sm italic'>No description added</p>}
											</div>
										</div>

										<div className='flex items-center justify-between pt-4 border-t border-border/30'>
											<div className='text-xs text-muted-foreground/70 font-medium'>Click to open</div>
											<Button
												variant='ghost'
												size='sm'
												className='h-9 w-9 p-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-accent/60 rounded-xl hover:scale-110'
												onClick={e => {
													e.stopPropagation();
													startEditing(board);
												}}
											>
												<Edit className='h-4 w-4' />
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className='text-center py-32'>
							<div className='relative inline-block mb-10'>
								<div className='w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-muted/40 to-muted/20 flex items-center justify-center border border-border/30 backdrop-blur-sm'>
									<Layers className='h-14 w-14 text-muted-foreground/50' />
								</div>
								<div className='absolute -inset-4 rounded-full bg-gradient-to-br from-primary/8 to-primary/3 opacity-0 animate-pulse' />
							</div>
							<div className='max-w-lg mx-auto space-y-6'>
								<h3 className='text-3xl font-bold text-foreground'>Create your first board</h3>
								<p className='text-muted-foreground text-lg leading-relaxed'>Boards help you organize tasks into different projects or workflows. Each board can have its own theme, categories, and team members.</p>
								<div className='pt-6'>
									<Button
										onClick={() => setIsCreating(true)}
										className='gap-3 px-10 py-4 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 text-base font-medium'
										size='lg'
									>
										<Plus className='h-5 w-5' />
										Create Your First Board
									</Button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
			{/* Create/Edit Board Dialog */}
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
				{' '}
				<DialogContent className='sm:max-w-md'>
					<DialogHeader>
						<DialogTitle>{isEditing ? 'Edit Board' : 'Create New Board'}</DialogTitle>
						<DialogDescription>{isEditing ? 'Make changes to your board settings' : 'Create a new board to organize your tasks'}</DialogDescription>
					</DialogHeader>
					<div className='space-y-6 pt-2'>
						{' '}
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
		</div>
	);
}
