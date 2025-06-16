import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, User, Palette, Calendar, List, CalendarDays, Shield, Key, Mail, Eye, EyeOff } from 'lucide-react';
import { UserPreferences, Profile, Task } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { GoogleCalendarSettings } from '@/components/GoogleCalendarSettings';
import { appConfig } from '@/lib/config';
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from '@/components/ui/sidebar';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';

interface SettingsPageProps {
	user: any;
	userPreferences?: UserPreferences;
	userProfile?: Profile;
	onBack: () => void;
	onUpdatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
	onUpdateProfile: (profile: Partial<Profile>) => Promise<void>;
	onSignOut?: () => Promise<{ error: any }>;
	onUpdatePassword?: (newPassword: string) => Promise<{ data: any; error: any }>;
	onUpdateTask?: (id: number, updates: Partial<Task>) => Promise<void>;
}

type SettingsSection = 'profile' | 'appearance' | 'datetime' | 'calendar' | 'tasks';

// Settings Sidebar Component
function SettingsSidebar({ activeSection, onSectionChange }: { activeSection: SettingsSection; onSectionChange: (section: SettingsSection) => void }) {
	const sections = [
		{ id: 'profile' as const, name: 'Profile', icon: User, description: 'Personal information and account' },
		{ id: 'appearance' as const, name: 'Appearance', icon: Palette, description: 'Theme and visual preferences' },
		{ id: 'datetime' as const, name: 'Date & Time', icon: Calendar, description: 'Date, time and timezone settings' },
		{ id: 'calendar' as const, name: 'Calendar', icon: CalendarDays, description: 'Calendar view and behavior' },
		{ id: 'tasks' as const, name: 'Tasks', icon: List, description: 'Task management preferences' },
	];

	return (
		<Sidebar variant="inset">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<div className="cursor-default">
								<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
									<User className="size-4" />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">Settings</span>
									<span className="truncate text-xs">Customize your experience</span>
								</div>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Configuration</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{sections.map((section) => {
								const Icon = section.icon;
								return (
									<SidebarMenuItem key={section.id}>
										<SidebarMenuButton
											onClick={() => onSectionChange(section.id)}
											isActive={activeSection === section.id}
											tooltip={section.description}
										>
											<Icon className="size-4" />
											<span>{section.name}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}

export function SettingsPage({ user, userPreferences, userProfile, onBack, onUpdatePreferences, onUpdateProfile, onSignOut, onUpdatePassword, onUpdateTask }: SettingsPageProps) {
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
		calendarDefaultZoom: 1,
		calendarDefaultView: '3-day',
		boardDefaultView: 'compact',
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

	const getSectionTitle = () => {
		const titles = {
			profile: 'Profile',
			appearance: 'Appearance',
			datetime: 'Date & Time',
			calendar: 'Calendar',
			tasks: 'Tasks',
		};
		return titles[activeSection];
	};

	return (
		<SidebarProvider>
			<SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<Button variant="ghost" size="sm" onClick={onBack} className="h-auto p-0 text-muted-foreground hover:text-foreground">
										<ArrowLeft className="h-4 w-4 mr-1" />
										Back
									</Button>
								</BreadcrumbItem>
								<BreadcrumbItem>
									<BreadcrumbPage>{getSectionTitle()}</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<div className="ml-auto flex items-center gap-2 px-4">
						{hasUnsavedChanges && (
							<Badge variant="outline" className="text-orange-600 border-orange-200">
								Unsaved changes
							</Badge>
						)}
						<Button onClick={handleSave} disabled={!hasUnsavedChanges || isLoading} size="sm" className="gap-2">
							<Save className="h-4 w-4" />
							{isLoading ? 'Saving...' : 'Save Changes'}
						</Button>
					</div>
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
					{activeSection === 'profile' && (
						<ProfileSection
							profile={localProfile}
							user={user}
							onUpdateProfile={updateProfile}
							onSignOut={handleSignOut}
							onUpdatePassword={onUpdatePassword}
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
					{activeSection === 'calendar' && (
						<CalendarSection
							preferences={localPreferences}
							onUpdatePreference={updatePreference}
							onUpdateTask={onUpdateTask}
						/>
					)}
					{activeSection === 'tasks' && (
						<TasksSection
							preferences={localPreferences}
							onUpdatePreference={updatePreference}
						/>
					)}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

// Profile Section Component
function ProfileSection({ profile, user, onUpdateProfile, onSignOut, onUpdatePassword, isLoading }: { profile: Partial<Profile>; user: any; onUpdateProfile: (key: keyof Profile, value: any) => void; onSignOut: () => void; onUpdatePassword?: (newPassword: string) => Promise<{ data: any; error: any }>; isLoading: boolean }) {
	// Common timezones that users are likely to need
	const commonTimezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney', 'UTC'];
	
	// Password change state
	const [showPasswordSection, setShowPasswordSection] = useState(false);
	const [passwordData, setPasswordData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	});
	const [showPasswords, setShowPasswords] = useState({
		current: false,
		new: false,
		confirm: false
	});
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [passwordError, setPasswordError] = useState('');

	// Determine authentication method
	const isGoogleAuth = user?.app_metadata?.provider === 'google' || user?.identities?.some((identity: any) => identity.provider === 'google');

	const handlePasswordChange = async () => {
		if (!onUpdatePassword) {
			setPasswordError('Password update function not available');
			return;
		}

		if (passwordData.newPassword !== passwordData.confirmPassword) {
			setPasswordError('New passwords do not match');
			return;
		}

		if (passwordData.newPassword.length < 6) {
			setPasswordError('Password must be at least 6 characters long');
			return;
		}

		setPasswordLoading(true);
		setPasswordError('');

		try {
			const { error } = await onUpdatePassword(passwordData.newPassword);
			
			if (error) {
				setPasswordError(error.message || 'Failed to change password. Please try again.');
				return;
			}
			
			// Reset form on success
			setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
			setShowPasswordSection(false);
			// You might want to show a success message here
		} catch (error) {
			setPasswordError('Failed to change password. Please try again.');
			console.error('Password change error:', error);
		} finally {
			setPasswordLoading(false);
		}
	};

	const getAuthProviderInfo = () => {
		if (isGoogleAuth) {
			return {
				provider: 'Google',
				icon: <Mail className="h-4 w-4" />,
				description: 'You signed in with your Google account',
				canChangePassword: false
			};
		} else {
			return {
				provider: 'Email & Password',
				icon: <Key className="h-4 w-4" />,
				description: 'You signed in with email and password',
				canChangePassword: true
			};
		}
	};

	const authInfo = getAuthProviderInfo();

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
							</SelectTrigger>
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
					<CardTitle className="flex items-center gap-2">
						<Shield className="h-5 w-5" />
						Authentication Method
					</CardTitle>
					<CardDescription>How you sign in to your account</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
						{authInfo.icon}
						<div className="flex-1">
							<p className="font-medium text-sm">{authInfo.provider}</p>
							<p className="text-xs text-muted-foreground">{authInfo.description}</p>
						</div>
						{isGoogleAuth && (
							<Badge variant="secondary" className="text-xs">
								OAuth
							</Badge>
						)}
					</div>

					{authInfo.canChangePassword && (
						<div className="space-y-3">
							{!showPasswordSection ? (
								<Button
									variant="outline"
									onClick={() => setShowPasswordSection(true)}
									className="gap-2"
								>
									<Key className="h-4 w-4" />
									Change Password
								</Button>
							) : (
								<div className="space-y-4 p-4 border rounded-lg">
									<div className="flex items-center justify-between">
										<h4 className="font-medium">Change Password</h4>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => {
												setShowPasswordSection(false);
												setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
												setPasswordError('');
											}}
										>
											Cancel
										</Button>
									</div>

									{passwordError && (
										<div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
											{passwordError}
										</div>
									)}

									<div className="space-y-3">
										{!isGoogleAuth && (
											<div>
												<label className="text-sm font-medium mb-2 block">Current Password</label>
												<div className="relative">
													<Input
														type={showPasswords.current ? 'text' : 'password'}
														value={passwordData.currentPassword}
														onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
														placeholder="Enter current password"
													/>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
														onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
													>
														{showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
													</Button>
												</div>
											</div>
										)}

										<div>
											<label className="text-sm font-medium mb-2 block">New Password</label>
											<div className="relative">
												<Input
													type={showPasswords.new ? 'text' : 'password'}
													value={passwordData.newPassword}
													onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
													placeholder="Enter new password"
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
													onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
												>
													{showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
												</Button>
											</div>
										</div>

										<div>
											<label className="text-sm font-medium mb-2 block">Confirm New Password</label>
											<div className="relative">
												<Input
													type={showPasswords.confirm ? 'text' : 'password'}
													value={passwordData.confirmPassword}
													onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
													placeholder="Confirm new password"
												/>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
													onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
												>
													{showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
												</Button>
											</div>
										</div>

										<Button
											onClick={handlePasswordChange}
											disabled={passwordLoading || (!isGoogleAuth && !passwordData.currentPassword) || !passwordData.newPassword || !passwordData.confirmPassword}
											className="w-full"
										>
											{passwordLoading ? 'Changing Password...' : 'Change Password'}
										</Button>
									</div>
								</div>
							)}
						</div>
					)}

					{isGoogleAuth && (
						<div className="text-xs text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
							<p>Since you signed in with Google, your password is managed by Google. You can change it in your Google account settings.</p>
						</div>
					)}
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
				<p className='text-sm text-muted-foreground'>Configure how dates and times are displayed throughout the app.</p>{' '}
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Date Format</CardTitle>
					<CardDescription>Choose how dates are displayed (limited implementation)</CardDescription>
				</CardHeader>
				<CardContent>
					<Select
						value={preferences.dateFormat || 'MM/DD/YYYY'}
						onValueChange={value => onUpdatePreference('dateFormat', value)}
					>
						<SelectTrigger className='w-48 text-left'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='MM/DD/YYYY' className='text-left'>MM/DD/YYYY (12/31/2024)</SelectItem>
							<SelectItem value='DD/MM/YYYY' className='text-left'>DD/MM/YYYY (31/12/2024)</SelectItem>
							<SelectItem value='YYYY-MM-DD' className='text-left'>YYYY-MM-DD (2024-12-31)</SelectItem>
						</SelectContent>
					</Select>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Time Format</CardTitle>
					<CardDescription>Choose 12-hour or 24-hour time display (limited implementation)</CardDescription>
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
					<CardDescription>Choose which day your week starts on (used in calendar)</CardDescription>
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

// Calendar Section Component
function CalendarSection({ preferences, onUpdatePreference, onUpdateTask }: { preferences: Partial<UserPreferences>; onUpdatePreference: (key: keyof UserPreferences, value: any) => void; onUpdateTask?: (id: number, updates: Partial<Task>) => Promise<void> }) {
	const zoomLevels = [
		{ value: 0, label: 'Compact', description: '1 hour per 60px' },
		{ value: 1, label: 'Comfortable', description: '1 hour per 80px' },
		{ value: 2, label: 'Spacious', description: '1 hour per 120px' },
		{ value: 3, label: 'Detailed', description: '30 min per 80px' },
	];

	// Create a function to handle Google Calendar preference updates
	const handleGoogleCalendarUpdate = async (updates: Partial<UserPreferences>) => {
		// Update each preference individually to trigger the proper state management
		for (const [key, value] of Object.entries(updates)) {
			onUpdatePreference(key as keyof UserPreferences, value);
		}
	};

	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-lg font-semibold mb-2'>Calendar Settings</h2>
				<p className='text-sm text-muted-foreground'>Configure default settings for the calendar view and external integrations.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Default View Mode</CardTitle>
					<CardDescription>Choose the default calendar view when opening the calendar</CardDescription>
				</CardHeader>
				<CardContent>
					<Select
						value={preferences.calendarDefaultView || '3-day'}
						onValueChange={value => onUpdatePreference('calendarDefaultView', value)}
					>
						<SelectTrigger className='w-48'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='3-day'>3-Day View</SelectItem>
							<SelectItem value='week'>Weekly View</SelectItem>
						</SelectContent>
					</Select>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Default Zoom Level</CardTitle>
					<CardDescription>Choose the default zoom level for the calendar timeline</CardDescription>
				</CardHeader>
				<CardContent>
					<Select
						value={preferences.calendarDefaultZoom?.toString() || '1'}
						onValueChange={value => onUpdatePreference('calendarDefaultZoom', parseInt(value))}
					>
						<SelectTrigger className='w-64 text-left'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{zoomLevels.map(level => (
								<SelectItem
									key={level.value}
									value={level.value.toString()}
									className='text-left'
								>
									<div className='flex flex-col items-start'>
										<span className='font-medium'>{level.label}</span>
										<span className='text-xs text-muted-foreground'>{level.description}</span>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</CardContent>
			</Card>

			{/* Google Calendar Integration */}
			{onUpdateTask && (
				<GoogleCalendarSettings
					onTaskUpdate={onUpdateTask}
					config={appConfig.googleCalendar}
					userPreferences={preferences as UserPreferences}
					onUpdateUserPreferences={handleGoogleCalendarUpdate}
				/>
			)}
		</div>
	);
}

// Tasks Section Component
function TasksSection({ preferences, onUpdatePreference }: { preferences: Partial<UserPreferences>; onUpdatePreference: (key: keyof UserPreferences, value: any) => void }) {
	const boardViewOptions = [
		{
			value: 'compact',
			label: 'Compact Grid',
			description: 'Square cards in a dense grid layout',
			preview: (
				<div className='w-full h-16 bg-muted/30 rounded-md p-2 flex flex-col gap-1'>
					<div className='flex gap-1'>
						<div className='w-4 h-4 bg-primary/60 rounded-sm'></div>
						<div className='w-4 h-4 bg-primary/60 rounded-sm'></div>
						<div className='w-4 h-4 bg-primary/60 rounded-sm'></div>
						<div className='w-4 h-4 bg-primary/60 rounded-sm'></div>
					</div>
					<div className='flex gap-1'>
						<div className='w-4 h-4 bg-primary/60 rounded-sm'></div>
						<div className='w-4 h-4 bg-primary/60 rounded-sm'></div>
						<div className='w-4 h-4 bg-primary/60 rounded-sm'></div>
						<div className='w-4 h-4 bg-primary/60 rounded-sm'></div>
					</div>
				</div>
			)
		},
		{
			value: 'grid',
			label: 'Grid View',
			description: 'Larger cards with more details',
			preview: (
				<div className='w-full h-16 bg-muted/30 rounded-md p-2 flex flex-col gap-1'>
					<div className='flex gap-1'>
						<div className='w-8 h-6 bg-primary/60 rounded-sm'></div>
						<div className='w-8 h-6 bg-primary/60 rounded-sm'></div>
					</div>
					<div className='flex gap-1'>
						<div className='w-8 h-6 bg-primary/60 rounded-sm'></div>
						<div className='w-8 h-6 bg-primary/60 rounded-sm'></div>
					</div>
				</div>
			)
		},
		{
			value: 'list',
			label: 'List View',
			description: 'Horizontal layout for easy scanning',
			preview: (
				<div className='w-full h-16 bg-muted/30 rounded-md p-2 flex flex-col gap-1'>
					<div className='w-full h-2 bg-primary/60 rounded-sm'></div>
					<div className='w-full h-2 bg-primary/60 rounded-sm'></div>
					<div className='w-full h-2 bg-primary/60 rounded-sm'></div>
					<div className='w-full h-2 bg-primary/60 rounded-sm'></div>
				</div>
			)
		}
	];

	return (
		<div className='space-y-6'>
			<div>
				<h2 className='text-lg font-semibold mb-2'>Task Management</h2>
				<p className='text-sm text-muted-foreground'>Configure how tasks are displayed and organized.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Board View Layout</CardTitle>
					<CardDescription>Choose your preferred layout for the board selection screen</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
						{boardViewOptions.map((option) => (
							<div
								key={option.value}
								className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
									preferences.boardDefaultView === option.value
										? 'border-primary bg-primary/5 shadow-sm'
										: 'border-border hover:border-primary/50'
								}`}
								onClick={() => onUpdatePreference('boardDefaultView', option.value)}
							>
								<div className='space-y-3'>
									<div className='flex items-center justify-between'>
										<h4 className='font-medium text-sm'>{option.label}</h4>
										{preferences.boardDefaultView === option.value && (
											<div className='w-2 h-2 bg-primary rounded-full'></div>
										)}
									</div>
									
									{option.preview}
									
									<p className='text-xs text-muted-foreground leading-relaxed'>
										{option.description}
									</p>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Card>
				{' '}
				<CardHeader>
					<CardTitle>Task Sorting</CardTitle>
					<CardDescription>Choose how unscheduled tasks are sorted in calendar view</CardDescription>
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
				{' '}
				<CardHeader>
					<CardTitle>Display Options</CardTitle>
					<CardDescription>Control what tasks are visible in all views</CardDescription>
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
					<p className='text-xs text-muted-foreground mt-1'>When enabled, completed tasks will remain visible in task lists and calendar</p>
				</CardContent>
			</Card>{' '}
		</div>
	);
}
