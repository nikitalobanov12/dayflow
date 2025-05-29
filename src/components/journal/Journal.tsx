import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Database from '@tauri-apps/plugin-sql';

interface JournalEntry {
	id: number;
	date: string;
	content: string;
	mood: 'great' | 'good' | 'okay' | 'poor' | 'terrible';
	tags: string[];
	gratitude?: string;
	goals?: string;
	createdAt: string;
}

interface JournalProps {
	selectedDate?: string;
	className?: string;
}

export function Journal({ selectedDate, className = '' }: JournalProps) {
	const [entries, setEntries] = useState<JournalEntry[]>([]);
	const [currentEntry, setCurrentEntry] = useState<Partial<JournalEntry>>({
		date: selectedDate || new Date().toISOString().split('T')[0],
		content: '',
		mood: 'okay',
		tags: [],
		gratitude: '',
		goals: '',
	});
	const [editingId, setEditingId] = useState<number | null>(null);

	useEffect(() => {
		initializeDatabase();
		loadEntries();
	}, []);

	useEffect(() => {
		if (selectedDate) {
			setCurrentEntry(prev => ({ ...prev, date: selectedDate }));
			loadEntriesForDate(selectedDate);
		}
	}, [selectedDate]);

	const initializeDatabase = async () => {
		try {
			const db = await Database.load('sqlite:dayflow.db');
			await db.execute(`
        CREATE TABLE IF NOT EXISTS journal_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          content TEXT NOT NULL,
          mood TEXT NOT NULL DEFAULT 'okay',
          tags TEXT,
          gratitude TEXT,
          goals TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
		} catch (error) {
			console.error('Failed to initialize journal database:', error);
		}
	};

	const loadEntries = async () => {
		try {
			const db = await Database.load('sqlite:dayflow.db');
			const result = (await db.select('SELECT * FROM journal_entries ORDER BY date DESC, created_at DESC LIMIT 10')) as any[];

			const loadedEntries = result.map((row: any) => ({
				id: row.id,
				date: row.date,
				content: row.content,
				mood: row.mood,
				tags: row.tags ? JSON.parse(row.tags) : [],
				gratitude: row.gratitude,
				goals: row.goals,
				createdAt: row.created_at,
			}));

			setEntries(loadedEntries);
		} catch (error) {
			console.error('Failed to load journal entries:', error);
		}
	};

	const loadEntriesForDate = async (date: string) => {
		try {
			const db = await Database.load('sqlite:dayflow.db');
			const result = (await db.select('SELECT * FROM journal_entries WHERE date = $1 ORDER BY created_at DESC', [date])) as any[];

			if (result.length > 0) {
				const entry = result[0];
				setCurrentEntry({
					id: entry.id,
					date: entry.date,
					content: entry.content,
					mood: entry.mood,
					tags: entry.tags ? JSON.parse(entry.tags) : [],
					gratitude: entry.gratitude,
					goals: entry.goals,
				});
				setEditingId(entry.id);
			} else {
				setCurrentEntry({
					date,
					content: '',
					mood: 'okay',
					tags: [],
					gratitude: '',
					goals: '',
				});
				setEditingId(null);
			}
		} catch (error) {
			console.error('Failed to load entries for date:', error);
		}
	};

	const saveEntry = async () => {
		if (!currentEntry.content?.trim()) return;

		try {
			const db = await Database.load('sqlite:dayflow.db');

			if (editingId) {
				// Update existing entry
				await db.execute('UPDATE journal_entries SET content = $1, mood = $2, tags = $3, gratitude = $4, goals = $5 WHERE id = $6', [currentEntry.content, currentEntry.mood, JSON.stringify(currentEntry.tags), currentEntry.gratitude, currentEntry.goals, editingId]);
			} else {
				// Create new entry
				const result = await db.execute('INSERT INTO journal_entries (date, content, mood, tags, gratitude, goals) VALUES ($1, $2, $3, $4, $5, $6)', [currentEntry.date, currentEntry.content, currentEntry.mood, JSON.stringify(currentEntry.tags), currentEntry.gratitude, currentEntry.goals]);
				setEditingId(result.lastInsertId as number);
			}

			await loadEntries();
			setEditingId(null);
		} catch (error) {
			console.error('Failed to save journal entry:', error);
		}
	};

	const getMoodEmoji = (mood: JournalEntry['mood']) => {
		switch (mood) {
			case 'great':
				return '😄';
			case 'good':
				return '😊';
			case 'okay':
				return '😐';
			case 'poor':
				return '😕';
			case 'terrible':
				return '😢';
			default:
				return '😐';
		}
	};

	const getMoodColor = (mood: JournalEntry['mood']) => {
		switch (mood) {
			case 'great':
				return 'bg-green-500';
			case 'good':
				return 'bg-blue-500';
			case 'okay':
				return 'bg-yellow-500';
			case 'poor':
				return 'bg-orange-500';
			case 'terrible':
				return 'bg-red-500';
			default:
				return 'bg-gray-500';
		}
	};

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Current Entry Editor */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						📝 Journal Entry
						<Badge variant='outline'>{currentEntry.date}</Badge>
					</CardTitle>
					<CardDescription>How was your day? Reflect on your experiences and mood.</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					{/* Mood Selector */}
					<div>
						<label className='text-sm font-medium mb-2 block'>How are you feeling?</label>
						<div className='flex gap-2'>
							{(['terrible', 'poor', 'okay', 'good', 'great'] as const).map(mood => (
								<Button
									key={mood}
									variant={currentEntry.mood === mood ? 'default' : 'outline'}
									size='sm'
									onClick={() => setCurrentEntry(prev => ({ ...prev, mood }))}
									className='flex items-center gap-1'
								>
									{getMoodEmoji(mood)}
									<span className='capitalize'>{mood}</span>
								</Button>
							))}
						</div>
					</div>

					{/* Main Content */}
					<div>
						<label className='text-sm font-medium mb-2 block'>Journal Entry</label>
						<Textarea
							value={currentEntry.content || ''}
							onChange={e => setCurrentEntry(prev => ({ ...prev, content: e.target.value }))}
							placeholder='Write about your day, thoughts, experiences...'
							className='min-h-[120px]'
						/>
					</div>

					{/* Gratitude */}
					<div>
						<label className='text-sm font-medium mb-2 block'>What are you grateful for?</label>
						<Textarea
							value={currentEntry.gratitude || ''}
							onChange={e => setCurrentEntry(prev => ({ ...prev, gratitude: e.target.value }))}
							placeholder="Three things you're grateful for today..."
							className='min-h-[80px]'
						/>
					</div>

					{/* Goals */}
					<div>
						<label className='text-sm font-medium mb-2 block'>Tomorrow's Goals</label>
						<Textarea
							value={currentEntry.goals || ''}
							onChange={e => setCurrentEntry(prev => ({ ...prev, goals: e.target.value }))}
							placeholder='What do you want to accomplish tomorrow?'
							className='min-h-[80px]'
						/>
					</div>

					<Button
						onClick={saveEntry}
						className='w-full'
					>
						{editingId ? 'Update Entry' : 'Save Entry'}
					</Button>
				</CardContent>
			</Card>

			{/* Recent Entries */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Entries</CardTitle>
					<CardDescription>Your journal history</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='space-y-3'>
						{entries.map(entry => (
							<div
								key={entry.id}
								className='border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
								onClick={() => {
									setCurrentEntry(entry);
									setEditingId(entry.id);
								}}
							>
								<div className='flex justify-between items-start mb-2'>
									<div className='flex items-center gap-2'>
										<Badge className={`${getMoodColor(entry.mood)} text-white`}>
											{getMoodEmoji(entry.mood)} {entry.mood}
										</Badge>
										<span className='text-sm text-gray-500'>{new Date(entry.date).toLocaleDateString()}</span>
									</div>
								</div>
								<p className='text-sm text-gray-700 dark:text-gray-300 line-clamp-2'>{entry.content}</p>
								{entry.gratitude && <p className='text-xs text-green-600 mt-1 line-clamp-1'>Grateful: {entry.gratitude}</p>}
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
