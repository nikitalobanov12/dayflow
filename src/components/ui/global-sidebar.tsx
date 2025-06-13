
import { Plus, Edit } from 'lucide-react';
import { Board } from '@/types';
import { renderIcon } from '@/constants/board-constants';
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
	SidebarRail,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/ui/logo';

interface GlobalSidebarProps {
	boards: Board[];
	currentBoard?: Board | null;
	onSelectBoard: (board: Board) => void;
	onCreateBoard?: () => void;
	onEditBoard?: (board: Board) => void;
}

export function GlobalSidebar({ 
	boards, 
	currentBoard, 
	onSelectBoard, 
	onCreateBoard, 
	onEditBoard 
}: GlobalSidebarProps) {
	const regularBoards = boards.filter(board => !board.isDefault);
	const allTasksBoard = boards.find(board => board.isDefault);

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
			</SidebarHeader>

			<SidebarContent>
				{/* Quick Actions */}
				{onCreateBoard && (
					<SidebarGroup>
						<SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton
										onClick={onCreateBoard}
										className='gap-2'
									>
										<Plus className='h-4 w-4' />
										<span>New Board</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				)}

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
										isActive={currentBoard?.id === allTasksBoard.id}
									>
										<div
											className='w-4 h-4 rounded flex items-center justify-center text-white'
											style={{ backgroundColor: allTasksBoard.color || '#3B82F6' }}
										>
											{renderIcon(allTasksBoard.icon || 'Briefcase', 'h-3 w-3')}
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
											isActive={currentBoard?.id === board.id}
										>
											<div
												className='w-4 h-4 rounded flex items-center justify-center text-white'
												style={{ backgroundColor: board.color }}
											>
												{renderIcon(board.icon || 'Briefcase', 'h-3 w-3')}
											</div>
											<span className='flex-1 truncate'>{board.name}</span>
											{onEditBoard && (
												<button
													title='Edit board'
													onClick={e => {
														e.stopPropagation();
														onEditBoard(board);
													}}
													className='opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded'
												>
													<Edit className='h-3 w-3' />
												</button>
											)}
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
	);
} 