import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CheckCircle, ArrowLeft, Mail, AlertCircle } from 'lucide-react';
import { CustomTitlebar } from '@/components/ui/custom-titlebar';

interface AuthResponse {
	data: unknown;
	error: unknown;
}

interface AuthProps {
	onSignUp: (email: string, password: string) => Promise<AuthResponse>;
	onSignIn: (email: string, password: string) => Promise<AuthResponse>;
	onGoogleSignIn: () => Promise<AuthResponse>;
	onResetPassword: (email: string) => Promise<AuthResponse>;
}

interface PasswordRequirement {
	label: string;
	test: (password: string) => boolean;
}

// Helper function to safely extract error message
const getErrorText = (error: unknown): string => {
	if (error && typeof error === 'object' && 'message' in error) {
		return String((error as { message: unknown }).message);
	}
	return 'An unexpected error occurred';
};

export function Auth({ onSignUp, onSignIn, onGoogleSignIn, onResetPassword }: AuthProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [isSignUp, setIsSignUp] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [showEmailSent, setShowEmailSent] = useState(false);
	const [sentEmail, setSentEmail] = useState('');
	const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
	const [showResetPassword, setShowResetPassword] = useState(false);
	const [resetEmail, setResetEmail] = useState('');
	const [resetEmailSent, setResetEmailSent] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);

	const passwordRequirements: PasswordRequirement[] = [
		{
			label: 'At least 6 characters',
			test: pwd => pwd.length >= 6,
		},
		{
			label: 'Contains uppercase letter (A-Z)',
			test: pwd => /[A-Z]/.test(pwd),
		},
		{
			label: 'Contains lowercase letter (a-z)',
			test: pwd => /[a-z]/.test(pwd),
		},
		{
			label: 'Contains number (0-9)',
			test: pwd => /\d/.test(pwd),
		},
		{
			label: 'Contains symbol (!@#$%^&*)',
			test: pwd => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
		},
	];

	const getPasswordStrength = (password: string) => {
		const passedRequirements = passwordRequirements.filter(req => req.test(password)).length;
		return passedRequirements;
	};

	const isPasswordValid = (password: string) => {
		return passwordRequirements.every(req => req.test(password));
	};
	const handleGoogleSignIn = async () => {
		setIsGoogleLoading(true);
		setError(null);

		try {
			const { error } = await onGoogleSignIn();
			if (error) {
				setError(getErrorMessage(getErrorText(error)));
			}
		} catch {
			setError('Failed to sign in with Google. Please try again.');
		} finally {
			setIsGoogleLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		// Validate password requirements for sign up
		if (isSignUp && !isPasswordValid(password)) {
			setError('Please ensure your password meets all requirements listed below.');
			setIsLoading(false);
			setShowPasswordRequirements(true);
			return;
		}

		try {
			const { error } = isSignUp ? await onSignUp(email, password) : await onSignIn(email, password);
			if (error) {
				setError(getErrorMessage(getErrorText(error)));
			} else if (isSignUp) {
				// For sign up, show email confirmation screen
				setSentEmail(email);
				setShowEmailSent(true);
			}
			// For sign in, the auth state change will be handled by the parent component
		} catch {
			setError('An unexpected error occurred');
		} finally {
			setIsLoading(false);
		}
	};
	const handleBackToSignIn = () => {
		setShowEmailSent(false);
		setShowResetPassword(false);
		setResetEmailSent(false);
		setIsSignUp(false);
		setEmail('');
		setPassword('');
		setResetEmail('');
		setError(null);
		setSentEmail('');
	};

	const handleResetPassword = async () => {
		if (!resetEmail.trim()) {
			setError('Please enter your email address');
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			if (onResetPassword) {
				const { error } = await onResetPassword(resetEmail);

				if (error) {
					setError(getErrorMessage(getErrorText(error)));
				} else {
					setResetEmailSent(true);
				}
			}
		} catch {
			setError('An unexpected error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	const getErrorMessage = (errorMessage: string): string => {
		// Improve error messages for better user experience
		if (errorMessage.includes('Invalid login credentials')) {
			return 'Invalid email or password. Please check your credentials and try again.';
		}
		if (errorMessage.includes('Email not confirmed')) {
			return 'Please check your email and click the confirmation link before signing in.';
		}
		if (errorMessage.includes('signup is disabled')) {
			return 'New account registration is currently disabled.';
		}
		if (errorMessage.includes('Password should be at least')) {
			return 'Password must be at least 6 characters long.';
		}
		if (errorMessage.includes('already registered')) {
			return 'An account with this email already exists. Try signing in instead.';
		}
		if (errorMessage.includes('rate limit')) {
			return 'Too many attempts. Please wait a moment before trying again.';
		}
		return errorMessage;
	};
	// Show email confirmation screen after successful sign up
	if (showEmailSent) {
		return (
			<div className='h-screen bg-background flex flex-col'>
				<CustomTitlebar title='DayFlow - Email Confirmation' />
				<div className='flex-1 flex items-center justify-center pt-8'>
					<Card className='w-full max-w-md p-6 space-y-6'>
						<div className='text-center space-y-4'>
							<div className='mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center'>
								<CheckCircle className='w-8 h-8 text-green-600 dark:text-green-400' />
							</div>

							<div>
								<h1 className='text-2xl font-bold text-foreground'>Check Your Email</h1>
								<p className='text-muted-foreground mt-2'>We've sent a confirmation link to</p>
								<p className='font-semibold text-foreground break-all'>{sentEmail}</p>
							</div>
						</div>

						<div className='bg-muted/50 p-4 rounded-lg space-y-3'>
							<div className='flex items-start gap-3'>
								<Mail className='w-5 h-5 text-primary mt-0.5 flex-shrink-0' />
								<div className='text-sm'>
									<p className='font-medium text-foreground mb-1'>Next Steps:</p>
									<ol className='text-muted-foreground space-y-1 list-decimal list-inside'>
										<li>Open your email inbox</li>
										<li>Find the email from DayFlow</li>
										<li>Click the "Confirm Account" button</li>
										<li>Return here to sign in</li>
									</ol>
								</div>
							</div>
						</div>

						<div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg'>
							<p className='text-sm text-blue-800 dark:text-blue-200'>
								<strong>Didn't receive the email?</strong> Check your spam folder or wait a few minutes. The confirmation link will expire in 24 hours.
							</p>
						</div>

						<div className='space-y-3'>
							<Button
								onClick={handleBackToSignIn}
								variant='outline'
								className='w-full'
							>
								<ArrowLeft className='w-4 h-4 mr-2' />
								Back to Sign In
							</Button>

							<button
								onClick={() => {
									setShowEmailSent(false);
									setEmail(sentEmail);
									setPassword('');
									setError(null);
								}}
								className='w-full text-sm text-primary hover:underline'
							>
								Try signing up again
							</button>
						</div>
					</Card>
				</div>
			</div>
		);
	}

	// Show password reset confirmation screen after successful reset request
	if (resetEmailSent) {
		return (
			<div className='h-screen bg-background flex flex-col'>
				<CustomTitlebar title='DayFlow - Password Reset' />
				<div className='flex-1 flex items-center justify-center pt-8'>
					<Card className='w-full max-w-md p-6 space-y-6'>
						<div className='text-center space-y-4'>
							<div className='mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center'>
								<Mail className='w-8 h-8 text-blue-600 dark:text-blue-400' />
							</div>

							<div>
								<h1 className='text-2xl font-bold text-foreground'>Reset Link Sent</h1>
								<p className='text-muted-foreground mt-2'>We've sent a password reset link to</p>
								<p className='font-semibold text-foreground break-all'>{resetEmail}</p>
							</div>
						</div>

						<div className='bg-muted/50 p-4 rounded-lg space-y-3'>
							<div className='flex items-start gap-3'>
								<Mail className='w-5 h-5 text-primary mt-0.5 flex-shrink-0' />
								<div className='text-sm'>
									<p className='font-medium text-foreground mb-1'>Next Steps:</p>
									<ol className='text-muted-foreground space-y-1 list-decimal list-inside'>
										<li>Check your email inbox</li>
										<li>Click the "Reset Password" link</li>
										<li>Enter your new password</li>
										<li>Return here to sign in</li>
									</ol>
								</div>
							</div>
						</div>

						<div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg'>
							<p className='text-sm text-amber-800 dark:text-amber-200'>
								<strong>Security Note:</strong> The reset link will expire in 1 hour for your security. If you don't see the email, check your spam folder.
							</p>
						</div>

						<Button
							onClick={handleBackToSignIn}
							variant='outline'
							className='w-full'
						>
							<ArrowLeft className='w-4 h-4 mr-2' />
							Back to Sign In
						</Button>
					</Card>
				</div>
			</div>
		);
	}

	// Show password reset form
	if (showResetPassword) {
		return (
			<div className='h-screen bg-background flex flex-col'>
				<CustomTitlebar title='DayFlow - Reset Password' />
				<div className='flex-1 flex items-center justify-center pt-8'>
					<Card className='w-full max-w-md p-6 space-y-4'>
						<div className='text-center space-y-2'>
							<h1 className='text-2xl font-bold text-foreground'>Reset Password</h1>
							<p className='text-muted-foreground'>Enter your email address and we'll send you a link to reset your password.</p>
						</div>

						<div className='space-y-3'>
							<div className='space-y-2'>
								<label
									htmlFor='reset-email'
									className='text-sm font-medium text-foreground'
								>
									Email
								</label>
								<Input
									id='reset-email'
									type='email'
									placeholder='Enter your email'
									value={resetEmail}
									onChange={e => {
										setResetEmail(e.target.value);
										setError(null);
									}}
									disabled={isLoading}
									className='w-full'
									autoComplete='email'
								/>
							</div>

							{error && (
								<div className='flex items-start space-x-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md'>
									<AlertCircle className='w-4 h-4 mt-0.5 flex-shrink-0' />
									<div>{error}</div>
								</div>
							)}

							<Button
								onClick={handleResetPassword}
								className='w-full'
								disabled={isLoading}
							>
								{isLoading ? (
									<>
										<div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2' />
										Sending Reset Link...
									</>
								) : (
									'Send Reset Link'
								)}
							</Button>

							<Button
								onClick={handleBackToSignIn}
								variant='outline'
								className='w-full'
							>
								<ArrowLeft className='w-4 h-4 mr-2' />
								Back to Sign In
							</Button>
						</div>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className='h-screen bg-background flex flex-col'>
			<CustomTitlebar title='DayFlow - Authentication' />
			<div className='flex-1 flex items-center justify-center pt-8'>
				<Card className='w-full max-w-md p-6 space-y-4'>
					<div className='text-center'>
						<h1 className='text-2xl font-bold'>Welcome to DayFlow</h1>
						<p className='text-muted-foreground'>{isSignUp ? 'Create your account' : 'Sign in to your account'}</p>
					</div>
					<form
						onSubmit={handleSubmit}
						className='space-y-3'
					>
						<div>
							<Input
								type='email'
								placeholder='Email address'
								value={email}
								onChange={e => setEmail(e.target.value)}
								required
								disabled={isLoading}
							/>
						</div>{' '}
						<div>
							<Input
								type='password'
								placeholder='Password'
								value={password}
								onChange={e => setPassword(e.target.value)}
								onFocus={() => isSignUp && setShowPasswordRequirements(true)}
								required
								disabled={isLoading}
								minLength={6}
								className={isSignUp && password && !isPasswordValid(password) ? 'border-orange-300 focus:border-orange-500' : ''}
							/>

							{isSignUp && (
								<div className='mt-3 space-y-3'>
									{/* Password Requirements */}
									<div className={`transition-all duration-300 ${showPasswordRequirements || password ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
										<div className='bg-muted/50 p-3 rounded-lg border'>
											<p className='text-sm font-medium text-foreground mb-2'>Password Requirements:</p>
											<div className='space-y-1'>
												{passwordRequirements.map((requirement, index) => {
													const isValid = requirement.test(password);
													return (
														<div
															key={index}
															className={`flex items-center gap-2 text-xs transition-colors duration-200 ${isValid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
														>
															<div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${isValid ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>{isValid ? '✓' : '○'}</div>
															<span className={isValid ? 'line-through' : ''}>{requirement.label}</span>
														</div>
													);
												})}
											</div>

											{/* Password Strength Indicator */}
											{password && (
												<div className='mt-3'>
													<div className='flex items-center gap-2 mb-1'>
														<span className='text-xs font-medium text-foreground'>Strength:</span>
														<span className={`text-xs font-medium ${getPasswordStrength(password) <= 2 ? 'text-red-600 dark:text-red-400' : getPasswordStrength(password) <= 4 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>{getPasswordStrength(password) <= 2 ? 'Weak' : getPasswordStrength(password) <= 4 ? 'Good' : 'Strong'}</span>
													</div>
													<div className='flex gap-1'>
														{[...Array(5)].map((_, i) => (
															<div
																key={i}
																className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i < getPasswordStrength(password) ? (getPasswordStrength(password) <= 2 ? 'bg-red-400' : getPasswordStrength(password) <= 4 ? 'bg-orange-400' : 'bg-green-400') : 'bg-muted'}`}
															/>
														))}
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							)}
						</div>
						{error && (
							<div className='flex items-start space-x-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md'>
								<AlertCircle className='w-4 h-4 mt-0.5 flex-shrink-0' />
								<div>{error}</div>
							</div>
						)}
						{isSignUp && (
							<div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-md'>
								<p className='text-xs text-blue-800 dark:text-blue-200'>
									<Mail className='w-4 h-4 inline mr-1' />
									We'll send you a confirmation email to verify your account.
								</p>
							</div>
						)}
						<Button
							type='submit'
							className='w-full'
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2' />
									{isSignUp ? 'Creating Account...' : 'Signing In...'}
								</>
							) : isSignUp ? (
								'Create Account'
							) : (
								'Sign In'
							)}
						</Button>
						<Button
							type='button'
							variant='outline'
							onClick={handleGoogleSignIn}
							className='w-full'
							disabled={isLoading || isGoogleLoading}
						>
							{isGoogleLoading ? (
								<>
									<div className='w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2' />
									Signing in with Google...
								</>
							) : (
								<>
									<svg
										className='w-4 h-4 mr-2'
										viewBox='0 0 24 24'
									>
										<path
											fill='#4285F4'
											d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
										/>
										<path
											fill='#34A853'
											d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
										/>
										<path
											fill='#FBBC05'
											d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
										/>
										<path
											fill='#EA4335'
											d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
										/>
									</svg>
									Continue with Google
								</>
							)}
						</Button>{' '}
					</form>

					<div className='space-y-3'>
						{!isSignUp && (
							<div className='text-center'>
								<button
									type='button'
									onClick={() => setShowResetPassword(true)}
									className='text-sm text-muted-foreground hover:text-primary hover:underline transition-colors'
									disabled={isLoading}
								>
									Forgot your password?
								</button>
							</div>
						)}

						<div className='text-center'>
							<button
								type='button'
								onClick={() => {
									setIsSignUp(!isSignUp);
									setError(null);
								}}
								className='text-sm text-primary hover:underline'
								disabled={isLoading}
							>
								{isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
							</button>
						</div>
					</div>
				</Card>
			</div>
		</div>
	);
}
