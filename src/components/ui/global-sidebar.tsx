import { Plus, Edit, ChevronRight, Calendar, List, Kanban, Layers, CalendarDays, ListChecks, Layout } from 'lucide-react';
import { Board, BoardViewType, Task, UserPreferences, Profile } from '@/types';
import { AISchedulerButton } from '@/components/ai/AISchedulerButton';
import { renderIcon } from '@/constants/board-constants';
import { UpcomingTaskPreview } from '@/components/ui/upcoming-task-preview';
import { getNextUpcomingTask } from '@/utils/taskUtils';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface GlobalSidebarProps {
	boards: Board[];
	currentBoard?: Board | null;
	currentView?: BoardViewType;
	tasks?: Task[];
	userPreferences?: UserPreferences;
	userProfile: Profile | null;
	onSelectBoard: (board: Board) => void;
	onSelectBoardView?: (board: Board, view: BoardViewType) => void;
	onCreateBoard?: () => void;
	onEditBoard?: (board: Board) => void;
	onCreateTask?: (board: Board) => void;
	onNavigateToBoards?: () => void;
	onTaskClick?: (task: Task) => void;
}

// Helper function to get view icon
const getViewIcon = (view: BoardViewType) => {
	switch (view) {
		case 'kanban':
			return Kanban;
		case 'calendar':
			return Calendar;
		case 'list':
			return List;
		default:
			return List;
	}
};

// Helper function to get view label
const getViewLabel = (view: BoardViewType) => {
	switch (view) {
		case 'kanban':
			return 'Kanban Board';
		case 'calendar':
			return 'Calendar View';
		case 'list':
			return 'List View';
		default:
			return 'List View';
	}
};

export function GlobalSidebar({ 
	boards, 
	currentBoard, 
	currentView,
	tasks,
	userPreferences,
	userProfile,
	onSelectBoard, 
	onSelectBoardView,
	onCreateBoard, 
	onEditBoard,
	onCreateTask,
	onNavigateToBoards,
	onTaskClick
}: GlobalSidebarProps) {
	const [expandedBoards, setExpandedBoards] = useState<Set<number>>(new Set());
	const regularBoards = boards.filter(board => !board.isDefault);
	const allTasksBoard = boards.find(board => board.isDefault);
	const upcomingTask = tasks ? getNextUpcomingTask(tasks) : null;

	const toggleBoardExpansion = (boardId: number) => {
		setExpandedBoards(prev => {
			const newSet = new Set(prev);
			if (newSet.has(boardId)) {
				newSet.delete(boardId);
			} else {
				newSet.add(boardId);
			}
			return newSet;
		});
	};

	const handleBoardClick = (board: Board) => {
		onSelectBoard(board);
	};

	const handleViewSelect = (board: Board, view: BoardViewType) => {
		if (onSelectBoardView) {
			onSelectBoardView(board, view);
		} else {
			onSelectBoard(board);
		}
	};

	const handleQuickNavigation = (view: BoardViewType) => {
		if (allTasksBoard && onSelectBoardView) {
			onSelectBoardView(allTasksBoard, view);
		}
	};

	const renderViewSubmenu = (board: Board) => {
		const views: BoardViewType[] = ['kanban', 'list', 'calendar'];
		
		return (
			<SidebarMenuSub>
				{views.map(view => {
					const ViewIcon = getViewIcon(view);
					const isCurrentView = currentBoard?.id === board.id && currentView === view;
					
					return (
						<SidebarMenuSubItem key={view}>
							<SidebarMenuSubButton
								onClick={() => handleViewSelect(board, view)}
								className={cn(
									'gap-2',
									isCurrentView && 'bg-accent text-accent-foreground'
								)}
							>
								<ViewIcon className='h-3 w-3' />
								<span>{getViewLabel(view)}</span>
							</SidebarMenuSubButton>
						</SidebarMenuSubItem>
					);
				})}
				
				{/* Separator */}
				<SidebarMenuSubItem>
					<div className='px-2 py-1'>
						<div className='h-px bg-border'></div>
					</div>
				</SidebarMenuSubItem>
				
				{/* Quick Actions */}
				{onCreateTask && (
					<SidebarMenuSubItem>
						<SidebarMenuSubButton
							onClick={() => onCreateTask(board)}
							className='gap-2 text-muted-foreground hover:text-foreground'
						>
							<Plus className='h-3 w-3' />
							<span>New Task</span>
						</SidebarMenuSubButton>
					</SidebarMenuSubItem>
				)}
				
				{onEditBoard && (
					<SidebarMenuSubItem>
						<SidebarMenuSubButton
							onClick={() => onEditBoard(board)}
							className='gap-2 text-muted-foreground hover:text-foreground'
						>
							<Edit className='h-3 w-3' />
							<span>Edit Board</span>
						</SidebarMenuSubButton>
					</SidebarMenuSubItem>
				)}
			</SidebarMenuSub>
		);
	};

	const renderBoardItem = (board: Board, isAllTasks = false) => {
		const isActive = currentBoard?.id === board.id;
		const isExpanded = expandedBoards.has(board.id);
		
		return (
			<SidebarMenuItem key={board.id}>
				<div className='flex items-center w-full group'>
					<SidebarMenuButton
						onClick={() => handleBoardClick(board)}
						className={cn(
							'gap-2 flex-1 justify-start',
							isActive && !isExpanded && 'bg-accent text-accent-foreground'
						)}
						isActive={isActive && !isExpanded}
					>
						<div
							className='w-4 h-4 rounded flex items-center justify-center text-white flex-shrink-0'
							style={{ backgroundColor: board.color || '#3B82F6' }}
						>
							{renderIcon(board.icon || 'Briefcase', 'h-3 w-3')}
						</div>
						<span className='flex-1 truncate'>{board.name}</span>
					</SidebarMenuButton>
					
					{!isAllTasks && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								toggleBoardExpansion(board.id);
							}}
							className={cn(
								'p-1 hover:bg-accent rounded transition-all duration-200 flex-shrink-0 ml-1',
								'opacity-70 hover:opacity-100'
							)}
							title={isExpanded ? 'Collapse menu' : 'Expand menu'}
						>
							<ChevronRight className={cn(
								'h-3 w-3 transition-transform duration-200',
								isExpanded && 'rotate-90'
							)} />
						</button>
					)}
				</div>
				{!isAllTasks && isExpanded && renderViewSubmenu(board)}
			</SidebarMenuItem>
		);
	};

	return (
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
				
				{/* Upcoming Task Preview */}
				{upcomingTask && (
					<div className='px-2 py-3 border-t border-border/50'>
						<div className='text-xs font-medium text-muted-foreground mb-2'>Next Up</div>
						<UpcomingTaskPreview 
							task={upcomingTask} 
							onClick={onTaskClick}
							className='w-full'
						/>
					</div>
				)}
			</SidebarHeader>

			<SidebarContent>
				{/* Quick Actions */}
				<SidebarGroup>
					<SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{allTasksBoard && (
								<>
									<SidebarMenuItem>
										<SidebarMenuButton
											onClick={() => handleQuickNavigation('calendar')}
											className='gap-2'
										>
											<CalendarDays className='h-4 w-4' />
											<span>My Calendar</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											onClick={() => handleQuickNavigation('list')}
											className='gap-2'
										>
											<ListChecks className='h-4 w-4' />
											<span>My Tasks</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
									<SidebarMenuItem>
										<SidebarMenuButton
											onClick={() => handleQuickNavigation('kanban')}
											className='gap-2'
										>
											<Layout className='h-4 w-4' />
											<span>Agenda</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</>
							)}
							{/* AI Scheduler Button */}
							{tasks && userPreferences && (
								<SidebarMenuItem>
									<div className='p-1'>
										<AISchedulerButton
											tasks={tasks}
											boards={boards}
											userPreferences={userPreferences}
											userProfile={userProfile}
											variant='outline'
											size='sm'
											showDropdown={false}
											className='w-full justify-start'
										/>
									</div>
								</SidebarMenuItem>
							)}
							{onNavigateToBoards && (
								<SidebarMenuItem>
									<SidebarMenuButton
										onClick={onNavigateToBoards}
										className='gap-2'
									>
										<Layers className='h-4 w-4' />
										<span>View All Boards</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							)}
							{onCreateBoard && (
								<SidebarMenuItem>
									<SidebarMenuButton
										onClick={onCreateBoard}
										className='gap-2'
									>
										<Plus className='h-4 w-4' />
										<span>New Board</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							)}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{/* All Tasks Board */}
				{allTasksBoard && (
					<SidebarGroup>
						<SidebarGroupLabel>Quick Access</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{renderBoardItem(allTasksBoard, true)}
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
								{regularBoards.map(board => renderBoardItem(board))}
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
	);
} 