import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { CustomTitlebar } from './components/ui/custom-titlebar';
import { BoardSelection } from '@/components/boards/BoardSelection';
import { KanbanBoardView } from '@/components/boards/KanbanBoardView';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ListView } from '@/components/list/ListView';
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
import { TaskEditDialog } from '@/components/ui/task-edit-dialog';

// Router-aware board view component
function BoardViewRouter() {
	const { boardId, view = 'kanban' } = useParams<{ boardId: string; view: 'kanban' | 'calendar' | 'list' }>();
	const navigate = useNavigate();
	const { tasks, boards, addTask, deleteTask, duplicateTask, moveTask, updateTask, reorderTasksInColumn, isLoading, user, signOut } = useSupabaseDatabase();
	const { userPreferences, userProfile } = useUserSettings(user?.id);

	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [isEditingTask, setIsEditingTask] = useState(false);

	// Google Calendar sync integration
	const {
		updateTask: syncedUpdateTask,
		deleteTask: syncedDeleteTask,
		manualSyncTask,
		manualUnsyncTask
	} = useGoogleCalendarSync(updateTask, deleteTask, tasks, userPreferences, boards);

	// Find the current board
	const selectedBoard = boards.find(b => b.id === parseInt(boardId || ''));

	// Handler for editing task directly (e.g., from upcoming preview)
	const handleEditTask = (task: Task) => {
		setEditingTask(task);
		setIsEditingTask(true);
	};

	// Handler for saving edited task
	const handleEditTaskSave = async (id: number, updates: Partial<Task>) => {
		await updateTask(id, updates);
		setIsEditingTask(false);
		setEditingTask(null);
	};

	// Handler for deleting task from edit dialog
	const handleEditTaskDelete = async (id: number) => {
		await deleteTask(id);
		setIsEditingTask(false);
		setEditingTask(null);
	};

	// Handler for duplicating task from edit dialog
	const handleEditTaskDuplicate = async (task: Task) => {
		await duplicateTask(task);
		setIsEditingTask(false);
		setEditingTask(null);
	};

	const handleTaskClick = (task: Task) => {
		// When a task is clicked from the sidebar preview, open its edit dialog
		handleEditTask(task);
	};

	const handleSelectBoard = async (board: Board) => {
		navigate(`/board/${board.id}/kanban`);
	};

	const handleSelectView = async (board: Board, viewType: 'kanban' | 'calendar' | 'list') => {
		navigate(`/board/${board.id}/${viewType}`);
	};

	const handleBackToBoards = () => {
		navigate('/');
	};

	const handleOpenSettings = () => {
		navigate('/settings');
	};

	const handleMoveTask = async (taskId: number, newStatus: 'backlog' | 'this-week' | 'today' | 'done') => {
		await moveTask(taskId, newStatus);
	};

	const handleAddTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
		// The task is already properly typed and doesn't need userId handling
		await addTask(task);
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

	const handleUpdateTimeEstimate = async (taskId: number, timeEstimate: number) => {
		await updateTask(taskId, { timeEstimate });
	};

	// If board not found, redirect to boards
	useEffect(() => {
		if (!selectedBoard && !isLoading) {
			navigate('/');
		}
	}, [selectedBoard, isLoading, navigate]);

	// Handle invalid view types
	useEffect(() => {
		if (selectedBoard && view && !['kanban', 'calendar', 'list'].includes(view)) {
			navigate(`/board/${boardId}/kanban`, { replace: true });
		}
	}, [selectedBoard, view, boardId, navigate]);

	// Loading state
	if (isLoading || !selectedBoard) {
		return <div className="flex items-center justify-center h-screen">Loading...</div>;
	}

	// Render the appropriate view
	const commonProps = {
		board: selectedBoard,
		tasks,
		onBack: handleBackToBoards,
		onSelectBoard: handleSelectBoard,
		onMoveTask: handleMoveTask,
		onAddTask: handleAddTask,
		onUpdateTask: handleUpdateTask,
		onDeleteTask: handleDeleteTask,
		onDuplicateTask: handleDuplicateTask,
		onUpdateTimeEstimate: handleUpdateTimeEstimate,
		isAllTasksBoard: selectedBoard.isDefault,
		boards,
		user,
		onSignOut: signOut,
		onViewChange: handleSelectView,
		onOpenSettings: handleOpenSettings,
		userPreferences: userPreferences || undefined,
		userProfile: userProfile || null,
		onTaskClick: handleTaskClick,
	};

	switch (view) {
		case 'kanban':
			return (
				<>
					<KanbanBoardView
						{...commonProps}
						onReorderTasksInColumn={handleReorderTasksInColumn}
						onStartSprint={() => {
							// Sprint functionality can be added here
							console.log('Sprint mode not yet implemented with router');
						}}
					/>
					{isEditingTask && editingTask && (
						<TaskEditDialog
							task={editingTask}
							isOpen={isEditingTask}
							onClose={() => {
								setIsEditingTask(false);
								setEditingTask(null);
							}}
							onSave={handleEditTaskSave}
							onDelete={handleEditTaskDelete}
							onDuplicate={handleEditTaskDuplicate}
							boards={boards}
						/>
					)}
				</>
			);
		case 'calendar':
			return (
				<>
					<CalendarView
						{...commonProps}
						onManualSyncTask={manualSyncTask}
						onManualUnsyncTask={manualUnsyncTask}
					/>
					{isEditingTask && editingTask && (
						<TaskEditDialog
							task={editingTask}
							isOpen={isEditingTask}
							onClose={() => {
								setIsEditingTask(false);
								setEditingTask(null);
							}}
							onSave={handleEditTaskSave}
							onDelete={handleEditTaskDelete}
							onDuplicate={handleEditTaskDuplicate}
							boards={boards}
						/>
					)}
				</>
			);
		case 'list':
			return (
				<>
					<ListView 
						{...commonProps}
						userPreferences={userPreferences || undefined}
					/>
					{isEditingTask && editingTask && (
						<TaskEditDialog
							task={editingTask}
							isOpen={isEditingTask}
							onClose={() => {
								setIsEditingTask(false);
								setEditingTask(null);
							}}
							onSave={handleEditTaskSave}
							onDelete={handleEditTaskDelete}
							onDuplicate={handleEditTaskDuplicate}
							boards={boards}
						/>
					)}
				</>
			);
		default:
			return <div className="flex items-center justify-center h-screen">Invalid view</div>;
	}
}

function App() {
	const { boards, user, signOut, signUp, signIn, signInWithGoogle, resetPasswordForEmail, updatePassword, addBoard, updateBoard, deleteBoard } = useSupabaseDatabase();
	const { userPreferences, userProfile, updateUserPreferences, updateUserProfile } = useUserSettings(user?.id);
	const navigate = useNavigate();
	const location = useLocation();

	const [isOAuthCallback, setIsOAuthCallback] = useState(false);

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

	// Handle Google Calendar OAuth callback
	const handleGoogleCalendarCallback = useCallback(async (code: string) => {
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
			
			// Clear URL parameters and redirect to boards
			navigate('/', { replace: true });
		} catch (error) {
			console.error('❌ Failed to process Google Calendar callback:', error);
			// Clear URL parameters even on error
			navigate('/', { replace: true });
		}
	}, [user, navigate]);

	// Check if this is an OAuth callback
	useEffect(() => {
		const urlParams = new URLSearchParams(location.search);
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
			navigate('/', { replace: true });
		}
	}, [user, location.search, handleGoogleCalendarCallback, navigate]);

	const handleAuthComplete = () => {
		setIsOAuthCallback(false);
		// Navigate to boards after auth
		navigate('/', { replace: true });
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

	const handleSignUp = async (email: string, password: string) => {
		return await signUp(email, password);
	};

	const handleSignIn = async (email: string, password: string) => {
		return await signIn(email, password);
	};

	const handleGoogleSignIn = async () => {
		return await signInWithGoogle();
	};

	const handleSelectBoard = async (board: Board) => {
		navigate(`/board/${board.id}/kanban`);
	};

	const handleOpenSettings = () => {
		navigate('/settings');
	};

	// Show OAuth callback if needed
	if (isOAuthCallback) {
		return <AuthCallback onAuthComplete={handleAuthComplete} />;
	}

	// Show auth screen if not authenticated
	if (!user) {
		return (
			<>
				<CustomTitlebar />
				<Auth
					onSignUp={handleSignUp}
					onSignIn={handleSignIn}
					onGoogleSignIn={handleGoogleSignIn}
					onResetPassword={resetPasswordForEmail}
				/>
			</>
		);
	}

	return (
		<>
			<CustomTitlebar />
			<Routes>
				<Route 
					path="/" 
					element={
						<BoardSelection
							boards={boards}
							tasks={[]} // Tasks loaded in board views
							onSelectBoard={handleSelectBoard}
							onCreateBoard={handleAddBoard}
							onUpdateBoard={handleUpdateBoard}
							onDeleteBoard={handleDeleteBoard}
							onDuplicateBoard={async (board: Board) => {
								const { id: _id, createdAt: _createdAt, userId: _userId, ...boardData } = board;
								await handleAddBoard({ ...boardData, name: `${board.name} (Copy)` });
							}}
							user={user}
							onSignOut={signOut}
							onOpenSettings={handleOpenSettings}
							userPreferences={userPreferences || undefined}
							onUpdateUserPreferences={updateUserPreferences}
						/>
					} 
				/>
				<Route path="/board/:boardId/:view" element={<BoardViewRouter />} />
				<Route 
					path="/settings" 
					element={
						<SettingsPage
							user={user}
							userPreferences={userPreferences || undefined}
							userProfile={userProfile || undefined}
							onBack={() => navigate('/')}
							onUpdatePreferences={updateUserPreferences}
							onUpdateProfile={updateUserProfile}
							onSignOut={signOut}
							onUpdatePassword={updatePassword}
							onUpdateTask={async () => {}} // Implement if needed
							onAddTask={async () => {}} // Implement if needed
							tasks={[]} // Pass tasks if needed
							boards={boards}
							onTaskClick={() => {}} // Implement if needed
						/>
					} 
				/>
				{/* Redirect any unknown routes to boards */}
				<Route path="*" element={<div>Redirecting...</div>} />
			</Routes>
		</>
	);
}

export default App;
