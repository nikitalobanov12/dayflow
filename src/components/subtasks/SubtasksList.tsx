import { useState } from 'react';
import { Subtask } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubtasksListProps {
	subtasks: Subtask[];
	onAddSubtask: (title: string) => Promise<void>;
	onUpdateSubtask: (id: number, updates: Partial<Subtask>) => Promise<void>;
	onDeleteSubtask: (id: number) => Promise<void>;
	className?: string;
}

export function SubtasksList({ subtasks, onAddSubtask, onUpdateSubtask, onDeleteSubtask, className }: SubtasksListProps) {
	const [isAdding, setIsAdding] = useState(false);
	const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editingTitle, setEditingTitle] = useState('');

	const handleAddSubtask = async () => {
		if (!newSubtaskTitle.trim()) return;

		try {
			await onAddSubtask(newSubtaskTitle.trim());
			setNewSubtaskTitle('');
			setIsAdding(false);
		} catch (error) {
			console.error('Failed to add subtask:', error);
		}
	};

	const handleUpdateSubtask = async (id: number, updates: Partial<Subtask>) => {
		try {
			await onUpdateSubtask(id, updates);
		} catch (error) {
			console.error('Failed to update subtask:', error);
		}
	};

	const handleEditSave = async (id: number) => {
		if (!editingTitle.trim()) return;

		await handleUpdateSubtask(id, { title: editingTitle.trim() });
		setEditingId(null);
		setEditingTitle('');
	};

	const startEditing = (subtask: Subtask) => {
		setEditingId(subtask.id);
		setEditingTitle(subtask.title);
	};

	const cancelEditing = () => {
		setEditingId(null);
		setEditingTitle('');
	};

	const completedCount = subtasks.filter(s => s.isCompleted).length;
	const totalCount = subtasks.length;

	return (
		<div className={cn('space-y-3', className)}>
			{/* Header with progress */}
			{totalCount > 0 && (
				<div className='flex items-center justify-between'>
					<h4 className='text-sm font-medium text-foreground'>Subtasks</h4>
					<div className='text-xs text-muted-foreground'>
						{completedCount}/{totalCount} completed
					</div>
				</div>
			)}

			{/* Progress bar */}
			{totalCount > 0 && (
				<div className='w-full bg-muted rounded-full h-1.5'>
					<div
						className='bg-primary h-1.5 rounded-full transition-all duration-300'
						style={{ width: `${(completedCount / totalCount) * 100}%` }}
					/>
				</div>
			)}

			{/* Subtasks list */}
			<div className='space-y-2'>
				{subtasks.map(subtask => (
					<div
						key={subtask.id}
						className='flex items-center gap-2 group'
					>
						<GripVertical className='h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab' />

						<Checkbox
							checked={subtask.isCompleted}
							onCheckedChange={checked => handleUpdateSubtask(subtask.id, { isCompleted: !!checked })}
							className='flex-shrink-0'
						/>

						{editingId === subtask.id ? (
							<div className='flex-1 flex items-center gap-2'>
								<Input
									value={editingTitle}
									onChange={e => setEditingTitle(e.target.value)}
									onKeyDown={e => {
										if (e.key === 'Enter') handleEditSave(subtask.id);
										if (e.key === 'Escape') cancelEditing();
									}}
									className='flex-1 h-7 text-sm'
									autoFocus
								/>
								<Button
									size='sm'
									variant='ghost'
									onClick={() => handleEditSave(subtask.id)}
									className='h-7 w-7 p-0'
								>
									✓
								</Button>
								<Button
									size='sm'
									variant='ghost'
									onClick={cancelEditing}
									className='h-7 w-7 p-0'
								>
									<X className='h-3 w-3' />
								</Button>
							</div>
						) : (
							<div className='flex-1 flex items-center justify-between group/item'>
								<span
									className={cn('text-sm cursor-pointer flex-1', subtask.isCompleted && 'line-through text-muted-foreground')}
									onClick={() => startEditing(subtask)}
								>
									{subtask.title}
								</span>

								<Button
									size='sm'
									variant='ghost'
									onClick={() => onDeleteSubtask(subtask.id)}
									className='h-6 w-6 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity'
								>
									<X className='h-3 w-3' />
								</Button>
							</div>
						)}
					</div>
				))}
			</div>

			{/* Add new subtask */}
			{isAdding ? (
				<div className='flex items-center gap-2'>
					<div className='w-3 h-3' /> {/* Spacer for grip */}
					<Checkbox
						disabled
						className='flex-shrink-0'
					/>
					<Input
						value={newSubtaskTitle}
						onChange={e => setNewSubtaskTitle(e.target.value)}
						onKeyDown={e => {
							if (e.key === 'Enter') handleAddSubtask();
							if (e.key === 'Escape') {
								setIsAdding(false);
								setNewSubtaskTitle('');
							}
						}}
						placeholder='Add subtask...'
						className='flex-1 h-7 text-sm'
						autoFocus
					/>
					<Button
						size='sm'
						variant='ghost'
						onClick={handleAddSubtask}
						className='h-7 w-7 p-0'
					>
						✓
					</Button>
					<Button
						size='sm'
						variant='ghost'
						onClick={() => {
							setIsAdding(false);
							setNewSubtaskTitle('');
						}}
						className='h-7 w-7 p-0'
					>
						<X className='h-3 w-3' />
					</Button>
				</div>
			) : (
				<Button
					variant='ghost'
					size='sm'
					onClick={() => setIsAdding(true)}
					className='w-full justify-start gap-2 text-muted-foreground hover:text-foreground h-8'
				>
					<Plus className='h-3 w-3' />
					Add subtask
				</Button>
			)}
		</div>
	);
}
