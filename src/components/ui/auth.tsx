import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { CustomTitlebar } from '@/components/ui/custom-titlebar';
import { CheckCircle, Mail, ArrowLeft } from 'lucide-react';

interface AuthProps {
	onSignUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
	onSignIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
}

interface PasswordRequirement {
	label: string;
	test: (password: string) => boolean;
}

export function Auth({ onSignUp, onSignIn }: AuthProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [isSignUp, setIsSignUp] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [showEmailSent, setShowEmailSent] = useState(false);
	const [sentEmail, setSentEmail] = useState('');
	const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

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
			test: pwd => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
		},
	];

	const getPasswordStrength = (password: string) => {
		const passedRequirements = passwordRequirements.filter(req => req.test(password)).length;
		return passedRequirements;
	};

	const isPasswordValid = (password: string) => {
		return passwordRequirements.every(req => req.test(password));
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
				setError(error.message);
			} else if (isSignUp) {
				// For sign up, show email confirmation screen
				setSentEmail(email);
				setShowEmailSent(true);
			}
			// For sign in, the auth state change will be handled by the parent component
		} catch (err) {
			setError('An unexpected error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	const handleBackToSignIn = () => {
		setShowEmailSent(false);
		setIsSignUp(false);
		setEmail('');
		setPassword('');
		setError(null);
		setSentEmail('');
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
	return (
		<div className='h-screen bg-background flex flex-col'>
			<CustomTitlebar title='DayFlow - Authentication' />
			<div className='flex-1 flex items-center justify-center pt-8'>
				<Card className='w-full max-w-md p-6 space-y-6'>
					<div className='text-center'>
						<h1 className='text-2xl font-bold'>Welcome to DayFlow</h1>
						<p className='text-muted-foreground'>{isSignUp ? 'Create your account' : 'Sign in to your account'}</p>
					</div>

					<form
						onSubmit={handleSubmit}
						className='space-y-4'
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
						{error && <div className='text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md'>{error}</div>}
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
					</form>

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
				</Card>
			</div>
		</div>
	);
}
