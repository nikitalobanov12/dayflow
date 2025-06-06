import { isTauri, isWeb } from '@/lib/platform';

export const debugPlatform = () => {
	console.log('Platform Debug Info:');
	console.log('- typeof window:', typeof window);
	console.log('- window.__TAURI__:', (window as any).__TAURI__);
	console.log('- isTauri():', isTauri());
	console.log('- isWeb():', isWeb());
	console.log('- process.env.TAURI_ENV:', process.env.TAURI_ENV);
};

// Auto-run debug in development
if (import.meta.env.DEV) {
	debugPlatform();
}
