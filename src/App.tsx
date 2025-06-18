import { useState, useEffect } from 'react';
import { CustomTitlebar } from './components/ui/custom-titlebar';
import { BoardSelection } from '@/components/boards/BoardSelection';
import { KanbanBoardView } from '@/components/boards/KanbanBoardView';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ListView } from '@/components/list/ListView';
import { SprintMode } from './components/sprint/SprintMode';
import { SprintConfig, SprintConfiguration } from '@/components/sprint/SprintConfig';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { Auth } from '@/components/ui/auth';
import { AuthCallback } from '@/components/auth/AuthCallback';

import { useSupabaseDatabase } from '@/hooks/useSupabaseDatabase';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
// Google Calendar service initialization
import { initializeGoogleCalendar, getGoogleCalendarService } from '@/lib/googleCalendar';
import { appConfig } from '@/lib/config';
import { Board, Task } from '@/types';
import './App.css';

function App() {
	const { tasks, boards, addTask, deleteTask, duplicateTask, moveTask, updateTask, reorderTasksInColumn, addBoard, updateBoard, deleteBoard, loadTasks, isLoading, user, signOut, signUp, signIn, signInWithGoogle, resetPasswordForEmail, updatePassword } = useSupabaseDatabase();
	const { userPreferences, userProfile, updateUserPreferences, updateUserProfile } = useUserSettings(user?.id);

	// Initialize Google Calendar service when user is authenticated
	useEffect(() => {
		const initializeGoogleCalendarService = async () => {
			if (!user || !appConfig.validateGoogleCalendar()) {
				console.log('🔍 Skipping Google Calendar initialization: user not authenticated or config invalid');
				return;
			}

			try {
				console.log('🔄 Initializing Google Calendar service on app startup...');
				
				// Initialize the service
				const service = initializeGoogleCalendar(appConfig.googleCalendar);
				
				// Set user ID for token management
				service.setUserId(user.id);
				
				// Check if we have stored tokens and they're valid
				const hasStoredTokens = await service.loadStoredTokens();
				const isServiceAuthenticated = service.isUserAuthenticated();
				
				console.log('Google Calendar service initialized:', {
					hasStoredTokens,
					isServiceAuthenticated,
					userId: user.id,
					config: {
						hasClientId: !!appConfig.googleCalendar.clientId,
						redirectUri: appConfig.googleCalendar.redirectUri
					}
				});
				
				if (isServiceAuthenticated) {
					console.log('✅ Google Calendar service authenticated and ready');
				} else {
					console.log('ℹ️ Google Calendar service initialized but not authenticated');
				}
			} catch (error) {
				console.error('❌ Failed to initialize Google Calendar service:', error);
			}
		};

		initializeGoogleCalendarService();
	}, [user]);

	// Google Calendar sync integration
	const {
		updateTask: syncedUpdateTask,
		deleteTask: syncedDeleteTask,
		manualSyncTask,
		manualUnsyncTask
	} = useGoogleCalendarSync(updateTask, deleteTask, tasks, userPreferences, boards);

	const [isOAuthCallback, setIsOAuthCallback] = useState(false);

	// Handle Google Calendar OAuth callback
	const handleGoogleCalendarCallback = async (code: string) => {
		try {
			console.log('🔄 Processing Google Calendar authorization code in App.tsx...');
			
			// Get the already initialized Google Calendar service
			const service = getGoogleCalendarService();
			
			if (!service) {
				console.error('Google Calendar service not initialized');
				return;
			}

			// Set the user ID (should already be set, but ensure it's correct)
			service.setUserId(user.id);
			
			// Process the authorization code
			await service.exchangeCodeForTokens(code);
			
			console.log('✅ Google Calendar connected successfully on app load');
			
			// Clear URL parameters
			window.history.replaceState({}, document.title, window.location.pathname);
		} catch (error) {
			console.error('❌ Failed to process Google Calendar callback:', error);
			// Clear URL parameters even on error
			window.history.replaceState({}, document.title, window.location.pathname);
		}
	};

	// Check if this is an OAuth callback
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const code = urlParams.get('code');
		const state = urlParams.get('state');
		const error = urlParams.get('error');

		// Check if this is a Supabase OAuth callback (has state parameter)
		if (code && state) {
			setIsOAuthCallback(true);
		}
		// Handle Google Calendar OAuth callback (has code but no state)
		else if (code && !state && user && appConfig.validateGoogleCalendar()) {
			console.log('🔄 Processing Google Calendar OAuth callback on app load...');
			handleGoogleCalendarCallback(code);
		}
		// Handle OAuth errors
		else if (error) {
			console.error('OAuth error on app load:', error);
			// Clear URL parameters
			window.history.replaceState({}, document.title, window.location.pathname);
		}
	}, [user, handleGoogleCalendarCallback]);

	const handleAuthComplete = () => {
		setIsOAuthCallback(false);
		// Clear URL parameters
		window.history.replaceState({}, document.title, window.location.pathname);
	};

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
		await syncedUpdateTask(id, updates);
	};
	const handleDeleteTask = async (id: number) => {
		await syncedDeleteTask(id);
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

	const handleGoogleSignIn = async () => {
		return await signInWithGoogle();
	};
	const [currentView, setCurrentView] = useState<'boards' | 'kanban' | 'calendar' | 'list' | 'sprint' | 'settings'>('boards');
	const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
	const [showSprintConfig, setShowSprintConfig] = useState(false);
	const [sprintConfig, setSprintConfig] = useState<SprintConfiguration | null>(null);

	// Handle OAuth callback
	if (isOAuthCallback) {
		return <AuthCallback onAuthComplete={handleAuthComplete} />;
	}

	// Show auth if not logged in
	if (!user) {
		return (
			<Auth
				onSignUp={handleSignUp}
				onSignIn={handleSignIn}
				onGoogleSignIn={handleGoogleSignIn}
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

	const handleOpenSettings = () => {
		setCurrentView('settings');
	};
	const handleSelectView = async (board: Board, viewType: 'kanban' | 'calendar' | 'list') => {
		setSelectedBoard(board);
		setCurrentView(viewType);
		await loadTasks();
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
						onOpenSettings={handleOpenSettings}
						userPreferences={userPreferences}
						onUpdateUserPreferences={updateUserPreferences}
					/>
				</div>
			</div>
		);
	} // Kanban board view
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
						onSelectBoard={handleSelectBoard}
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
						onViewChange={handleSelectView}
						onOpenSettings={handleOpenSettings}
						userPreferences={userPreferences}
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
	// Calendar view
	if (currentView === 'calendar' && selectedBoard) {
		return (
			<div className='h-screen bg-background flex flex-col'>
				<CustomTitlebar title={`DayFlow - ${selectedBoard.name} - Calendar`} />
				<div className='flex-1'>
					{' '}
					<CalendarView
						board={selectedBoard}
						tasks={tasks}
						onBack={handleBackToBoards}
						onSelectBoard={handleSelectBoard}
						onMoveTask={handleMoveTask}
						onAddTask={handleAddTask}
						onUpdateTask={handleUpdateTask}
						onDeleteTask={handleDeleteTask}
						onDuplicateTask={handleDuplicateTask}
						onUpdateTimeEstimate={handleUpdateTimeEstimate}
						isAllTasksBoard={selectedBoard.isDefault}
						boards={boards}
						user={user}
						onSignOut={signOut}
						onViewChange={handleSelectView}
						onOpenSettings={handleOpenSettings}
						userPreferences={userPreferences}
						onManualSyncTask={manualSyncTask}
						onManualUnsyncTask={manualUnsyncTask}
					/>
				</div>
			</div>
		);
	}

	// List view
	if (currentView === 'list' && selectedBoard) {
		return (
			<div className='h-screen bg-background flex flex-col'>
				<CustomTitlebar title={`DayFlow - ${selectedBoard.name} - List`} />
				<div className='flex-1'>
					{' '}
					<ListView
						board={selectedBoard}
						tasks={tasks}
						onBack={handleBackToBoards}
						onSelectBoard={handleSelectBoard}
						onMoveTask={handleMoveTask}
						onAddTask={handleAddTask}
						onUpdateTask={handleUpdateTask}
						onDeleteTask={handleDeleteTask}
						onDuplicateTask={handleDuplicateTask}
						onUpdateTimeEstimate={handleUpdateTimeEstimate}
						isAllTasksBoard={selectedBoard.isDefault}
						boards={boards}
						user={user}
						onSignOut={signOut}
						onViewChange={handleSelectView}
						onOpenSettings={handleOpenSettings}
						userPreferences={userPreferences || undefined}
					/>
				</div>
			</div>
		);
	}

	// Settings view
	if (currentView === 'settings') {
		return (
			<div className='h-screen bg-background flex flex-col'>
				<CustomTitlebar title='DayFlow - Settings' />
				<div className='flex-1'>
					<SettingsPage
						user={user}
						userPreferences={userPreferences || undefined}
						userProfile={userProfile || undefined}
						onBack={handleBackToBoards}
						onUpdatePreferences={updateUserPreferences}
						onUpdateProfile={updateUserProfile}
						onSignOut={signOut}
						onUpdatePassword={updatePassword}
						onUpdateTask={handleUpdateTask}
						onAddTask={handleAddTask}
						tasks={tasks}
						boards={boards}
					/>
				</div>
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
					onOpenSettings={handleOpenSettings}
					userPreferences={userPreferences}
					onUpdateUserPreferences={updateUserPreferences}
				/>
			</div>
		</div>
	);
}

export default App;
