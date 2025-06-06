import { useState} from 'react';
import { Button } from '@/components/ui/button';
import { User, LogOut, Settings } from 'lucide-react';

interface ProfileDropdownProps {
	user: any;
	onSignOut?: () => Promise<{ error: any }>;
}

export function ProfileDropdown({ user, onSignOut }: ProfileDropdownProps) {
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	const handleSignOut = async () => {
		if (!onSignOut) return;

		setIsSigningOut(true);
		try {
			const { error } = await onSignOut();
			if (error) {
				console.error('Sign out error:', error);
			}
			// The auth state change will handle navigation
		} catch (error) {
			console.error('Sign out error:', error);
		} finally {
			setIsSigningOut(false);
		}
	};

	if (!user) return null;

	// Temporary simple dropdown for testing
	return (
		<div className='relative'>
			<Button
				variant='ghost'
				size='sm'
				className='h-8 w-8 rounded-full p-0 bg-primary/10 hover:bg-primary/20'
				onClick={() => setIsOpen(!isOpen)}
			>
				<User className='h-4 w-4' />
			</Button>

			{isOpen && (
				<div className='absolute right-0 top-10 w-56 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-50 p-2'>
					<div className='px-2 py-1.5 text-sm font-semibold'>
						<div className='flex flex-col space-y-1'>
							<p className='text-sm font-medium leading-none'>{user?.email || 'User'}</p>
							<p className='text-xs leading-none text-gray-500 dark:text-gray-400'>Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</p>
						</div>
					</div>
					<hr className='my-1' />
					<button
						className='w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm flex items-center opacity-50 cursor-not-allowed'
						disabled
					>
						<Settings className='mr-2 h-4 w-4' />
						Settings
						<span className='ml-auto text-xs text-gray-400'>Soon</span>
					</button>
					<hr className='my-1' />
					{onSignOut && (
						<button
							className='w-full text-left px-2 py-1.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-sm flex items-center'
							onClick={handleSignOut}
							disabled={isSigningOut}
						>
							<LogOut className='mr-2 h-4 w-4' />
							{isSigningOut ? 'Signing Out...' : 'Sign Out'}
						</button>
					)}
				</div>
			)}
		</div>
	);
}
