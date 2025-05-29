# DayFlow - Daily Planner & Journal

A modern desktop application built with Tauri, React, TypeScript, and SQLite for daily planning, task management, and journaling.

## Features

### 📋 Kanban Board
- 4-column layout: Backlog → This Week → Today → Done
- Drag and drop task management
- Priority levels (Low, Medium, High)
- Time estimates for tasks
- Task creation and deletion

### ⏱️ Timer & Focus
- Pomodoro timer (25-minute sessions)
- Custom countdown timer
- Stopwatch functionality
- Sprint mode for focused work sessions

### 📝 Journal
- Daily journaling with mood tracking
- Gratitude entries
- Date-based organization
- Rich text support

### 🎯 Sprint Mode
- Focus on today's tasks
- Distraction-free interface
- Task completion tracking
- Exit back to main dashboard

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS v4 + shadcn/ui
- **Desktop**: Tauri 2.0
- **Database**: SQLite (via Tauri SQL plugin)
- **State Management**: React Hooks

## Getting Started

### Prerequisites
- Node.js 18+ 
- Rust toolchain
- npm or yarn

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

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
