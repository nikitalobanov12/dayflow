# DayFlow - Daily Task Manager

A modern desktop productivity application that combines task management and focused work sessions for efficient daily planning. Built with Tauri, React, TypeScript, and SQLite for native performance and cross-platform compatibility.

## Core Concept

DayFlow follows a structured daily workflow:

-   **Morning**: Plan your day using the Kanban board
-   **Work**: Execute tasks using focused Sprint Mode
-   **Evening**: Review completed tasks and plan for tomorrow

## Application Structure

### 📋 Kanban Board System

The heart of task management with a **4-column workflow**:

-   **Backlog** → **This Week** → **Today** → **Done**

**Features:**

-   Drag-and-drop task management with `@dnd-kit`
-   Time estimation for better planning (in minutes)
-   Multi-task creation for quick setup
-   Task editing and deletion through modal dialogs
-   Real-time position updates and status tracking

### 🎯 Sprint Mode - Advanced Focus System

The most sophisticated feature with **three distinct view modes**:

**1. Fullscreen Mode**

-   Complete sprint interface with progress tracking
-   Full task list and completion management
-   Integrated timer with visual progress indicators

**2. Sidebar Mode**

-   Compact 220px wide panel that stays on top
-   Perfect for working alongside other applications
-   Quick task switching and completion

**3. Focus Mode**

-   Minimal 220x60px timer view
-   Maximum distraction reduction
-   Essential controls only

**Sprint Features:**

-   Focuses exclusively on "Today" column tasks
-   Built-in Pomodoro timer (25-minute sessions)
-   Automatic task progression and completion tracking
-   Smart break scheduling between work sessions
-   Dynamic window management (resizing, always-on-top, decorations)

### ⏱️ Integrated Timer System

Timer functionality is built directly into Sprint Mode for focused work sessions:

-   **Pomodoro Timer**: 25-minute focused work sessions
-   **Custom Countdown**: User-defined time limits
-   **Stopwatch**: Open-ended time tracking
-   Seamlessly integrated with task completion tracking

## Data Architecture

### Database Schema (SQLite)

```typescript
interface Task {
	id: number;
	title: string;
	description?: string;
	timeEstimate: number; // minutes
	status: 'backlog' | 'this-week' | 'today' | 'done';
	position: number; // ordering within columns
	tags?: string[];
	createdAt: string;
	completedAt?: string;
}
```

DayFlow is now focused on task management and Sprint Mode for productive work sessions. The journal and standalone timer features have been removed to streamline the application around its core workflow.

## User Experience Design

### UI/UX Framework

-   **Design System**: Tailwind CSS v4 with custom design tokens
-   **Component Library**: shadcn/ui for consistent, accessible components
-   **Theme System**: Dark/light mode with smooth transitions
-   **Responsive Design**: Mobile-first approach with desktop optimization

### Window Management (Tauri)

Advanced desktop integration:

-   **Dynamic window resizing** based on current mode
-   **Always-on-top functionality** for focus sessions
-   **Custom window decorations** control
-   **Multi-window support** for sidebar and focus modes
-   **Position persistence** across sessions

### Usability Features

Following Nielsen's 10 Usability Heuristics:

-   **Clear system status** with progress indicators
-   **Intuitive navigation** matching real-world workflows
-   **Error prevention** with validation and confirmations
-   **Consistent design patterns** across all components
-   **Keyboard shortcuts** and accessibility support

## Key Workflows

### 1. Daily Task Management Flow

1. **Plan**: Create and organize tasks in Backlog
2. **Prioritize**: Move important tasks to "This Week"
3. **Focus**: Select today's priorities and move to "Today"
4. **Execute**: Use Sprint Mode for focused work sessions
5. **Complete**: Tasks automatically move to "Done" when finished

### 2. Sprint Work Session

1. Add tasks to "Today" column in Kanban board
2. Click "Start Sprint" to enter focused mode
3. Configure sprint settings (timer type, task selection)
4. Choose your preferred view mode (Fullscreen/Sidebar/Focus)
5. Work through tasks with integrated timer
6. Take automatic breaks between sessions
7. Return to dashboard when sprint is complete

### 3. Daily Planning Cycle

-   **Morning**: Review backlog, plan "Today" tasks, set time estimates
-   **Work Sessions**: Use Sprint Mode for distraction-free execution
-   **Evening**: Review completed tasks and plan tomorrow's priorities

## Technical Architecture

### Frontend Structure

```
src/
├── components/          # UI components
│   ├── kanban/         # Task board components
│   ├── sprint/         # Sprint mode interfaces
│   ├── timer/          # Timer functionality
│   └── ui/             # Reusable UI components
├── contexts/           # React contexts (Theme)
├── hooks/              # Custom hooks (Database, Timer)
├── lib/                # Utilities
└── types/              # TypeScript definitions
```

### Desktop Integration (Tauri)

-   **Native Performance**: Rust backend with web frontend
-   **System Integration**: File system, notifications, window management
-   **Security**: Sandboxed environment with controlled permissions
-   **Cross-Platform**: Windows, macOS, Linux support
-   **Auto-Updates**: Built-in update mechanism

### Performance Features

-   **Smooth Animations**: CSS transitions and transforms
-   **Optimistic Updates**: Immediate UI feedback
-   **Efficient Rendering**: React optimization patterns
-   **Database Optimization**: Indexed SQLite queries
-   **Memory Management**: Tauri's resource efficiency

## Technology Stack

-   **Frontend**: React 18 + TypeScript + Vite
-   **UI Framework**: Tailwind CSS v4 + shadcn/ui
-   **Desktop**: Tauri 2.0
-   **Database**: SQLite (via Tauri SQL plugin)
-   **State Management**: React Hooks + Custom Context
-   **Drag & Drop**: @dnd-kit
-   **Build Tool**: Vite with TypeScript
-   **Package Manager**: npm

## Getting Started

### Prerequisites

-   Node.js 18+
-   Rust toolchain
-   npm or yarn

### Installation

1. Install dependencies

```bash
npm install
```

2. Start development server

```bash
npm run dev
```

3. Build for production

```bash
npm run build
```

## Recommended IDE Setup

-   [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
