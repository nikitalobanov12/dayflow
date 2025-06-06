/**
 * Environment configuration for platform-specific behavior
 */

import { isTauri, isWeb } from './platform';

interface EnvironmentConfig {
	// Database configuration
	preferLocalDatabase: boolean;
	supabaseUrl: string | null;
	supabaseAnonKey: string | null;

	// Feature flags
	enableWindowControls: boolean;
	enableAlwaysOnTop: boolean;
	enableSprintModes: boolean;
	enableFileOperations: boolean;
	enableNativeNotifications: boolean;

	// UI configuration
	showTitlebar: boolean;
	enableFullscreenToggle: boolean;
	enableDragRegion: boolean;

	// Performance
	enableOptimisticUpdates: boolean;
	batchUpdateInterval: number;
}

const createEnvironmentConfig = (): EnvironmentConfig => {
	const platform = isTauri() ? 'tauri' : 'web';

	// Base configuration that works for both platforms
	const baseConfig: EnvironmentConfig = {
		// Database - Supabase works for both platforms
		preferLocalDatabase: false,
		supabaseUrl: import.meta.env.VITE_SUPABASE_URL || null,
		supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || null,

		// Features that work everywhere
		enableOptimisticUpdates: true,
		batchUpdateInterval: 1000,

		// Platform-specific features
		enableWindowControls: platform === 'tauri',
		enableAlwaysOnTop: platform === 'tauri',
		enableSprintModes: platform === 'tauri', // Keep sprint modes Tauri-only for now
		enableFileOperations: platform === 'tauri',
		enableNativeNotifications: platform === 'tauri',

		// UI configuration
		showTitlebar: platform === 'tauri',
		enableFullscreenToggle: true, // Works in both (Fullscreen API in web)
		enableDragRegion: platform === 'tauri',
	};

	return baseConfig;
};

// Export singleton instance
export const env = createEnvironmentConfig();

// Helper functions for common checks
export const canUseWindowControls = () => env.enableWindowControls;
export const canUseSprintModes = () => env.enableSprintModes;
export const shouldShowTitlebar = () => env.showTitlebar;
export const canUseAlwaysOnTop = () => env.enableAlwaysOnTop;

// Database configuration helpers
export const getDatabaseConfig = () => ({
	useSupabase: !env.preferLocalDatabase || isWeb(),
	useLocalSQLite: env.preferLocalDatabase && isTauri(),
	supabaseUrl: env.supabaseUrl,
	supabaseAnonKey: env.supabaseAnonKey,
});

// Development helpers
export const isDevelopment = () => import.meta.env.DEV;
export const isProduction = () => import.meta.env.PROD;
