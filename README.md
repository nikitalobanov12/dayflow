# DayFlow

High-performance hybrid task manager built with Tauri 2.0, React 18, and TypeScript. Features real-time drag-and-drop kanban boards, advanced sprint modes with dynamic window management, and PostgreSQL-backed persistence via Supabase.

> **Cross-Platform Ready**: Works as both a native desktop application and a modern web app with the same codebase. Desktop users get enhanced sprint modes and window controls, while web users enjoy full task management functionality.

## [Install Desktop App](https://dayflow-landing-page.vercel.app/) | [Try Web App](https://dayflow-web.vercel.app/)

## Architecture Overview

### Tech Stack

-   **Runtime**: Tauri 2.0 (Desktop) + Modern Web Browsers
-   **Frontend**: React 18 + TypeScript 5.6 + Vite 6.0
-   **Database**: PostgreSQL via Supabase (unified for web & desktop)
-   **Authentication**: Supabase Auth with real-time sync
-   **UI**: Tailwind CSS v4 + shadcn/ui components
-   **State**: Custom React hooks with optimistic updates
-   **DnD**: @dnd-kit with real-time persistence
-   **Build**: Hybrid deployment (native + web)

### Hybrid Architecture

**Platform Detection**: `src/lib/platform.ts`

```typescript
export const isTauri = (): boolean => {
	return !import.meta.env.IS_BROWSER;
};
```

**Unified Database**: `src/hooks/useSupabaseDatabase.ts`

-   Single codebase for web and desktop
-   Real-time synchronization across devices
-   Optimistic updates for instant UI responses
-   PostgreSQL performance with Supabase convenience

## Core Features

### 1. Real-Time Kanban System

**Implementation**: `src/components/kanban/`

-   **4-column workflow**: `backlog` → `this-week` → `today` → `done`
-   **Drag & Drop**: `@dnd-kit/core` with sortable contexts and collision detection
-   **Position tracking**: Integer-based ordering within columns via PostgreSQL
-   **Real-time sync**: Supabase real-time subscriptions across all devices
-   **Optimistic updates**: Immediate UI feedback with database synchronization
-   **Time aggregation**: Column-level time estimates with HH:MM formatting

```typescript
// Real-time task reordering with Supabase
const reorderTasksInColumn = async (taskIds: number[], status: Task['status']) => {
	const updates = taskIds.map((id, index) => ({ id, position: index }));
	await Promise.all(updates.map(update => supabase.from('tasks').update({ position: update.position }).eq('id', update.id)));
};
```

### 2. Sprint Mode - Desktop Exclusive

**Implementation**: `src/components/sprint/SprintMode.tsx`

Enhanced productivity features available only in the desktop app:

-   **Fullscreen**: Complete sprint interface with task progression
-   **Sidebar**: 220px always-on-top panel for multitasking
-   **Focus**: Minimal 220x60px timer overlay

**Platform Detection**:

```typescript
// Sprint button only shows on desktop
{
	status === 'today' && tasks.length > 0 && onStartSprint && isTauri() && <Button onClick={onStartSprint}>Start Sprint</Button>;
}
```

**Advanced Features**:

-   Dynamic window resizing via Tauri APIs
-   Always-on-top maintenance with interval checks
-   Window decoration control (title bar toggle)
-   Cross-session view mode persistence

```typescript
// Dynamic window management
useEffect(() => {
	const setupWindow = async () => {
		const currentWindow = await getCurrentWindow();
		await currentWindow.setSize(new LogicalSize(220, 400));
		await currentWindow.setAlwaysOnTop(true);
		await currentWindow.setDecorations(false);
	};
	if (viewMode === 'sidebar') setupWindow();
}, [viewMode]);
```

### 3. High-Performance Timer System

**Implementation**: `src/components/timer/Timer.tsx` + `src/hooks/useTimer.ts`

-   **Multiple modes**: Pomodoro (25min), countdown (custom), stopwatch
-   **Platform aware**: Available in both web and desktop versions
-   **Precision timing**: `setInterval` with millisecond accuracy
-   **State persistence**: Timer state maintained across mode switches
-   **Auto-completion**: Automatic task progression on timer completion

```typescript
// Precise timer implementation with cleanup
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
```

### 4. Board Management System

**Implementation**: `src/components/boards/`

-   **Multiple boards**: Organize tasks into different projects/contexts
-   **Default board**: "All Tasks" view aggregates across all boards
-   **Custom themes**: Color and icon customization per board
-   **User isolation**: Each user sees only their own boards and tasks
-   **Real-time sync**: Board changes sync instantly across devices

## Database & Authentication

### Supabase Integration

**Hook**: `src/hooks/useSupabaseDatabase.ts`

**PostgreSQL Schema**:

```sql
-- Tasks table with real-time capabilities
CREATE TABLE tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  time_estimate INTEGER DEFAULT 30,
  status TEXT DEFAULT 'backlog',
  position INTEGER DEFAULT 0,
  scheduled_date TIMESTAMPTZ,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id),
  board_id BIGINT REFERENCES boards(id)
);

-- Boards table for organization
CREATE TABLE boards (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  is_default BOOLEAN DEFAULT false
);
```

### Authentication System

**Supabase Auth Integration**:

-   Email/password authentication
-   Real-time session management
-   Automatic user context for all database operations
-   Cross-device synchronization

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

### Performance Optimizations

1. **Real-time Subscriptions**: Live updates across all connected clients
2. **Optimistic UI**: Immediate state updates with async persistence
3. **Indexed Queries**: PostgreSQL indexes for fast sorting and filtering
4. **Row Level Security**: Automatic user isolation at database level
5. **Connection Pooling**: Supabase handles connection management

```typescript
// Optimized batch reordering
const reorderTasksInColumn = async (taskIds: number[], status: Task['status']) => {
	try {
		await db.execute('BEGIN TRANSACTION');
		for (let i = 0; i < taskIds.length; i++) {
			await db.execute('UPDATE tasks SET position = ? WHERE id = ? AND status = ?', [i, taskIds[i], status]);
		}
		await db.execute('COMMIT');
	} catch (error) {
		await db.execute('ROLLBACK');
		throw error;
	}
};
```

## Component Architecture

### State Management Pattern

**Custom hooks** with React patterns:

```typescript
// Centralized database operations
export const useDatabase = () => {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Optimistic updates with error handling
	const moveTask = async (id: number, newStatus: Task['status']) => {
		setTasks(prev => prev.map(task => (task.id === id ? { ...task, status: newStatus } : task)));

		try {
			await db.execute('UPDATE tasks SET status = ? WHERE id = ?', [newStatus, id]);
		} catch (error) {
			loadTasks(); // Revert on error
		}
	};
};
```

### Type Safety

**Strict TypeScript** with comprehensive interfaces:

```typescript
interface Task {
	id: number;
	title: string;
	description: string;
	timeEstimate: number; // minutes
	status: 'backlog' | 'this-week' | 'today' | 'done';
	position: number;
	scheduledDate?: string;
	createdAt: string;
	completedAt?: string;
	tags?: string[];
}

interface SprintConfiguration {
	timerType: 'pomodoro' | 'countdown' | 'stopwatch';
	selectedTasks: Task[];
	taskOrder: number[];
	pomodoroMinutes?: number;
	countdownMinutes?: number;
}
```

## Development Workflow

### Project Structure

```
├── src/
│   ├── components/
│   │   ├── kanban/          # Drag-drop task management
│   │   ├── sprint/          # Focus mode implementations
│   │   ├── timer/           # Timer logic & UI
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/
│   │   ├── useDatabase.ts   # SQLite operations
│   │   └── useTimer.ts      # Timer state management
│   └── types/index.ts       # TypeScript definitions
├── src-tauri/
│   ├── src/main.rs          # Tauri backend
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # App configuration
└── package.json             # Frontend dependencies
```

### Performance Considerations

1. **Bundle Size**: Tauri's Rust backend keeps JavaScript minimal
2. **Memory Usage**: SQLite in-process with efficient queries
3. **Rendering**: React.memo for task cards, useCallback for handlers
4. **Native APIs**: Direct OS integration via Tauri plugins
5. **Cross-Platform**: Single codebase for Windows/macOS/Linux

### Build Configuration

**Vite + Tauri** optimized build:

-   TypeScript compilation with strict mode
-   Tailwind CSS purging for minimal bundle
-   Tauri bundling with platform-specific installers
-   Icon generation for all platforms (Windows ICO, macOS ICNS, Linux PNG)

## Development Setup

### Prerequisites

-   **Node.js** 18+ and npm/yarn/bun
-   **Rust** 1.70+ (for Tauri desktop development)
-   **Supabase Account** for database and authentication

### Environment Configuration

Create `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

```bash
# Install dependencies
npm install

# Install Tauri CLI (for desktop development only)
npm install -g @tauri-apps/cli
```

### Development Commands

```bash
# Web development (browser)
npm run dev:web          # Start web dev server
npm run build:web        # Build for web deployment
npm run preview:web      # Preview web build

# Desktop development (Tauri)
npm run tauri dev        # Start desktop app in dev mode
npm run tauri build      # Build desktop app for production

# Standard commands
npm run dev             # Default Vite dev server (Tauri mode)
npm run build           # Build for Tauri (desktop)
npm run preview         # Preview production build
```

### Database Setup

1. **Create Supabase Project**:

    - Go to [supabase.com](https://supabase.com) and create a new project
    - Copy your project URL and anon key to `.env`

2. **Run SQL Schema**:

    ```sql
    -- Tasks table
    CREATE TABLE tasks (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      time_estimate INTEGER DEFAULT 30,
      status TEXT DEFAULT 'backlog',
      position INTEGER DEFAULT 0,
      scheduled_date TIMESTAMPTZ,
      tags TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      user_id UUID REFERENCES auth.users(id),
      board_id BIGINT REFERENCES boards(id)
    );

    -- Boards table
    CREATE TABLE boards (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      icon TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      user_id UUID REFERENCES auth.users(id),
      is_default BOOLEAN DEFAULT false
    );

    -- Enable Row Level Security
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

    -- Create policies for user isolation
    CREATE POLICY "Users can only see their own tasks" ON tasks
      FOR ALL USING (auth.uid() = user_id);

    CREATE POLICY "Users can only see their own boards" ON boards
      FOR ALL USING (auth.uid() = user_id);

    -- Enable real-time subscriptions
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
    ALTER PUBLICATION supabase_realtime ADD TABLE boards;
    ```

### Deployment

#### Web Deployment

```bash
npm run build:web
# Deploy dist-web/ to Vercel, Netlify, or any static host
```

#### Desktop Distribution

```bash
npm run tauri build
# Outputs to src-tauri/target/release/bundle/
# Includes installers for current platform
```

### Platform-Specific Features

**Web Version Features**:

-   ✅ Full kanban task management
-   ✅ Real-time sync across devices
-   ✅ Authentication and user accounts
-   ✅ Board management
-   ✅ Basic timer functionality
-   ❌ Sprint modes (desktop exclusive)
-   ❌ Window controls (desktop exclusive)

**Desktop Version Features**:

-   ✅ All web features +
-   ✅ Enhanced sprint modes with window management
-   ✅ Always-on-top timer overlays
-   ✅ Native window controls and theming
-   ✅ Fullscreen focus modes
-   ✅ Custom title bar

### Development Tips

-   **Hot Reload**: Use `npm run dev:web` for faster iteration
-   **Platform Testing**: Test both web and desktop modes regularly
-   **Environment Variables**: Use `IS_BROWSER` for platform-specific code
-   **Database**: All changes automatically sync via Supabase real-time
-   **Debugging**: Web dev tools work in both browser and Tauri WebView

---

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test both web and desktop builds
4. Submit a pull request

For major changes, please open an issue first to discuss what you would like to change.
