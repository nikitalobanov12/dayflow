import { useState } from 'react';
import { CustomTitlebar } from './components/ui/custom-titlebar';
import { BoardSelection } from '@/components/boards/BoardSelection';
import { KanbanBoardView } from '@/components/boards/KanbanBoardView';
import { SprintMode } from './components/sprint/SprintMode';
import { SprintConfig, SprintConfiguration } from '@/components/sprint/SprintConfig';
import { Auth } from '@/components/ui/auth';

import { useSupabaseDatabase } from '@/hooks/useSupabaseDatabase';
import { Board, Task } from '@/types';
import './App.css';

function App() {
	const { tasks, boards, addTask, deleteTask, duplicateTask, moveTask, updateTask, reorderTasksInColumn, addBoard, updateBoard, deleteBoard, loadTasks, isLoading, user, signOut, signUp, signIn, resetPasswordForEmail } = useSupabaseDatabase();

	// Wrapper functions to match component signatures
	const handleAddBoard = async (board: Omit<Board, 'id' | 'createdAt' | 'userId'>) => {
		await addBoard(board);
	};

	const handleUpdateBoard = async (id: number, updates: Partial<Board>) => {
		await updateBoard(id, updates);
	};

	const handleDeleteBoard = async (id: number) => {
		await deleteBoard(id);
	};
	const handleMoveTask = async (taskId: number, newStatus: 'backlog' | 'this-week' | 'today' | 'done') => {
		await moveTask(taskId, newStatus);
	};

	const handleAddTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
		// Remove userId from the task and let database handle it
		const { userId, ...taskWithoutUserId } = task as any;
		await addTask(taskWithoutUserId);
	};

	const handleUpdateTask = async (id: number, updates: Partial<Task>) => {
		await updateTask(id, updates);
	};
	const handleDeleteTask = async (id: number) => {
		await deleteTask(id);
	};
	const handleDuplicateTask = async (task: Task) => {
		await duplicateTask(task);
	};

	const handleReorderTasksInColumn = async (taskIds: number[], status: 'backlog' | 'this-week' | 'today' | 'done') => {
		await reorderTasksInColumn(taskIds, status);
	};
	const handleSignUp = async (email: string, password: string) => {
		return await signUp(email, password);
	};

	const handleSignIn = async (email: string, password: string) => {
		return await signIn(email, password);
	};

	const [currentView, setCurrentView] = useState<'boards' | 'kanban' | 'sprint'>('boards');
	const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
	const [showSprintConfig, setShowSprintConfig] = useState(false);
	const [sprintConfig, setSprintConfig] = useState<SprintConfiguration | null>(null); // Show auth if not logged in
	if (!user) {
		return (
			<Auth
				onSignUp={handleSignUp}
				onSignIn={handleSignIn}
				onResetPassword={resetPasswordForEmail}
			/>
		);
	}

	// Loading state
	if (isLoading) {
		return (
			<div className='h-screen bg-background flex items-center justify-center'>
				<div className='text-center space-y-4'>
					<div className='flex items-center justify-center space-x-2'>
						<div className='w-2 h-2 bg-primary rounded-full animate-bounce'></div>
						<div
							className='w-2 h-2 bg-primary rounded-full animate-bounce'
							style={{ animationDelay: '0.1s' }}
						></div>
						<div
							className='w-2 h-2 bg-primary rounded-full animate-bounce'
							style={{ animationDelay: '0.2s' }}
						></div>
					</div>
				</div>
			</div>
		);
	}
	const handleSelectBoard = async (board: Board) => {
		setSelectedBoard(board);
		// If it's the "All Tasks" board, load all tasks, otherwise filter by board
		if (board.isDefault) {
			await loadTasks(); // Load all tasks for "All Tasks" board
		} else {
			await loadTasks(board.id); // Filter tasks by board ID
		}
		setCurrentView('kanban');
	};
	const handleBackToBoards = () => {
		setCurrentView('boards');
		setSelectedBoard(null);
		// Load all tasks when going back to board selection
		loadTasks();
	};

	const handleUpdateTimeEstimate = async (taskId: number, timeEstimate: number) => {
		await updateTask(taskId, { timeEstimate });
	};

	const handleStartSprint = () => {
		setShowSprintConfig(true);
	};

	const handleSprintConfigSubmit = (config: SprintConfiguration) => {
		setSprintConfig(config);
		setShowSprintConfig(false);
		setCurrentView('sprint');
	};

	const handleSprintConfigCancel = () => {
		setShowSprintConfig(false);
	};

	const handleTaskComplete = (taskId: number) => {
		// Handle task completion in sprint mode
		if (sprintConfig) {
			const updatedTasks = sprintConfig.selectedTasks.filter(task => task.id !== taskId);
			setSprintConfig({ ...sprintConfig, selectedTasks: updatedTasks });
		}
	};

	// Sprint mode view
	if (currentView === 'sprint') {
		if (!sprintConfig) {
			setCurrentView('kanban');
			return null;
		}
		return (
			<div className='h-screen bg-background flex flex-col'>
				<div className='flex-1'>
					<SprintMode
						tasks={sprintConfig.selectedTasks}
						timerType={sprintConfig.timerType}
						pomodoroMinutes={sprintConfig.pomodoroMinutes}
						countdownMinutes={sprintConfig.countdownMinutes}
						onTaskComplete={handleTaskComplete}
						onExit={() => {
							setCurrentView('kanban');
							setSprintConfig(null);
						}}
					/>
				</div>
			</div>
		);
	}

	// Board selection view
	if (currentView === 'boards') {
		return (
			<div className='h-screen bg-background flex flex-col'>
				<CustomTitlebar title='DayFlow' />
				<div className='flex-1'>
					<BoardSelection
						boards={boards}
						onSelectBoard={handleSelectBoard}
						onCreateBoard={handleAddBoard}
						onUpdateBoard={handleUpdateBoard}
						onDeleteBoard={handleDeleteBoard}
						user={user}
						onSignOut={signOut}
					/>
				</div>
			</div>
		);
	}

	// Kanban board view
	if (currentView === 'kanban' && selectedBoard) {
		return (
			<div className='h-screen bg-background flex flex-col'>
				<CustomTitlebar title={`DayFlow - ${selectedBoard.name}`} />{' '}
				<div className='flex-1'>
					{' '}
					<KanbanBoardView
						board={selectedBoard}
						tasks={tasks}
						onBack={handleBackToBoards}
						onMoveTask={handleMoveTask}
						onAddTask={handleAddTask}
						onUpdateTask={handleUpdateTask}
						onDeleteTask={handleDeleteTask}
						onDuplicateTask={handleDuplicateTask}
						onReorderTasksInColumn={handleReorderTasksInColumn}
						onUpdateTimeEstimate={handleUpdateTimeEstimate}
						onStartSprint={handleStartSprint}
						isAllTasksBoard={selectedBoard.isDefault}
						boards={boards}
						user={user}
						onSignOut={signOut}
					/>
				</div>
				{showSprintConfig && (
					<SprintConfig
						availableTasks={tasks.filter(task => task.status === 'today')}
						onStartSprint={handleSprintConfigSubmit}
						onCancel={handleSprintConfigCancel}
					/>
				)}
			</div>
		);
	}
	// Fallback to board selection
	return (
		<div className='h-screen bg-background flex flex-col'>
			<CustomTitlebar title='DayFlow' />{' '}
			<div className='flex-1'>
				<BoardSelection
					boards={boards}
					onSelectBoard={handleSelectBoard}
					onCreateBoard={handleAddBoard}
					onUpdateBoard={handleUpdateBoard}
					onDeleteBoard={handleDeleteBoard}
					user={user}
					onSignOut={signOut}
				/>
			</div>
		</div>
	);
}

export default App;
