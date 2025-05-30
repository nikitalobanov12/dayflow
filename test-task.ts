// Test file to verify the application structure
import { Task } from './src/types';

// Example task for testing
const testTask: Task = {
	id: 1,
	title: 'Test Task',
	description: 'This is a test task',
	timeEstimate: 30,
	status: 'backlog',
	tags: ['test'],
	createdAt: new Date().toISOString(),
};

console.log('Test task created:', testTask);
