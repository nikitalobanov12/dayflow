import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<Theme>(() => {
		// Check localStorage first, then system preference
		const stored = localStorage.getItem('dayflow-theme') as Theme;
		if (stored) return stored;

		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	});

	useEffect(() => {
		const root = window.document.documentElement;

		// Remove existing theme classes
		root.classList.remove('light', 'dark');

		// Add current theme class
		root.classList.add(theme);

		// Store in localStorage
		localStorage.setItem('dayflow-theme', theme);
	}, [theme]);

	const toggleTheme = () => {
		setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
	};

	return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
}
