import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();

	return (
		<Button
			variant='outline'
			size='sm'
			onClick={toggleTheme}
			className='h-10 w-10 p-0 rounded-full border-border/40 bg-background/80 backdrop-blur-sm hover:bg-accent/80 hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-md group flex items-center justify-center'
			aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
		>
			<div className='relative w-5 h-5 flex items-center justify-center'>
				<Sun className={`absolute h-5 w-5 transition-all duration-300 ${theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'}`} />
				<Moon className={`absolute h-5 w-5 transition-all duration-300 ${theme === 'light' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
			</div>
		</Button>
	);
}
