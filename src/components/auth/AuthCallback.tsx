import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { CustomTitlebar } from '@/components/ui/custom-titlebar';
import { CheckCircle, AlertCircle } from 'lucide-react';
import supabase from '@/utils/supabase';

interface AuthCallbackProps {
	onAuthComplete: () => void;
}

export function AuthCallback({ onAuthComplete }: AuthCallbackProps) {
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
	const [message, setMessage] = useState('Processing authentication...');

	useEffect(() => {
		const handleAuthCallback = async () => {
			try {
				// Get the URL parameters
				const urlParams = new URLSearchParams(window.location.search);
				const code = urlParams.get('code');
				const error = urlParams.get('error');

				if (error) {
					throw new Error(error);
				}

				if (code) {
					// Exchange the code for a session
					const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

					if (exchangeError) {
						throw exchangeError;
					}

					if (data?.session) {
						setStatus('success');
						setMessage('Successfully signed in with Google!');

						// Wait a moment before redirecting
						setTimeout(() => {
							onAuthComplete();
						}, 2000);
					} else {
						throw new Error('No session received');
					}
				} else {
					throw new Error('No authorization code received');
				}
			} catch (err) {
				console.error('Auth callback error:', err);
				setStatus('error');
				setMessage(err instanceof Error ? err.message : 'Authentication failed');

				// Redirect back to auth after a moment
				setTimeout(() => {
					onAuthComplete();
				}, 3000);
			}
		};

		handleAuthCallback();
	}, [onAuthComplete]);

	return (
		<div className='h-screen bg-background flex flex-col'>
			<CustomTitlebar title='DayFlow - Authentication' />
			<div className='flex-1 flex items-center justify-center pt-8'>
				<Card className='w-full max-w-md p-6 space-y-6'>
					<div className='text-center space-y-4'>
						<div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${status === 'loading' ? 'bg-blue-100 dark:bg-blue-900/20' : status === 'success' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
							{status === 'loading' && <div className='w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin' />}
							{status === 'success' && <CheckCircle className='w-8 h-8 text-green-600 dark:text-green-400' />}
							{status === 'error' && <AlertCircle className='w-8 h-8 text-red-600 dark:text-red-400' />}
						</div>

						<div>
							<h1 className='text-2xl font-bold text-foreground'>
								{status === 'loading' && 'Authenticating...'}
								{status === 'success' && 'Welcome to DayFlow!'}
								{status === 'error' && 'Authentication Failed'}
							</h1>
							<p className='text-muted-foreground mt-2'>{message}</p>
						</div>
					</div>

					{status === 'loading' && (
						<div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg'>
							<p className='text-sm text-blue-800 dark:text-blue-200'>Please wait while we complete your Google sign-in...</p>
						</div>
					)}

					{status === 'error' && (
						<div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg'>
							<p className='text-sm text-red-800 dark:text-red-200'>Something went wrong during authentication. You'll be redirected back to the sign-in page.</p>
						</div>
					)}
				</Card>
			</div>
		</div>
	);
}
