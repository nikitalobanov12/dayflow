/**
 * Safe Tauri API wrappers that provide fallbacks for web environment
 */

import { isTauri } from '@/lib/platform';

// Window management fallbacks
export const safeWindowControls = {
	minimize: async () => {
		if (isTauri()) {
			try {
				const { getCurrentWindow } = await import('@tauri-apps/api/window');
				const window = getCurrentWindow();
				await window.minimize();
			} catch (error) {
				console.warn('Failed to minimize window:', error);
			}
		}
	},

	maximize: async () => {
		if (isTauri()) {
			try {
				const { getCurrentWindow } = await import('@tauri-apps/api/window');
				const window = getCurrentWindow();
				await window.maximize();
			} catch (error) {
				console.warn('Failed to maximize window:', error);
			}
		} else {
			// Web fallback using Fullscreen API
			if (document.fullscreenElement) {
				document.exitFullscreen();
			} else {
				document.documentElement.requestFullscreen();
			}
		}
	},

	close: async () => {
		if (isTauri()) {
			try {
				const { getCurrentWindow } = await import('@tauri-apps/api/window');
				const window = getCurrentWindow();
				await window.close();
			} catch (error) {
				console.warn('Failed to close window:', error);
			}
		} else {
			// Web fallback
			window.close();
		}
	},

	setAlwaysOnTop: async (enabled: boolean) => {
		if (isTauri()) {
			try {
				const { getCurrentWindow } = await import('@tauri-apps/api/window');
				const window = getCurrentWindow();
				await window.setAlwaysOnTop(enabled);
			} catch (error) {
				console.warn('Failed to set always on top:', error);
			}
		}
		// No web equivalent
	},
};

// Notification fallbacks
export const safeNotification = {
	requestPermission: async (): Promise<boolean> => {
		if (isTauri()) {
			// Tauri notifications require plugin configuration
			console.warn('Tauri notifications not configured');
			return false;
		} else {
			// Web fallback
			if ('Notification' in window) {
				const permission = await Notification.requestPermission();
				return permission === 'granted';
			}
			return false;
		}
	},

	send: async (title: string, body?: string) => {
		if (isTauri()) {
			// Tauri notifications require plugin configuration
			console.warn('Tauri notifications not configured');
		} else {
			// Web fallback
			if ('Notification' in window && Notification.permission === 'granted') {
				new Notification(title, { body });
			}
		}
	},
};

// File system fallbacks
export const safeFileSystem = {
	openUrl: async (url: string) => {
		// Use web method for both platforms - works reliably everywhere
		window.open(url, '_blank');
	},
};

// Event system fallbacks
export const safeEvents = {
	emit: async (event: string, payload?: unknown) => {
		if (isTauri()) {
			try {
				const { emit } = await import('@tauri-apps/api/event');
				await emit(event, payload);
			} catch (error) {
				console.warn('Failed to emit event:', error);
			}
		}
		// Web fallback: use custom events
		window.dispatchEvent(new CustomEvent(event, { detail: payload }));
	},

	listen: async (event: string, callback: (payload: unknown) => void) => {
		if (isTauri()) {
			try {
				const { listen } = await import('@tauri-apps/api/event');
				return await listen(event, event => callback(event.payload));
			} catch (error) {
				console.warn('Failed to listen to event:', error);
				return () => {};
			}
		} else {
			// Web fallback: use custom events
			const handler = (e: Event) => {
				const customEvent = e as CustomEvent;
				callback(customEvent.detail);
			};
			window.addEventListener(event, handler);
			return () => window.removeEventListener(event, handler);
		}
	},
};
