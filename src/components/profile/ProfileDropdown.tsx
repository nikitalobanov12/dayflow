import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { User, LogOut, Settings } from 'lucide-react';

interface ProfileDropdownProps {
	user: any;
	onSignOut?: () => Promise<{ error: any }>;
	onOpenSettings?: () => void;
}

export function ProfileDropdown({ user, onSignOut, onOpenSettings }: ProfileDropdownProps) {
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

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

	const handleToggleDropdown = (event: React.MouseEvent<HTMLButtonElement>) => {
		if (!isOpen) {
			const rect = event.currentTarget.getBoundingClientRect();
			setButtonRect(rect);
		}
		setIsOpen(!isOpen);
	};

	if (!user) return null;

	const dropdownContent = isOpen && buttonRect && (
		<div 
			className='fixed w-56 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-[9999] p-2'
			style={{
				top: buttonRect.bottom + 8,
				right: window.innerWidth - buttonRect.right,
			}}
		>
			<div className='px-2 py-1.5 text-sm font-semibold'>
				<div className='flex flex-col space-y-1'>
					<p className='text-sm font-medium leading-none'>{user?.email || 'User'}</p>
					<p className='text-xs leading-none text-gray-500 dark:text-gray-400'>Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</p>
				</div>
			</div>
			<hr className='my-1' />{' '}
			<button
				className='w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm flex items-center'
				onClick={() => {
					onOpenSettings?.();
					setIsOpen(false);
				}}
			>
				<Settings className='mr-2 h-4 w-4' />
				Settings
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
	);

	return (
		<>
			<div className='relative'>
				<Button
					variant='ghost'
					size='sm'
					className='h-8 w-8 rounded-full p-0 bg-primary/10 hover:bg-primary/20'
					onClick={handleToggleDropdown}
				>
					<User className='h-4 w-4' />
				</Button>
			</div>

			{/* Click outside to close */}
			{isOpen && (
				<div 
					className='fixed inset-0 z-[9998]' 
					onClick={() => setIsOpen(false)}
				/>
			)}

			{/* Portal the dropdown to document.body */}
			{typeof document !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
		</>
	);
}
