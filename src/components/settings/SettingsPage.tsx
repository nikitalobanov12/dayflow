import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, User, Palette, Calendar, List, Shield } from 'lucide-react';
import { UserPreferences, Profile } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

interface SettingsPageProps {
	user: any;
	userPreferences?: UserPreferences;
	userProfile?: Profile;
	onBack: () => void;
	onUpdatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
	onUpdateProfile: (profile: Partial<Profile>) => Promise<void>;
	onSignOut?: () => Promise<{ error: any }>;
}

type SettingsSection = 'profile' | 'appearance' | 'datetime' | 'tasks' | 'advanced';

export function SettingsPage({ user, userPreferences, userProfile, onBack, onUpdatePreferences, onUpdateProfile, onSignOut }: SettingsPageProps) {
	const { setTheme } = useTheme();
	const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
	const [isLoading, setIsLoading] = useState(false);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	// Local state for preferences
	const [localPreferences, setLocalPreferences] = useState<Partial<UserPreferences>>({
		theme: 'system',
		language: 'en',
		dateFormat: 'MM/DD/YYYY',
		timeFormat: '12h',
		weekStartsOn: 0,
		autoSave: true,
		showCompletedTasks: false,
		taskSortBy: 'priority',
		taskSortOrder: 'asc',
		...userPreferences,
	});

	// Local state for profile
	const [localProfile, setLocalProfile] = useState<Partial<Profile>>({
		firstName: '',
		lastName: '',
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		...userProfile,
	});

	useEffect(() => {
		if (userPreferences) {
			setLocalPreferences({ ...userPreferences });
		}
	}, [userPreferences]);

	useEffect(() => {
		if (userProfile) {
			setLocalProfile({ ...userProfile });
		}
	}, [userProfile]);

	const updatePreference = (key: keyof UserPreferences, value: any) => {
		setLocalPreferences(prev => ({ ...prev, [key]: value }));
		setHasUnsavedChanges(true);

		// Apply theme changes immediately
		if (key === 'theme') {
			setTheme(value);
		}
	};

	const updateProfile = (key: keyof Profile, value: any) => {
		setLocalProfile(prev => ({ ...prev, [key]: value }));
		setHasUnsavedChanges(true);
	};

	const handleSave = async () => {
		setIsLoading(true);
		try {
			await Promise.all([onUpdatePreferences(localPreferences), onUpdateProfile(localProfile)]);
			setHasUnsavedChanges(false);
		} catch (error) {
			console.error('Failed to save settings:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSignOut = async () => {
		if (!onSignOut) return;

		setIsLoading(true);
		try {
			const { error } = await onSignOut();
			if (error) {
				console.error('Sign out error:', error);
			}
		} catch (error) {
			console.error('Sign out error:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const sections = [
		{ id: 'profile' as const, name: 'Profile', icon: User },
		{ id: 'appearance' as const, name: 'Appearance', icon: Palette },
		{ id: 'datetime' as const, name: 'Date & Time', icon: Calendar },
		{ id: 'tasks' as const, name: 'Tasks', icon: List },
		{ id: 'advanced' as const, name: 'Advanced', icon: Shield },
	];

	return (
		<div className='h-screen bg-background flex flex-col'>
			{/* Header */}
			<div className='p-4 border-b border-border bg-card'>
				<div className='flex items-center justify-between container max-w-[1376px] mx-auto'>
					<div className='flex items-center gap-4'>
						<Button
							variant='ghost'
							size='sm'
							onClick={onBack}
							className='gap-2'
						>
							<ArrowLeft className='h-4 w-4' />
							Back
						</Button>
						<div>
							<h1 className='text-xl font-bold text-foreground'>Settings</h1>
							<p className='text-sm text-muted-foreground'>Customize your DayFlow experience</p>
						</div>
					</div>

					<div className='flex items-center gap-2'>
						{hasUnsavedChanges && (
							<Badge
								variant='outline'
								className='text-orange-600 border-orange-200'
							>
								Unsaved changes
							</Badge>
						)}
						<Button
							onClick={handleSave}
							disabled={!hasUnsavedChanges || isLoading}
							className='gap-2'
						>
							<Save className='h-4 w-4' />
							{isLoading ? 'Saving...' : 'Save Changes'}
						</Button>
					</div>
				</div>
			</div>

			<div className='flex-1 flex container max-w-[1376px] mx-auto'>
				{/* Sidebar */}
				<div className='w-64 border-r border-border bg-card p-4'>
					<nav className='space-y-2'>
						{sections.map(section => {
							const Icon = section.icon;
							return (
								<button
									key={section.id}
									onClick={() => setActiveSection(section.id)}
									className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${activeSection === section.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground hover:text-foreground'}`}
								>
									<Icon className='h-4 w-4' />
									{section.name}
								</button>
							);
						})}
					</nav>
				</div>

				{/* Content */}
				<div className='flex-1 p-6 overflow-auto'>
					{activeSection === 'profile' && (
						<ProfileSection
							profile={localProfile}
							user={user}
							onUpdateProfile={updateProfile}
							onSignOut={handleSignOut}
							isLoading={isLoading}
						/>
					)}

					{activeSection === 'appearance' && (
						<AppearanceSection
							preferences={localPreferences}
							onUpdatePreference={updatePreference}
						/>
					)}

					{activeSection === 'datetime' && (
						<DateTimeSection
							preferences={localPreferences}
							onUpdatePreference={updatePreference}
						/>
					)}

					{activeSection === 'tasks' && (
						<TasksSection
							preferences={localPreferences}
							onUpdatePreference={updatePreference}
						/>
					)}

					{activeSection === 'advanced' && (
						<AdvancedSection
							preferences={localPreferences}
							onUpdatePreference={updatePreference}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

// Profile Section Component
function ProfileSection({ profile, user, onUpdateProfile, onSignOut, isLoading }: { profile: Partial<Profile>; user: any; onUpdateProfile: (key: keyof Profile, value: any) => void; onSignOut: () => void; isLoading: boolean }) {
	// Common timezones that users are likely to need
	const commonTimezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney', 'UTC'];

	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-lg font-semibold mb-2'>Profile Information</h2>
				<p className='text-sm text-muted-foreground'>Manage your personal information and account settings.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Personal Details</CardTitle>
					<CardDescription>Your name and basic information</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<label className='text-sm font-medium text-foreground mb-2 block'>First Name</label>
							<Input
								value={profile.firstName || ''}
								onChange={e => onUpdateProfile('firstName', e.target.value)}
								placeholder='Enter your first name'
							/>
						</div>
						<div>
							<label className='text-sm font-medium text-foreground mb-2 block'>Last Name</label>
							<Input
								value={profile.lastName || ''}
								onChange={e => onUpdateProfile('lastName', e.target.value)}
								placeholder='Enter your last name'
							/>
						</div>
					</div>

					<div>
						<label className='text-sm font-medium text-foreground mb-2 block'>Email</label>
						<Input
							value={user?.email || ''}
							disabled
							className='bg-muted'
						/>
						<p className='text-xs text-muted-foreground mt-1'>Email cannot be changed from this page</p>
					</div>

					<div>
						<label className='text-sm font-medium text-foreground mb-2 block'>Timezone</label>
						<Select
							value={profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
							onValueChange={value => onUpdateProfile('timezone', value)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>{' '}
							<SelectContent className='max-h-60'>
								{commonTimezones.map((tz: string) => (
									<SelectItem
										key={tz}
										value={tz}
									>
										{tz.replace(/_/g, ' ')}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Account Actions</CardTitle>
					<CardDescription>Manage your account and session</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant='outline'
						onClick={onSignOut}
						disabled={isLoading}
						className='text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950'
					>
						{isLoading ? 'Signing Out...' : 'Sign Out'}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

// Appearance Section Component
function AppearanceSection({ preferences, onUpdatePreference }: { preferences: Partial<UserPreferences>; onUpdatePreference: (key: keyof UserPreferences, value: any) => void }) {
	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-lg font-semibold mb-2'>Appearance</h2>
				<p className='text-sm text-muted-foreground'>Customize the look and feel of your workspace.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Theme</CardTitle>
					<CardDescription>Choose your preferred color scheme</CardDescription>
				</CardHeader>
				<CardContent>
					<Select
						value={preferences.theme || 'system'}
						onValueChange={value => onUpdatePreference('theme', value)}
					>
						<SelectTrigger className='w-48'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='light'>Light</SelectItem>
							<SelectItem value='dark'>Dark</SelectItem>
							<SelectItem value='system'>System</SelectItem>
						</SelectContent>
					</Select>
				</CardContent>
			</Card>
		</div>
	);
}

// Date & Time Section Component
function DateTimeSection({ preferences, onUpdatePreference }: { preferences: Partial<UserPreferences>; onUpdatePreference: (key: keyof UserPreferences, value: any) => void }) {
	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-lg font-semibold mb-2'>Date & Time</h2>
				<p className='text-sm text-muted-foreground'>Configure how dates and times are displayed throughout the app.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Date Format</CardTitle>
					<CardDescription>Choose how dates are displayed</CardDescription>
				</CardHeader>
				<CardContent>
					<Select
						value={preferences.dateFormat || 'MM/DD/YYYY'}
						onValueChange={value => onUpdatePreference('dateFormat', value)}
					>
						<SelectTrigger className='w-48'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='MM/DD/YYYY'>MM/DD/YYYY (12/31/2024)</SelectItem>
							<SelectItem value='DD/MM/YYYY'>DD/MM/YYYY (31/12/2024)</SelectItem>
							<SelectItem value='YYYY-MM-DD'>YYYY-MM-DD (2024-12-31)</SelectItem>
						</SelectContent>
					</Select>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Time Format</CardTitle>
					<CardDescription>Choose 12-hour or 24-hour time display</CardDescription>
				</CardHeader>
				<CardContent>
					<Select
						value={preferences.timeFormat || '12h'}
						onValueChange={value => onUpdatePreference('timeFormat', value)}
					>
						<SelectTrigger className='w-48'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='12h'>12-hour (2:30 PM)</SelectItem>
							<SelectItem value='24h'>24-hour (14:30)</SelectItem>
						</SelectContent>
					</Select>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Week Start</CardTitle>
					<CardDescription>Choose which day your week starts on</CardDescription>
				</CardHeader>
				<CardContent>
					<Select
						value={preferences.weekStartsOn?.toString() || '0'}
						onValueChange={value => onUpdatePreference('weekStartsOn', parseInt(value))}
					>
						<SelectTrigger className='w-48'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='0'>Sunday</SelectItem>
							<SelectItem value='1'>Monday</SelectItem>
						</SelectContent>
					</Select>
				</CardContent>
			</Card>
		</div>
	);
}

// Tasks Section Component
function TasksSection({ preferences, onUpdatePreference }: { preferences: Partial<UserPreferences>; onUpdatePreference: (key: keyof UserPreferences, value: any) => void }) {
	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-lg font-semibold mb-2'>Task Management</h2>
				<p className='text-sm text-muted-foreground'>Configure how tasks are displayed and organized.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Task Sorting</CardTitle>
					<CardDescription>Choose how tasks are sorted by default</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div>
						<label className='text-sm font-medium text-foreground mb-2 block'>Sort By</label>
						<Select
							value={preferences.taskSortBy || 'priority'}
							onValueChange={value => onUpdatePreference('taskSortBy', value)}
						>
							<SelectTrigger className='w-48'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='priority'>Priority</SelectItem>
								<SelectItem value='dueDate'>Due Date</SelectItem>
								<SelectItem value='created'>Created Date</SelectItem>
								<SelectItem value='alphabetical'>Alphabetical</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div>
						<label className='text-sm font-medium text-foreground mb-2 block'>Sort Order</label>
						<Select
							value={preferences.taskSortOrder || 'asc'}
							onValueChange={value => onUpdatePreference('taskSortOrder', value)}
						>
							<SelectTrigger className='w-48'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='asc'>Ascending</SelectItem>
								<SelectItem value='desc'>Descending</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Display Options</CardTitle>
					<CardDescription>Control what tasks are visible</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex items-center space-x-2'>
						<Checkbox
							id='show-completed'
							checked={preferences.showCompletedTasks || false}
							onCheckedChange={checked => onUpdatePreference('showCompletedTasks', checked)}
						/>
						<label
							htmlFor='show-completed'
							className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
						>
							Show completed tasks
						</label>
					</div>
					<p className='text-xs text-muted-foreground mt-1'>When enabled, completed tasks will remain visible in task lists</p>
				</CardContent>
			</Card>
		</div>
	);
}

// Advanced Section Component
function AdvancedSection({ preferences, onUpdatePreference }: { preferences: Partial<UserPreferences>; onUpdatePreference: (key: keyof UserPreferences, value: any) => void }) {
	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-lg font-semibold mb-2'>Advanced Settings</h2>
				<p className='text-sm text-muted-foreground'>Configure advanced features and data handling.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Data Management</CardTitle>
					<CardDescription>Control how your data is saved and synced</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex items-center space-x-2'>
						<Checkbox
							id='auto-save'
							checked={preferences.autoSave !== false}
							onCheckedChange={checked => onUpdatePreference('autoSave', checked)}
						/>
						<label
							htmlFor='auto-save'
							className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
						>
							Auto-save changes
						</label>
					</div>
					<p className='text-xs text-muted-foreground mt-1'>Automatically save changes as you work without manual saving</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Performance</CardTitle>
					<CardDescription>Optimize app performance and responsiveness</CardDescription>
				</CardHeader>
				<CardContent>
					<p className='text-sm text-muted-foreground'>Performance optimization settings will be available in future updates.</p>
				</CardContent>
			</Card>
		</div>
	);
}
