# DayFlow

**High-performance hybrid task manager** built with Tauri 2.0, React 18, and TypeScript. Features real-time drag-and-drop kanban boards, advanced sprint modes with dynamic window management, Google Calendar integration, recurring tasks, and PostgreSQL-backed persistence via Supabase.

> **🚀 Cross-Platform Ready**: Works as both a native desktop application and a modern web app with the same codebase. Desktop users get enhanced sprint modes and window controls, while web users enjoy full task management functionality.

## Quick Start

### [📱 Install Desktop App](https://dayflow-landing-page.vercel.app/) | [🌐 Try Web App](https://dayflow-web.vercel.app/)

### Development Setup

```bash
# Install dependencies
bun install

# Start development (choose one)
bun run dev          # Desktop app with Tauri
bun run dev:web      # Web app only
bun run tauri dev    # Desktop with hot reload

# Build (choose one)
bun run build        # Desktop app
bun run build:web    # Web app
```

## 🏗️ Architecture Overview

### Tech Stack

- **Runtime**: Tauri 2.0 (Desktop) + Modern Web Browsers
- **Frontend**: React 18 + TypeScript 5.6 + Vite 6.0
- **Database**: PostgreSQL via Supabase (unified for web & desktop)
- **Authentication**: Supabase Auth with real-time sync
- **UI**: Tailwind CSS v4 + shadcn/ui components
- **State**: Custom React hooks with optimistic updates
- **DnD**: @dnd-kit with real-time persistence
- **Package Manager**: Bun for fast dependency management
- **Build**: Hybrid deployment (native + web)

### Hybrid Architecture

**Platform Detection**: `src/lib/platform.ts`

```typescript
export const isTauri = (): boolean => {
	return !import.meta.env.IS_BROWSER;
};
```

**Unified Database**: `src/hooks/useSupabaseDatabase.ts`

- Single codebase for web and desktop
- Real-time synchronization across devices
- Optimistic updates for instant UI responses
- PostgreSQL performance with Supabase convenience

## ✨ Core Features

### 📋 Real-Time Kanban System

**Implementation**: `src/components/kanban/`

- **4-column workflow**: `Backlog` → `This Week` → `Today` → `Done`
- **Drag & Drop**: `@dnd-kit/core` with sortable contexts and collision detection
- **Position tracking**: Integer-based ordering within columns via PostgreSQL
- **Real-time sync**: Supabase real-time subscriptions across all devices
- **Optimistic updates**: Immediate UI feedback with database synchronization
- **Time aggregation**: Column-level time estimates with HH:MM formatting
- **Bulk operations**: Multi-select for batch editing and status updates

```typescript
// Real-time task reordering with Supabase
const reorderTasksInColumn = async (taskIds: number[], status: Task['status']) => {
	const updates = taskIds.map((id, index) => ({ id, position: index }));
	await Promise.all(updates.map(update => 
		supabase.from('tasks').update({ position: update.position }).eq('id', update.id)
	));
};
```

### ⚡ Sprint Mode - Desktop Exclusive

**Implementation**: `src/components/sprint/SprintMode.tsx`

Enhanced productivity features available only in the desktop app:

- **3 View Modes**:
  - **Fullscreen**: Complete sprint interface with task progression
  - **Sidebar**: 220px always-on-top panel for multitasking
  - **Focus**: Minimal 220x60px timer overlay

**Advanced Window Management**:
- Dynamic window resizing via Tauri APIs
- Always-on-top maintenance with interval checks
- Window decoration control (title bar toggle)
- Multi-workspace visibility for maximum focus
- Cross-session view mode persistence

```typescript
// Dynamic window management
useEffect(() => {
	const setupWindow = async () => {
		const currentWindow = await getCurrentWindow();
		await currentWindow.setSize(new LogicalSize(220, 400));
		await currentWindow.setAlwaysOnTop(true);
		await currentWindow.setVisibleOnAllWorkspaces(true);
	};
	if (viewMode === 'sidebar') setupWindow();
}, [viewMode]);
```

### ⏱️ Advanced Timer System

**Implementation**: `src/components/timer/Timer.tsx` + `src/hooks/useTimer.ts`

- **Multiple timer modes**: Pomodoro (25min), custom countdown, stopwatch
- **Platform aware**: Available in both web and desktop versions
- **Task integration**: Automatic time logging linked to specific tasks
- **Session tracking**: Detailed time entry logs with billable hour support
- **Break management**: Smart break notifications between work sessions
- **Precision timing**: Millisecond accuracy with proper cleanup

```typescript
// Precise timer implementation
const useTimer = () => {
	useEffect(() => {
		if (isRunning) {
			startTimeRef.current = Date.now() - timer.elapsedTime * 1000;
			intervalRef.current = setInterval(() => {
				const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
				setTimer(prev => ({ ...prev, elapsedTime: elapsed }));
			}, 1000);
		}
		return () => clearInterval(intervalRef.current);
	}, [isRunning]);
};
```

### 📅 Google Calendar Integration

**Implementation**: `src/hooks/useGoogleCalendar.ts` + `src/lib/googleCalendar.ts`

- **Bidirectional sync**: Tasks automatically sync to Google Calendar when scheduled
- **Google Tasks import**: Import existing Google Tasks with full metadata preservation
- **Smart filtering**: Sync only scheduled tasks or all tasks based on preferences
- **Manual control**: Right-click any task to manually sync/unsync
- **Bulk operations**: Sync or unsync multiple tasks simultaneously
- **Event import**: Import Google Calendar events as tasks with time blocking
- **Authentication**: Secure OAuth2 flow with token refresh handling

```typescript
// Google Calendar service integration
const syncTask = async (task: Task) => {
	const service = getGoogleCalendarService();
	if (task.scheduledDate && !task.googleCalendarEventId) {
		const eventId = await service.createEvent({
			summary: task.title,
			description: task.description,
			start: { dateTime: task.scheduledDate },
			end: { dateTime: addMinutes(new Date(task.scheduledDate), task.timeEstimate) }
		});
		await onTaskUpdate(task.id, { googleCalendarEventId: eventId });
	}
};
```

### 🔄 Recurring Tasks

**Implementation**: `src/lib/recurring-tasks.ts`

- **Flexible patterns**: Daily, weekly, monthly, yearly recurrence
- **Custom intervals**: Every N days/weeks/months/years
- **Specific scheduling**: Weekly tasks on specific days, monthly on specific dates
- **End conditions**: Set end dates or let tasks recur indefinitely
- **Instance tracking**: Individual completion tracking for each recurring instance
- **Smart generation**: Automatic creation of future instances within view range

```typescript
// Recurring task generation
export async function generateRecurringInstances(
	task: Task,
	startDate: Date,
	endDate: Date
): Promise<Task[]> {
	if (!task.recurring) return [task];
	
	const instances: Task[] = [];
	const { pattern, interval, endDate: recurringEndDate } = task.recurring;
	
	// Generate instances based on pattern and interval
	// Handle weekly with specific days, monthly with specific dates, etc.
}
```

### 📝 Advanced Task Management

**Subtasks & Dependencies**: `src/components/subtasks/`

- **Hierarchical subtasks**: Break down complex tasks into manageable pieces
- **Progress tracking**: Visual progress indicators based on subtask completion
- **Task dependencies**: 4 dependency types (finish-to-start, start-to-start, etc.)
- **Dependency visualization**: Clear indicators and blocking notifications
- **Drag-and-drop reordering**: Organize subtasks with smooth interactions

**Rich Task Properties**:

- **Priority levels**: 4-tier system (Low, Medium, High, Critical) with color coding
- **Time tracking**: Estimated vs. actual time spent with detailed logging
- **Progress tracking**: Percentage completion with visual progress bars
- **Scheduling**: Due dates, start dates, and scheduled dates with calendar integration
- **Categorization**: Custom categories, tags, and color-coded labels
- **Rich descriptions**: Markdown support for detailed task documentation
- **File attachments**: Support for images, documents, and links

### 📊 Multiple View Modes

**Calendar Views**: `src/components/calendar/`

- **Multiple layouts**: 3-day, weekly, and monthly calendar views
- **Zoom levels**: 4 zoom levels for different detail requirements
- **Time blocking**: Visual time allocation with drag-and-drop scheduling
- **Conflict detection**: Automatic detection of scheduling conflicts
- **Compact view**: Dense calendar layout for overview purposes

**List Views**: `src/components/list/`

- **Compact list**: Dense table view for quick scanning
- **Detailed list**: Full task information with inline editing
- **Custom sorting**: Sort by priority, due date, creation date, or alphabetically
- **Filtering**: Advanced filters by status, priority, tags, and dates

### 🎨 Board Management System

**Implementation**: `src/components/boards/`

- **Multiple boards**: Organize tasks into different projects/contexts
- **Board customization**: Custom names, colors, icons, and descriptions
- **Default board**: "All Tasks" view aggregates across all boards
- **Board switching**: Quick navigation between different project boards
- **User isolation**: Each user sees only their own boards and tasks
- **Real-time sync**: Board changes sync instantly across devices

## 🛠️ Database & Authentication

### Supabase Integration

**Hook**: `src/hooks/useSupabaseDatabase.ts`

**PostgreSQL Schema**:

```sql
-- Enhanced tasks table with all features
CREATE TABLE tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  time_estimate INTEGER DEFAULT 30,
  status TEXT DEFAULT 'backlog',
  position INTEGER DEFAULT 0,
  scheduled_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  tags TEXT[],
  priority INTEGER DEFAULT 2,
  category TEXT,
  progress_percentage INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  recurring_pattern JSONB,
  recurring_instance_id TEXT,
  google_calendar_event_id TEXT,
  google_calendar_synced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id),
  board_id BIGINT REFERENCES boards(id)
);

-- Subtasks table
CREATE TABLE subtasks (
  id BIGSERIAL PRIMARY KEY,
  parent_task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  time_estimate INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id)
);

-- User preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'en',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  time_format TEXT DEFAULT '12h',
  week_starts_on INTEGER DEFAULT 0,
  auto_save BOOLEAN DEFAULT true,
  show_completed_tasks BOOLEAN DEFAULT false,
  task_sort_by TEXT DEFAULT 'priority',
  task_sort_order TEXT DEFAULT 'asc',
  calendar_default_zoom INTEGER DEFAULT 1,
  calendar_default_view TEXT DEFAULT '3-day',
  board_default_view TEXT DEFAULT 'compact',
  google_calendar_enabled BOOLEAN DEFAULT false,
  google_calendar_auto_sync BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Authentication System

**Supabase Auth Integration**:

- Secure email/password authentication
- Real-time session management
- Automatic user context for all database operations
- Cross-device synchronization
- Row Level Security (RLS) for data isolation

```typescript
// Automatic user context in database operations
const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'userId'>) => {
	if (!user) throw new Error('User not authenticated');

	const { data, error } = await supabase.from('tasks').insert({
		...convertTaskToDb(task, user.id),
		user_id: user.id,
	});

	if (error) throw error;
	return data;
};
```

## 🚀 Performance & UX Features

### Optimistic Updates Pattern

**Critical Implementation**: Never refresh after operations

```typescript
// ✅ CORRECT: Optimistic update pattern
const updateTask = async (id: number, updates: Partial<Task>) => {
	// 1. Update local state immediately
	setTasks(prev => prev.map(task => 
		task.id === id ? { ...task, ...updates } : task
	));
	
	try {
		// 2. Sync with database
		await supabase.from('tasks').update(updates).eq('id', id);
	} catch (error) {
		// 3. Revert only on error
		console.error('Failed to update task:', error);
		await loadTasks(); // Only refresh on error
	}
};
```

### Performance Optimizations

1. **Real-time Subscriptions**: Live updates across all connected clients
2. **Optimistic UI**: Immediate state updates with async persistence
3. **Indexed Queries**: PostgreSQL indexes for fast sorting and filtering
4. **Row Level Security**: Automatic user isolation at database level
5. **Connection Pooling**: Supabase handles connection management
6. **Virtual scrolling**: Smooth performance with large task lists
7. **Lazy loading**: Components and routes loaded on-demand
8. **Memoization**: Expensive calculations cached with useMemo/useCallback

### User Experience Features

- **Smooth animations**: 300ms transitions with cubic-bezier easing
- **Context menus**: Right-click anywhere for quick actions
- **Keyboard shortcuts**: Full keyboard navigation support
- **Drag handles**: Clear visual indicators for draggable elements
- **Loading states**: Skeleton screens and progress indicators
- **Error boundaries**: Graceful error handling and recovery
- **Offline support**: PWA capabilities for web version

## 🎨 Theming & Customization

### Design System

- **OKLCH Color System**: Modern color space for better gradients and accessibility
- **Plus Jakarta Sans**: Custom font for clean, modern typography
- **Theme Support**: Light, dark, and system-synchronized themes
- **Responsive Design**: Optimized for all screen sizes and devices
- **Custom Properties**: CSS variables for consistent theming

```css
/* OKLCH color system example */
:root {
	--primary-50: oklch(0.985 0.0122 179.15);
	--primary-500: oklch(0.7033 0.1179 180.36);
	--primary-950: oklch(0.2757 0.0383 189.38);
}
```

### User Preferences

- **Date/time formats**: Multiple format options with localization
- **Week configuration**: Start week on Sunday or Monday
- **Task sorting**: Sort by priority, due date, creation date, or alphabetically
- **Auto-save**: Configurable auto-save intervals
- **Visibility controls**: Show/hide completed tasks
- **Calendar defaults**: Set preferred zoom levels and view modes
- **Board view preferences**: Grid, compact, or list layouts

## 📱 Platform Features

### Desktop Exclusive (Tauri)

- **Sprint Mode**: Advanced window management and focus modes
- **Always-on-top**: Persistent overlay windows
- **Window controls**: Custom title bar and decorations
- **File system access**: Local file operations and storage
- **Native notifications**: System-level notification integration
- **Tray integration**: System tray icon and context menu

### Web Features

- **Progressive Web App**: Offline functionality and installability
- **Push notifications**: Web notifications for reminders
- **Responsive design**: Touch-friendly interface for mobile
- **Browser integration**: Deep linking and URL routing
- **Fullscreen API**: Immersive focus modes

## 🔧 Development Guidelines

### Code Quality Standards

- **TypeScript Strict Mode**: Full type coverage with strict checking
- **Optimistic Updates**: Never call refresh functions after CRUD operations
- **Platform Awareness**: Use `isTauri()` for platform-specific features
- **Error Boundaries**: Graceful error handling throughout the app
- **Security First**: Input validation and SQL injection prevention

### File Organization

```
src/
├── components/          # UI components
│   ├── kanban/         # Kanban board components
│   ├── calendar/       # Calendar view components
│   ├── sprint/         # Sprint mode components
│   ├── timer/          # Timer components
│   ├── subtasks/       # Subtask management
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and platform detection
├── types/              # TypeScript type definitions
├── contexts/           # React contexts
└── utils/              # Pure utility functions
```

### Build Commands

```bash
# Development
bun run dev          # Desktop development
bun run dev:web      # Web development
bun run tauri dev    # Desktop with hot reload

# Production builds
bun run build        # Desktop application
bun run build:web    # Web application

# Testing and validation
bun run build        # Always run after changes to check for errors
bun run lint         # Code linting
bun run type-check   # TypeScript validation
```

## 🤝 Contributing

1. **Follow the established patterns** - refer to existing components
2. **Use the type system effectively** - leverage TypeScript fully
3. **Implement optimistic updates** - never refresh after operations
4. **Test both platforms** - ensure web and desktop compatibility
5. **Run build command** - always check for TypeScript errors before committing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**DayFlow** - Where productivity meets performance. Built for professionals who demand both power and simplicity in their task management workflow.
