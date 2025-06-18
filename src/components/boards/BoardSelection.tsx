import { Board, Task, UserPreferences} from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
	Plus, Edit, Trash2, Layers, Copy
} from 'lucide-react';
import { BOARD_ICONS, renderIcon } from '@/constants/board-constants';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { GlobalSidebar } from '@/components/ui/global-sidebar';
import { UnifiedHeader } from '@/components/ui/unified-header';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu';



interface BoardSelectionProps {
	boards: Board[];
	tasks?: Task[];
	onSelectBoard: (board: Board) => void;
	onCreateBoard: (board: Omit<Board, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
	onUpdateBoard: (id: number, updates: Partial<Board>) => Promise<void>;
	onDeleteBoard: (id: number) => Promise<void>;
	onDuplicateBoard?: (board: Board) => Promise<void>;
	user?: any;
	onSignOut?: () => Promise<{ error: any }>;
	onOpenSettings?: () => void;
	userPreferences?: UserPreferences | null;
	onUpdateUserPreferences?: (updates: Partial<UserPreferences>) => Promise<void>;
	onTaskClick?: (task: Task) => void;
}

// Tailwind CSS color palette for boards
const BOARD_COLORS = {
	slate: ['#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
	gray: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937'],
	zinc: ['#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a'],
	red: ['#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'],
	orange: ['#fff7ed', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'],
	amber: ['#fffbeb', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'],
	yellow: ['#fefce8', '#fef3c7', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'],
	lime: ['#f7fee7', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#365314', '#1a2e05'],
	green: ['#f0fdf4', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'],
	emerald: ['#ecfdf5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
	teal: ['#f0fdfa', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'],
	cyan: ['#ecfeff', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
	sky: ['#f0f9ff', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'],
	blue: ['#eff6ff', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'],
	indigo: ['#eef2ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],
	violet: ['#f5f3ff', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'],
	purple: ['#faf5ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'],
	fuchsia: ['#fdf4ff', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75', '#581c87'],
	pink: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'],
	rose: ['#fff1f2', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337']
};

// Curated selection of the best colors for boards (medium tones, good contrast)
const PRESET_COLORS = [
	BOARD_COLORS.blue[4],    // #3b82f6
	BOARD_COLORS.green[4],   // #22c55e
	BOARD_COLORS.purple[4],  // #a855f7
	BOARD_COLORS.red[4],     // #ef4444
	BOARD_COLORS.orange[4],  // #f97316
	BOARD_COLORS.yellow[4],  // #eab308
	BOARD_COLORS.pink[4],    // #ec4899
	BOARD_COLORS.cyan[4],    // #06b6d4
	BOARD_COLORS.indigo[4],  // #6366f1
	BOARD_COLORS.emerald[4], // #10b981
	BOARD_COLORS.violet[4],  // #8b5cf6
	BOARD_COLORS.rose[4],    // #f43f5e
	BOARD_COLORS.amber[4],   // #f59e0b
	BOARD_COLORS.lime[4],    // #84cc16
	BOARD_COLORS.teal[4],    // #14b8a6
	BOARD_COLORS.sky[4],     // #0ea5e9
	BOARD_COLORS.fuchsia[4], // #c026d3
	BOARD_COLORS.slate[5],   // #475569
	BOARD_COLORS.gray[5],    // #6b7280
	BOARD_COLORS.zinc[5],    // #71717a
];

type ViewMode = 'grid' | 'compact' | 'list';

// Helper function to determine if a color is light or dark
const isLightColor = (hexColor: string): boolean => {
	// Remove # if present
	const hex = hexColor.replace('#', '');
	
	// Convert to RGB
	const r = parseInt(hex.substr(0, 2), 16);
	const g = parseInt(hex.substr(2, 2), 16);
	const b = parseInt(hex.substr(4, 2), 16);
	
	// Calculate luminance using the standard formula
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	
	// Return true if luminance is greater than 0.5 (light color)
	return luminance > 0.5;
};

// Helper function to get appropriate text color for a background
const getTextColorForBackground = (backgroundColor?: string): string => {
	if (!backgroundColor) return 'text-white'; // Default to white if no color
	return isLightColor(backgroundColor) ? 'text-gray-800' : 'text-white';
};

export function BoardSelection({ boards, tasks, onSelectBoard, onCreateBoard, onUpdateBoard, onDeleteBoard, onDuplicateBoard, user, onSignOut, onOpenSettings, userPreferences, onUpdateUserPreferences }: BoardSelectionProps) {
	const [isCreating, setIsCreating] = useState(false);
	const [isEditing, setIsEditing] = useState<Board | null>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>('compact');
	const [newBoard, setNewBoard] = useState({
		name: '',
		description: '',
		color: PRESET_COLORS[0],
		icon: 'Briefcase',
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
		setNewBoard({ name: '', description: '', color: PRESET_COLORS[0], icon: 'Briefcase' });
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
		setNewBoard({ name: '', description: '', color: PRESET_COLORS[0], icon: 'Briefcase' });
		} catch (error) {
			console.error('Failed to update board:', error);
		}
	};

	const startEditing = (board: Board) => {
		setIsEditing(board);
		setNewBoard({
			name: board.name,
			description: board.description || '',
			color: board.color || PRESET_COLORS[0],
			icon: board.icon || 'Briefcase',
		});
	};

	const handleDuplicateBoard = async (board: Board) => {
		if (!onDuplicateBoard) return;
		try {
			await onDuplicateBoard(board);
		} catch (error) {
			console.error('Failed to duplicate board:', error);
		}
	};

	const allBoards = boards; // Display all boards including the "All Tasks" board
	const regularBoards = boards.filter(board => !board.isDefault); // Keep for count in header

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
					<ContextMenu key={board.id}>
						<ContextMenuTrigger asChild>
							<div
								className={cn(baseClasses, 'p-6 h-32')}
								onClick={() => onSelectBoard(board)}
							>
								<div className='flex items-start gap-4 h-full'>
									<div
										className={cn('w-12 h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0', getTextColorForBackground(board.color))}
										style={{ backgroundColor: board.color }}
									>
										{renderIcon(board.icon || 'Briefcase', 'h-6 w-6')}
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
								{!board.isDefault && (
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
								)}
							</div>
						</ContextMenuTrigger>
						<ContextMenuContent className='w-48'>
							<ContextMenuItem onClick={() => onSelectBoard(board)}>
								<Layers className='mr-2 h-4 w-4' />
								Open Board
							</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem onClick={() => startEditing(board)}>
								<Edit className='mr-2 h-4 w-4' />
								Edit Board
							</ContextMenuItem>
							{onDuplicateBoard && (
								<ContextMenuItem onClick={() => handleDuplicateBoard(board)}>
									<Copy className='mr-2 h-4 w-4' />
									Duplicate Board
								</ContextMenuItem>
							)}
							{!board.isDefault && (
								<>
									<ContextMenuSeparator />
									<ContextMenuItem 
										onClick={() => {
											setIsEditing(board);
											setShowDeleteConfirm(true);
										}}
										className='text-destructive'
									>
										<Trash2 className='mr-2 h-4 w-4' />
										Delete Board
									</ContextMenuItem>
								</>
							)}
						</ContextMenuContent>
					</ContextMenu>
				);

			case 'compact':
				return (
					<ContextMenu key={board.id}>
						<ContextMenuTrigger asChild>
							<div
								className={cn(baseClasses, 'p-4 aspect-square flex flex-col items-center justify-center text-center')}
								onClick={() => onSelectBoard(board)}
							>
								<div
									className={cn('w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-sm mb-3', getTextColorForBackground(board.color))}
									style={{ backgroundColor: board.color }}
								>
									{renderIcon(board.icon || 'Briefcase', 'h-5 w-5 sm:h-6 sm:w-6')}
								</div>
								<h3 className='text-sm sm:text-base font-semibold text-foreground mb-1 truncate w-full px-1'>{board.name}</h3>
								{board.description && (
									<p className='text-xs text-muted-foreground line-clamp-2 hidden sm:block'>{board.description}</p>
								)}
								{!board.isDefault && (
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
								)}
							</div>
						</ContextMenuTrigger>
						<ContextMenuContent className='w-48'>
							<ContextMenuItem onClick={() => onSelectBoard(board)}>
								<Layers className='mr-2 h-4 w-4' />
								Open Board
							</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem onClick={() => startEditing(board)}>
								<Edit className='mr-2 h-4 w-4' />
								Edit Board
							</ContextMenuItem>
							{onDuplicateBoard && (
								<ContextMenuItem onClick={() => handleDuplicateBoard(board)}>
									<Copy className='mr-2 h-4 w-4' />
									Duplicate Board
								</ContextMenuItem>
							)}
							{!board.isDefault && (
								<>
									<ContextMenuSeparator />
									<ContextMenuItem 
										onClick={() => {
											setIsEditing(board);
											setShowDeleteConfirm(true);
										}}
										className='text-destructive'
									>
										<Trash2 className='mr-2 h-4 w-4' />
										Delete Board
									</ContextMenuItem>
								</>
							)}
						</ContextMenuContent>
					</ContextMenu>
				);

			case 'list':
				return (
					<ContextMenu key={board.id}>
						<ContextMenuTrigger asChild>
							<div
								className={cn(baseClasses, 'p-4 flex items-center gap-4')}
								onClick={() => onSelectBoard(board)}
							>
								<div
									className={cn('w-10 h-10 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0', getTextColorForBackground(board.color))}
									style={{ backgroundColor: board.color }}
								>
									{renderIcon(board.icon || 'Briefcase', 'h-5 w-5')}
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
								{!board.isDefault && (
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
								)}
							</div>
						</ContextMenuTrigger>
						<ContextMenuContent className='w-48'>
							<ContextMenuItem onClick={() => onSelectBoard(board)}>
								<Layers className='mr-2 h-4 w-4' />
								Open Board
							</ContextMenuItem>
							<ContextMenuSeparator />
							<ContextMenuItem onClick={() => startEditing(board)}>
								<Edit className='mr-2 h-4 w-4' />
								Edit Board
							</ContextMenuItem>
							{onDuplicateBoard && (
								<ContextMenuItem onClick={() => handleDuplicateBoard(board)}>
									<Copy className='mr-2 h-4 w-4' />
									Duplicate Board
								</ContextMenuItem>
							)}
							{!board.isDefault && (
								<>
									<ContextMenuSeparator />
									<ContextMenuItem 
										onClick={() => {
											setIsEditing(board);
											setShowDeleteConfirm(true);
										}}
										className='text-destructive'
									>
										<Trash2 className='mr-2 h-4 w-4' />
										Delete Board
									</ContextMenuItem>
								</>
							)}
						</ContextMenuContent>
					</ContextMenu>
				);

			default:
				return null;
		}
	};

	const renderCreateBoardCard = () => {
		const baseClasses = 'bg-card border-2 border-dashed border-muted-foreground/30 rounded-xl hover:border-primary/50 hover:bg-accent/30 transition-all duration-300 cursor-pointer group relative overflow-hidden';
		
		switch (viewMode) {
			case 'grid':
				return (
					<div
						key="create-new"
						className={cn(baseClasses, 'p-6 h-32')}
						onClick={() => setIsCreating(true)}
					>
						<div className='flex items-start gap-4 h-full'>
							<div className='w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center shadow-sm flex-shrink-0 group-hover:bg-primary/10 transition-colors'>
								<Plus className='h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors' />
							</div>
							<div className='flex-1 min-w-0 flex flex-col justify-between h-full'>
								<div>
									<h3 className='text-lg font-semibold text-muted-foreground group-hover:text-foreground mb-1 truncate transition-colors'>Create New Board</h3>
									<p className='text-sm text-muted-foreground/70 line-clamp-2'>Add a new project board</p>
								</div>
								<div className='flex items-center text-xs text-muted-foreground mt-2'>
									<span>New Board • Click to create</span>
								</div>
							</div>
						</div>
					</div>
				);

			case 'compact':
				return (
					<div
						key="create-new"
						className={cn(baseClasses, 'p-4 aspect-square flex flex-col items-center justify-center text-center')}
						onClick={() => setIsCreating(true)}
					>
						<div className='w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted/50 flex items-center justify-center text-lg sm:text-xl mb-3 group-hover:bg-primary/10 transition-colors'>
							<Plus className='h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-hover:text-primary transition-colors' />
						</div>
						<h3 className='text-sm sm:text-base font-semibold text-muted-foreground group-hover:text-foreground transition-colors truncate w-full px-1'>Create New Board</h3>
						<p className='text-xs text-muted-foreground/70 hidden sm:block mt-1'>Add project</p>
					</div>
				);

			case 'list':
				return (
					<div
						key="create-new"
						className={cn(baseClasses, 'p-4 flex items-center gap-4')}
						onClick={() => setIsCreating(true)}
					>
						<div className='w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-lg flex-shrink-0 group-hover:bg-primary/10 transition-colors'>
							<Plus className='h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors' />
						</div>
						<div className='flex-1 min-w-0'>
							<h3 className='text-base font-semibold text-muted-foreground group-hover:text-foreground transition-colors'>Create New Board</h3>
							<p className='text-sm text-muted-foreground/70'>Add a new project board to organize your tasks</p>
						</div>
						<div className='flex items-center gap-2 text-xs text-muted-foreground'>
							<span className='hidden sm:inline'>New Board</span>
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
				<GlobalSidebar
					boards={boards}
					tasks={tasks}
					onSelectBoard={onSelectBoard}
					onSelectBoardView={(board: Board) => {
						// Navigate to the board with specific view (this would need to be implemented in parent component)
						onSelectBoard(board);
					}}
					onCreateBoard={() => setIsCreating(true)}
					onEditBoard={startEditing}
					onCreateTask={(board: Board) => {
						// For now, just navigate to the board - task creation could be enhanced later
						onSelectBoard(board);
					}}
					onTaskClick={(task: Task) => {
						// For board selection, navigate to the task's board
						const taskBoard = boards.find(b => b.id === task.boardId);
						if (taskBoard) {
							onSelectBoard(taskBoard);
						}
					}}
				/>
				<SidebarInset>
					<UnifiedHeader
						title="Your Boards"
						subtitle="Organize your projects and workflows"
						viewMode={viewMode}
						boardCount={regularBoards.length}
						onViewModeChange={handleViewModeChange}
						user={user}
						onSignOut={onSignOut}
						onOpenSettings={onOpenSettings}
					/>
					<div className='flex-1 p-4 sm:p-6 bg-muted/30'>
						{boards.length > 0 ? (
							<div className={getGridClasses()}>
								{allBoards.map(renderBoardCard)}
								{renderCreateBoardCard()}
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
					</div>
				</SidebarInset>
			</div>

			<Dialog
				open={isCreating || !!isEditing}
				onOpenChange={open => {
					if (!open) {
						setIsCreating(false);
						setIsEditing(null);
						setShowDeleteConfirm(false);
						setShowColorPicker(false);
						setNewBoard({ name: '', description: '', color: PRESET_COLORS[0], icon: 'Briefcase' });
					}
				}}
			>
				<DialogContent className='sm:max-w-lg max-h-[90vh] overflow-hidden'>
					<div className='p-6'>
						{showDeleteConfirm ? (
							// Delete Confirmation Screen
							<div className='space-y-6'>
								<div className='text-center'>
									<div className='w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-4'>
										<Trash2 className='h-6 w-6 text-destructive' />
									</div>
									<h2 className='text-lg font-semibold mb-2'>Delete Board</h2>
									<p className='text-sm text-muted-foreground mb-4'>
										Are you sure you want to delete "<strong>{isEditing?.name}</strong>"? This action cannot be undone.
									</p>
								</div>
								
								<div className='flex gap-2'>
									<Button
										variant="outline"
										onClick={() => setShowDeleteConfirm(false)}
										className='flex-1'
									>
										Cancel
									</Button>
									<Button
										variant='destructive'
										onClick={async () => {
											if (isEditing) {
												await onDeleteBoard(isEditing.id);
												setIsEditing(null);
												setShowDeleteConfirm(false);
											}
										}}
										className='flex-1'
									>
										Delete Board
									</Button>
								</div>
							</div>
						) : showColorPicker ? (
							// Color Picker Screen
							<div className='space-y-6'>
								<div className='flex items-center gap-3'>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setShowColorPicker(false)}
										className='p-2'
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
										</svg>
									</Button>
									<h2 className='text-lg font-semibold'>Choose Color</h2>
								</div>

								{/* Preview */}
								<div className='flex items-center justify-center p-6 bg-muted/30 rounded-lg'>
									<div className='flex items-center gap-3'>
										<div
											className={cn('w-16 h-16 rounded-xl flex items-center justify-center shadow-lg border-2 border-background', getTextColorForBackground(newBoard.color))}
											style={{ backgroundColor: newBoard.color }}
										>
											{renderIcon(newBoard.icon, 'h-8 w-8')}
										</div>
										<div>
											<h3 className='font-semibold'>{newBoard.name || 'Board Name'}</h3>
											<p className='text-sm text-muted-foreground'>Preview</p>
										</div>
									</div>
								</div>

								{/* Quick Preset Colors */}
								<div className='space-y-4'>
									<h3 className='text-sm font-medium text-muted-foreground'>Popular Colors</h3>
									<div className='grid grid-cols-5 gap-3'>
										{PRESET_COLORS.slice(0, 10).map((color: string) => (
											<button
												title={`Select color ${color}`}
												key={color}
												type='button'
												className={cn(
													'w-full h-12 rounded-lg border-2 transition-all hover:scale-105 relative',
													newBoard.color === color 
														? 'border-foreground ring-2 ring-primary/30' 
														: 'border-border hover:border-muted-foreground'
												)}
												style={{ backgroundColor: color }}
												onClick={() => setNewBoard({ ...newBoard, color })}
											>
												{newBoard.color === color && (
													<div className='absolute inset-0 flex items-center justify-center'>
														<svg className={cn("w-5 h-5 drop-shadow-lg", getTextColorForBackground(color))} fill="currentColor" viewBox="0 0 20 20">
															<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
														</svg>
													</div>
												)}
											</button>
										))}
									</div>
								</div>

								{/* Color Categories */}
								<div className='space-y-4 max-h-64 overflow-y-auto'>
									<h3 className='text-sm font-medium text-muted-foreground'>All Colors</h3>
									{Object.entries(BOARD_COLORS).map(([colorName, colorShades]) => (
										<div key={colorName} className='space-y-2'>
											<h4 className='text-xs font-medium text-muted-foreground capitalize'>{colorName}</h4>
											<div className='grid grid-cols-9 gap-1'>
												{colorShades.map((shade: string, index: number) => (
													<button
														key={`${colorName}-${index}`}
														title={`${colorName} ${index + 1}`}
														type='button'
														className={cn(
															'w-8 h-8 rounded border transition-all hover:scale-110 relative',
															newBoard.color === shade 
																? 'border-foreground ring-1 ring-primary/30' 
																: 'border-border/50 hover:border-muted-foreground'
														)}
														style={{ backgroundColor: shade }}
														onClick={() => setNewBoard({ ...newBoard, color: shade })}
													>
														{newBoard.color === shade && (
															<div className='absolute inset-0 flex items-center justify-center'>
																<svg className={cn("w-3 h-3 drop-shadow-lg", getTextColorForBackground(shade))} fill="currentColor" viewBox="0 0 20 20">
																	<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
																</svg>
															</div>
														)}
													</button>
												))}
											</div>
										</div>
									))}
								</div>

								{/* Custom Color Input */}
								<div className='space-y-3'>
									<h3 className='text-sm font-medium text-muted-foreground'>Custom Hex Color</h3>
									<Input
										value={newBoard.color}
										onChange={(e) => setNewBoard({ ...newBoard, color: e.target.value })}
										placeholder='#000000'
										className='font-mono text-sm'
									/>
								</div>

								{/* Actions */}
								<div className='flex gap-2 pt-2'>
									<Button
										variant="outline"
										onClick={() => setShowColorPicker(false)}
										className='flex-1'
									>
										Cancel
									</Button>
									<Button
										onClick={() => setShowColorPicker(false)}
										className='flex-1'
									>
										Select Color
									</Button>
								</div>
							</div>
						) : (
							// Create/Edit Board Screen
							<div className='space-y-6'>
								<h2 className='text-lg font-semibold'>
									{isEditing ? 'Edit Board' : 'Create Board'}
								</h2>
								
								{/* Basic Information */}
								<div className='space-y-4'>
									<div className='space-y-2'>
										<Input
											placeholder='Board name'
											value={newBoard.name}
											onChange={e => setNewBoard({ ...newBoard, name: e.target.value })}
											onKeyDown={(e) => {
												if (e.key === 'Enter' && newBoard.name.trim()) {
													e.preventDefault();
													isEditing ? handleUpdateBoard() : handleCreateBoard();
												}
											}}
											className='text-base'
										/>
									</div>

									<div className='space-y-2'>
										<Textarea
											placeholder='Description (optional)'
											value={newBoard.description}
											onChange={e => setNewBoard({ ...newBoard, description: e.target.value })}
											rows={2}
											className='resize-none text-sm'
										/>
									</div>
								</div>

								{/* Appearance */}
								<div className='space-y-4'>
									<div className='flex items-center justify-between'>
										<span className='text-sm font-medium text-muted-foreground'>Appearance</span>
									</div>
									
									{/* Color */}
									<div className='space-y-3'>
										<label className='text-sm font-medium text-muted-foreground'>Color</label>
										<Button
											variant="outline"
											onClick={() => setShowColorPicker(true)}
											className='w-full h-12 justify-start gap-3'
											type="button"
										>
											<div
												className='w-6 h-6 rounded-lg border border-background shadow-sm'
												style={{ backgroundColor: newBoard.color }}
											/>
											<span className='text-sm'>Choose Color</span>
											<div className='ml-auto text-xs font-mono text-muted-foreground'>
												{newBoard.color.toUpperCase()}
											</div>
										</Button>
									</div>

									{/* Icon */}
									<div className='space-y-3'>
										<label className='text-sm font-medium text-muted-foreground'>Icon</label>
										<div className='flex items-center gap-2'>
											<div className='w-10 h-10 rounded border border-border flex items-center justify-center bg-muted/30'>
												{renderIcon(newBoard.icon, 'h-5 w-5')}
											</div>
											<Input
												placeholder='Icon name (e.g., Briefcase)'
												value={newBoard.icon}
												onChange={e => setNewBoard({ ...newBoard, icon: e.target.value })}
												className='flex-1'
											/>
										</div>
										<div className='grid grid-cols-8 gap-1 max-h-32 overflow-y-auto'>
											{BOARD_ICONS.map(iconData => (
												<button
													key={iconData.name}
													type='button'
													className={cn('w-8 h-8 rounded border transition-all flex items-center justify-center hover:bg-accent', newBoard.icon === iconData.name ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground')}
													onClick={() => setNewBoard({ ...newBoard, icon: iconData.name })}
													title={`Select icon ${iconData.name}`}
												>
													{renderIcon(iconData.name, 'h-4 w-4')}
												</button>
											))}
										</div>
									</div>
								</div>

								{/* Actions */}
								<div className='flex gap-2 pt-2'>
									<Button
										variant="outline"
										onClick={() => {
											setIsCreating(false);
											setIsEditing(null);
										}}
										className='flex-1'
									>
										Cancel
									</Button>
									<Button
										onClick={isEditing ? handleUpdateBoard : handleCreateBoard}
										disabled={!newBoard.name.trim()}
										className='flex-1'
									>
										{isEditing ? 'Save' : 'Create'}
									</Button>
									{isEditing && !isEditing.isDefault && (
										<Button
											variant='destructive'
											size='sm'
											onClick={() => setShowDeleteConfirm(true)}
											className='px-3'
										>
											<Trash2 className='h-4 w-4' />
										</Button>
									)}
								</div>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</SidebarProvider>
	);
}
