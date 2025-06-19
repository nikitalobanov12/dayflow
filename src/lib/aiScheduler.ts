import { GoogleGenAI } from '@google/genai';
import { Task, UserPreferences } from '@/types';
import { format, addDays } from 'date-fns';

// Initialize Google Gemini client
const getGeminiClient = () => {
	const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error('VITE_GEMINI_API_KEY environment variable is required');
	}
	return new GoogleGenAI({ apiKey });
};

export interface AIScheduleRequest {
	tasks: Task[];
	userPreferences: UserPreferences;
	startDate?: string; // ISO date string
	endDate?: string; // ISO date string
	customInstructions?: string; // Custom user instructions
}

export interface AIScheduleResponse {
	scheduledTasks: Task[];
	suggestions: string[];
	conflictsResolved: number;
	totalTimeScheduled: number; // in minutes
}

// Helper function to generate working hours schedule text
const generateWorkingHoursText = (preferences: UserPreferences): string => {
	const workingDays = [];
	
	if (preferences.workingHoursMondayEnabled) {
		workingDays.push(`Monday: ${preferences.workingHoursMondayStart} - ${preferences.workingHoursMondayEnd}`);
	}
	if (preferences.workingHoursTuesdayEnabled) {
		workingDays.push(`Tuesday: ${preferences.workingHoursTuesdayStart} - ${preferences.workingHoursTuesdayEnd}`);
	}
	if (preferences.workingHoursWednesdayEnabled) {
		workingDays.push(`Wednesday: ${preferences.workingHoursWednesdayStart} - ${preferences.workingHoursWednesdayEnd}`);
	}
	if (preferences.workingHoursThursdayEnabled) {
		workingDays.push(`Thursday: ${preferences.workingHoursThursdayStart} - ${preferences.workingHoursThursdayEnd}`);
	}
	if (preferences.workingHoursFridayEnabled) {
		workingDays.push(`Friday: ${preferences.workingHoursFridayStart} - ${preferences.workingHoursFridayEnd}`);
	}
	if (preferences.workingHoursSaturdayEnabled) {
		workingDays.push(`Saturday: ${preferences.workingHoursSaturdayStart} - ${preferences.workingHoursSaturdayEnd}`);
	}
	if (preferences.workingHoursSundayEnabled) {
		workingDays.push(`Sunday: ${preferences.workingHoursSundayStart} - ${preferences.workingHoursSundayEnd}`);
	}
	
	return workingDays.join(', ');
};

// Helper function to format tasks for AI prompt
const formatTasksForPrompt = (tasks: Task[]): string => {
	return tasks.map(task => {
		const parts = [
			`ID: ${task.id}`,
			`Title: "${task.title}"`,
			`Current Status: ${task.status}`,
			`Priority: ${task.priority} (1=Low, 2=Medium, 3=High, 4=Critical)`,
			`Time Estimate: ${task.timeEstimate} minutes`,
			task.dueDate ? `Due Date: ${task.dueDate}` : null,
			task.scheduledDate ? `Currently Scheduled: ${task.scheduledDate}` : null,
			task.description ? `Description: "${task.description}"` : null,
			task.category ? `Category: ${task.category}` : null,
		].filter(Boolean);
		
		return `Task ${task.id}: {${parts.join(', ')}}`;
	}).join('\n');
};

// Main AI scheduling function
export const scheduleTasksWithAI = async (request: AIScheduleRequest): Promise<AIScheduleResponse> => {
	const { tasks, userPreferences, startDate, endDate, customInstructions } = request;
	
	if (!userPreferences.autoScheduleEnabled) {
		throw new Error('AI scheduling is not enabled in user preferences');
	}
	
	// Auto-estimate times for tasks with 0 minutes before scheduling
	const tasksWithZeroTime = tasks.filter(task => task.timeEstimate === 0);
	let processedTasks = [...tasks];
	
	if (tasksWithZeroTime.length > 0) {
		console.log(`Auto-estimating time for ${tasksWithZeroTime.length} tasks with 0 minutes...`);
		
		try {
			const estimates = await getAITimeEstimates(tasksWithZeroTime, userPreferences);
			
			// Apply the estimates to the tasks
			processedTasks = tasks.map(task => {
				if (task.timeEstimate === 0 && estimates[task.id]) {
					return {
						...task,
						timeEstimate: estimates[task.id],
					};
				}
				return task;
			});
			
			console.log(`Applied time estimates:`, estimates);
		} catch (error) {
			console.warn('Failed to auto-estimate times, proceeding with original estimates:', error);
			// Continue with original tasks if estimation fails
		}
	}
	
	const client = getGeminiClient();
	
	// Prepare the scheduling period
	const scheduleStart = startDate || format(new Date(), 'yyyy-MM-dd');
	const scheduleEnd = endDate || format(addDays(new Date(), userPreferences.schedulingLookaheadDays), 'yyyy-MM-dd');
	
	// Count tasks with zero time estimates after auto-estimation
	const remainingZeroTimeTasks = processedTasks.filter(task => task.timeEstimate === 0);
	const hasZeroTimeTasks = remainingZeroTimeTasks.length > 0;
	
	// Build the AI prompt with enhanced instructions for time estimation
	const prompt = `You are an intelligent task scheduling assistant for DayFlow, a productivity app. Please schedule the following tasks based on the user's preferences and constraints.

**USER PREFERENCES:**
- Working Hours: ${generateWorkingHoursText(userPreferences)}
- Max Daily Work Hours: ${userPreferences.maxDailyWorkHours} hours
- Buffer Time Between Tasks: ${userPreferences.bufferTimeBetweenTasks} minutes
- Min Task Chunk Size: ${userPreferences.minTaskChunkSize} minutes
- Max Task Chunk Size: ${userPreferences.maxTaskChunkSize} minutes
- Focus Time Minimum: ${userPreferences.focusTimeMinimumMinutes} minutes
- Context Switch Penalty: ${userPreferences.contextSwitchPenaltyMinutes} minutes
- Scheduling Style: ${userPreferences.aiSuggestionPreference}
- Allow Overtime: ${userPreferences.allowOvertimeScheduling}
- Deadline Buffer: ${userPreferences.deadlineBufferDays} days
- Priority Boost for Overdue: ${userPreferences.priorityBoostForOverdue}
- Respect Calendar Events: ${userPreferences.respectCalendarEvents}
- Auto Reschedule on Conflict: ${userPreferences.autoRescheduleOnConflict}

**SCHEDULING PERIOD:** ${scheduleStart} to ${scheduleEnd}

**TASKS TO SCHEDULE:**
${formatTasksForPrompt(processedTasks)}

${hasZeroTimeTasks ? `**IMPORTANT:** ${remainingZeroTimeTasks.length} task(s) still have 0 minutes time estimates. You MUST provide realistic time estimates for these tasks based on their titles, descriptions, and complexity. Use the following guidelines based on the user's preference style:

- **Conservative (${userPreferences.aiSuggestionPreference === 'conservative' ? 'ACTIVE' : 'inactive'})**: Provide higher estimates to ensure adequate time (add 20-30% buffer)
- **Balanced (${userPreferences.aiSuggestionPreference === 'balanced' ? 'ACTIVE' : 'inactive'})**: Provide realistic estimates based on typical completion times
- **Aggressive (${userPreferences.aiSuggestionPreference === 'aggressive' ? 'ACTIVE' : 'inactive'})**: Provide tighter estimates to maximize productivity (reduce by 10-15%)

Tasks requiring estimates: ${remainingZeroTimeTasks.map(t => `Task ${t.id} ("${t.title}")`).join(', ')}

` : ''}${customInstructions ? `**CUSTOM USER INSTRUCTIONS:**
${customInstructions}

` : ''}**INSTRUCTIONS:**
1. **FIRST**: For any task with 0 minutes estimate, provide a realistic time estimate based on its title, description, and complexity
2. Schedule ALL tasks within the user's working hours and preferences
3. Consider task priorities and due dates
4. Break down large tasks if they exceed max chunk size
5. Add buffer time between tasks
6. Group similar tasks to minimize context switching
7. Optimize for the user's scheduling style (${userPreferences.aiSuggestionPreference})
8. Provide scheduling suggestions and insights

**RESPONSE FORMAT:**
Return a JSON object with this exact structure:
{
  "scheduledTasks": [
    {
      "id": number,
      "scheduledDate": "YYYY-MM-DDTHH:mm:ss.sssZ",
      "timeEstimate": number (in minutes - REQUIRED for all tasks, especially those with 0 estimate),
      "reasoning": "Brief explanation for scheduling decision and time estimate if updated"
    }
  ],
  "suggestions": [
    "List of helpful scheduling suggestions and insights"
  ],
  "conflictsResolved": number,
  "totalTimeScheduled": number (total minutes scheduled)
}

Only return the JSON object, no additional text or formatting.`;

	try {
		console.log('Sending AI scheduling request to Gemini...');
		
		const response = await client.models.generateContent({
			model: 'gemini-2.5-flash',
			contents: prompt,
			config: {
				thinkingConfig: {
					thinkingBudget: 0, // Disable thinking for faster response
				},
			},
		});

		const responseText = response.text;
		if (!responseText) {
			throw new Error('Empty response from AI');
		}
		
		console.log('Gemini response:', responseText);

		// Parse the JSON response
		let aiResponse;
		try {
			// Clean the response in case there's any markdown formatting
			const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
			aiResponse = JSON.parse(cleanedResponse);
		} catch (parseError) {
			console.error('Failed to parse AI response:', parseError);
			throw new Error('Invalid response format from AI');
		}

		// Merge AI scheduling data with processed tasks
		const scheduledTasks = processedTasks.map(task => {
			const aiTask = aiResponse.scheduledTasks.find((at: any) => at.id === task.id);
			if (aiTask) {
				return {
					...task,
					scheduledDate: aiTask.scheduledDate,
					timeEstimate: aiTask.timeEstimate || task.timeEstimate,
				};
			}
			return task;
		});

		return {
			scheduledTasks,
			suggestions: aiResponse.suggestions || [],
			conflictsResolved: aiResponse.conflictsResolved || 0,
			totalTimeScheduled: aiResponse.totalTimeScheduled || 0,
		};

	} catch (error) {
		console.error('AI scheduling error:', error);
		throw new Error(`Failed to schedule tasks with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
};

// Function to get AI suggestions for time estimates
export const getAITimeEstimates = async (tasks: Task[], userPreferences: UserPreferences): Promise<{ [taskId: number]: number }> => {
	const client = getGeminiClient();
	
	// Filter tasks that need estimates (those with 0 or very low time estimates)
	const tasksNeedingEstimates = tasks.filter(task => task.timeEstimate === 0 || task.timeEstimate < 5);
	
	if (tasksNeedingEstimates.length === 0) {
		// Return empty object if no tasks need estimates
		return {};
	}
	
	const prompt = `You are a time estimation expert. Please provide realistic time estimates for these tasks based on their complexity and description.

**TASKS REQUIRING ESTIMATES:**
${formatTasksForPrompt(tasksNeedingEstimates)}

**USER PREFERENCES:**
- Suggestion Style: ${userPreferences.aiSuggestionPreference}
- Minimum task chunk: ${userPreferences.minTaskChunkSize} minutes
- Maximum task chunk: ${userPreferences.maxTaskChunkSize} minutes

**ESTIMATION GUIDELINES:**
Based on the user's ${userPreferences.aiSuggestionPreference} preference style:

${userPreferences.aiSuggestionPreference === 'conservative' ? 
`- **CONSERVATIVE STYLE (ACTIVE)**: Provide generous estimates with built-in buffers
- Add 20-30% extra time to account for unexpected complications
- Prefer higher estimates to reduce stress and ensure quality
- Minimum estimates: Simple tasks 15-30 min, moderate tasks 45-90 min, complex tasks 2-4 hours` : 
userPreferences.aiSuggestionPreference === 'balanced' ?
`- **BALANCED STYLE (ACTIVE)**: Provide realistic, well-calibrated estimates
- Use typical completion times for similar tasks
- Include moderate buffer for normal variations
- Minimum estimates: Simple tasks 10-20 min, moderate tasks 30-60 min, complex tasks 1-2 hours` :
`- **AGGRESSIVE STYLE (ACTIVE)**: Provide tight, ambitious estimates
- Focus on efficiency and pushing productivity
- Minimal buffers, optimistic but achievable
- Minimum estimates: Simple tasks 5-15 min, moderate tasks 20-45 min, complex tasks 60-90 min`}

**INSTRUCTIONS:**
1. Analyze each task's title, description, and complexity
2. Consider typical time required for similar tasks
3. Apply the ${userPreferences.aiSuggestionPreference} estimation style
4. Ensure estimates are at least ${userPreferences.minTaskChunkSize} minutes
5. Break large estimates into chunks if they exceed ${userPreferences.maxTaskChunkSize} minutes

**RESPONSE FORMAT:**
Return a JSON object with task IDs as keys and time estimates (in minutes) as values:
{
  "1": 60,
  "2": 120,
  "3": 30
}

Only return the JSON object, no additional text.`;

	try {
		const response = await client.models.generateContent({
			model: 'gemini-2.5-flash',
			contents: prompt,
			config: {
				thinkingConfig: {
					thinkingBudget: 0, // Disable thinking for faster response
				},
			},
		});

		const responseText = response.text;
		if (!responseText) {
			throw new Error('Empty response from AI');
		}
		
		const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
		
		return JSON.parse(cleanedResponse);
	} catch (error) {
		console.error('AI time estimation error:', error);
		throw new Error(`Failed to get AI time estimates: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}; 