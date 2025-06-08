import { useState, useEffect, useCallback } from 'react';
import { Subtask } from '@/types';
import { useSupabaseDatabase } from '@/hooks/useSupabaseDatabase';
import { SubtasksList } from './SubtasksList';

interface SubtasksContainerProps {
	taskId: number;
	className?: string;
}

export function SubtasksContainer({ taskId, className }: SubtasksContainerProps) {
	const { addSubtask, updateSubtask, deleteSubtask, getSubtasks } = useSupabaseDatabase();
	const [subtasks, setSubtasks] = useState<Subtask[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Memoize the loadSubtasks function to prevent unnecessary re-renders
	const loadSubtasks = useCallback(async () => {
		try {
			setIsLoading(true);
			const data = await getSubtasks(taskId);
			setSubtasks(data);
		} catch (error) {
			console.error('Failed to load subtasks:', error);
		} finally {
			setIsLoading(false);
		}
	}, [taskId, getSubtasks]);

	// Load subtasks when component mounts or taskId changes
	useEffect(() => {
		loadSubtasks();
	}, [loadSubtasks]);
	// Memoize the handlers to prevent unnecessary re-renders
	const handleAddSubtask = useCallback(
		async (title: string) => {
			try {
				const newSubtask = await addSubtask(taskId, title);
				setSubtasks(prev => [...prev, newSubtask]);
			} catch (error) {
				console.error('Failed to add subtask:', error);
				throw error;
			}
		},
		[taskId, addSubtask]
	);

	const handleUpdateSubtask = useCallback(
		async (id: number, updates: Partial<Subtask>) => {
			try {
				// Optimistically update UI
				setSubtasks(prev => prev.map(subtask => (subtask.id === id ? { ...subtask, ...updates } : subtask)));

				await updateSubtask(id, updates);
			} catch (error) {
				console.error('Failed to update subtask:', error);
				// Revert on error
				await loadSubtasks();
				throw error;
			}
		},
		[updateSubtask, loadSubtasks]
	);

	const handleDeleteSubtask = useCallback(
		async (id: number) => {
			try {
				// Optimistically update UI
				setSubtasks(prev => prev.filter(subtask => subtask.id !== id));

				await deleteSubtask(id);
			} catch (error) {
				console.error('Failed to delete subtask:', error);
				// Revert on error
				await loadSubtasks();
				throw error;
			}
		},
		[deleteSubtask, loadSubtasks]
	);

	if (isLoading) {
		return <div className='text-xs text-muted-foreground'>Loading subtasks...</div>;
	}
	// Don't render anything if there are no subtasks and we're not in add mode
	if (subtasks.length === 0) {
		return (
			<SubtasksList
				subtasks={subtasks}
				onAddSubtask={handleAddSubtask}
				onUpdateSubtask={handleUpdateSubtask}
				onDeleteSubtask={handleDeleteSubtask}
				className={className}
			/>
		);
	}

	return (
		<SubtasksList
			subtasks={subtasks}
			onAddSubtask={handleAddSubtask}
			onUpdateSubtask={handleUpdateSubtask}
			onDeleteSubtask={handleDeleteSubtask}
			className={className}
		/>
	);
}
