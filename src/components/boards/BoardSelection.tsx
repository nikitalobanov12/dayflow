import { Board } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Layers } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface BoardSelectionProps {
	boards: Board[];
	onSelectBoard: (board: Board) => void;
	onCreateBoard: (board: Omit<Board, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
	onUpdateBoard: (id: number, updates: Partial<Board>) => Promise<void>;
	onDeleteBoard: (id: number) => Promise<void>;
}

const BOARD_COLORS = [
	'#3B82F6', // Blue
	'#10B981', // Green
	'#F59E0B', // Yellow
	'#EF4444', // Red
	'#8B5CF6', // Purple
	'#06B6D4', // Cyan
	'#F97316', // Orange
	'#84CC16', // Lime
	'#EC4899', // Pink
	'#6B7280', // Gray
];

const BOARD_ICONS = ['📋', '📊', '📅', '📝', '💼', '🎯', '📈', '🚀', '⭐', '🔥', '💡', '🎨', '⚡', '🌟', '🏆', '📌', '🎪', '🎭', '🎵', '🎮', '🌈', '🦄', '🍕', '☕', '🌱', '🔮', '🎊', '🎉', '💎', '🗂️'];

export function BoardSelection({ boards, onSelectBoard, onCreateBoard, onUpdateBoard, onDeleteBoard }: BoardSelectionProps) {
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
		<div className='h-screen bg-background flex flex-col'>
			<div className='p-6 border-b border-border pt-8 pb-4 bg-card'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-3'>
						<div className='p-2 rounded-lg bg-primary/10'>
							<Layers className='h-6 w-6 text-primary' />
						</div>
						<div>
							<h1 className='text-2xl font-bold text-foreground'>My Boards</h1>
							<p className='text-sm text-muted-foreground'>Organize your tasks across multiple boards</p>
						</div>
					</div>
					<Button
						onClick={() => setIsCreating(true)}
						className='gap-2'
					>
						<Plus className='h-4 w-4' />
						New Board
					</Button>
				</div>
			</div>

			<div className='flex-1 p-6 overflow-y-auto'>
				<div className='max-w-6xl mx-auto'>
					{/* All Tasks Board */}
					{allTasksBoard && (
						<div className='mb-8'>
							<h2 className='text-lg font-semibold mb-4 text-foreground'>Overview</h2>{' '}
							<Card
								className='p-6 cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10'
								onClick={() => onSelectBoard(allTasksBoard)}
							>
								<div className='flex items-center gap-4'>
									<div className='p-3 rounded-lg bg-primary/20 text-2xl'>{allTasksBoard.icon || '📋'}</div>
									<div className='flex-1'>
										<h3 className='text-xl font-bold text-foreground'>{allTasksBoard.name}</h3>
										<p className='text-muted-foreground'>View all tasks across all boards</p>
									</div>
								</div>
							</Card>
						</div>
					)}

					{/* Regular Boards */}
					<div className='space-y-6'>
						<h2 className='text-lg font-semibold text-foreground'>Your Boards</h2>
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
							{regularBoards.map(board => (
								<Card
									key={board.id}
									className='group relative p-6 cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20'
									style={{ borderTopColor: board.color }}
									onClick={() => onSelectBoard(board)}
								>
									<div className='absolute top-4 right-4'>
										<Button
											variant='ghost'
											size='sm'
											className='h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
											onClick={e => {
												e.stopPropagation();
												startEditing(board);
											}}
										>
											<Edit className='h-4 w-4' />
										</Button>
									</div>{' '}
									<div className='space-y-4'>
										<div className='flex items-center gap-3'>
											<div
												className='w-12 h-12 rounded-lg shadow-sm flex items-center justify-center text-2xl'
												style={{ backgroundColor: board.color }}
											>
												{board.icon || '📋'}
											</div>
											<div className='flex-1 min-w-0'>
												<h3 className='text-lg font-semibold text-foreground line-clamp-1'>{board.name}</h3>
												{board.description && <p className='text-sm text-muted-foreground line-clamp-2'>{board.description}</p>}
											</div>
										</div>
									</div>
								</Card>
							))}
						</div>
					</div>

					{regularBoards.length === 0 && (
						<div className='text-center py-12'>
							<div className='p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center'>
								<Layers className='h-8 w-8 text-muted-foreground' />
							</div>
							<h3 className='text-lg font-semibold text-foreground mb-2'>No boards yet</h3>
							<p className='text-muted-foreground mb-4'>Create your first board to get started organizing your tasks</p>
							<Button
								onClick={() => setIsCreating(true)}
								className='gap-2'
							>
								<Plus className='h-4 w-4' />
								Create Board
							</Button>
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
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{isEditing ? 'Edit Board' : 'Create New Board'}</DialogTitle>
						<DialogDescription>{isEditing ? 'Make changes to your board settings' : 'Create a new board to organize your tasks'}</DialogDescription>
					</DialogHeader>
					<div className='space-y-4'>
						<div>
							<label className='text-sm font-medium text-foreground mb-2 block'>Board Name</label>
							<Input
								placeholder='Enter board name'
								value={newBoard.name}
								onChange={e => setNewBoard({ ...newBoard, name: e.target.value })}
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-foreground mb-2 block'>Description (optional)</label>
							<Textarea
								placeholder='Describe what this board is for'
								value={newBoard.description}
								onChange={e => setNewBoard({ ...newBoard, description: e.target.value })}
								rows={3}
							/>{' '}
						</div>
						<div>
							<label className='text-sm font-medium text-foreground mb-2 block'>Color</label>
							<div className='grid grid-cols-5 gap-3'>
								{BOARD_COLORS.map(color => (
									<button
										key={color}
										type='button'
										className={cn('w-10 h-10 rounded-lg border-2 transition-all', newBoard.color === color ? 'border-foreground scale-110' : 'border-border hover:border-muted-foreground')}
										style={{ backgroundColor: color }}
										onClick={() => setNewBoard({ ...newBoard, color })}
									/>
								))}
							</div>
						</div>
						<div>
							<label className='text-sm font-medium text-foreground mb-2 block'>Icon</label>
							<div className='space-y-3'>
								<div className='grid grid-cols-10 gap-2'>
									{BOARD_ICONS.map(icon => (
										<button
											key={icon}
											type='button'
											className={cn('w-8 h-8 rounded-md border-2 transition-all flex items-center justify-center text-lg hover:scale-110', newBoard.icon === icon ? 'border-foreground bg-accent' : 'border-border hover:border-muted-foreground hover:bg-accent/50')}
											onClick={() => setNewBoard({ ...newBoard, icon })}
										>
											{icon}
										</button>
									))}
								</div>
								<div className='flex items-center gap-2'>
									<Input
										placeholder='Or enter custom emoji/text'
										value={newBoard.icon}
										onChange={e => setNewBoard({ ...newBoard, icon: e.target.value })}
										className='flex-1'
										maxLength={4}
									/>
									<div
										className='w-10 h-10 rounded-lg border-2 border-border flex items-center justify-center text-lg'
										style={{ backgroundColor: newBoard.color }}
									>
										{newBoard.icon}
									</div>
								</div>
							</div>
						</div>
						<div className='flex gap-2 pt-4'>
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
									onClick={async () => {
										if (confirm('Are you sure you want to delete this board? All tasks will be moved to the default board.')) {
											await onDeleteBoard(isEditing.id);
											setIsEditing(null);
										}
									}}
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
