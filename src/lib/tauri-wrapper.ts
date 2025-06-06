import { isTauri } from './platform';

/**
 * Tauri API wrapper that provides web-compatible fallbacks
 * This allows the app to work both as a web app and desktop app
 */

// Lazy loading for Tauri APIs
let tauriWindowInstance: any = null;

const loadTauriWindow = async () => {
	if (isTauri() && !tauriWindowInstance) {
		try {
			const { getCurrentWindow } = await import('@tauri-apps/api/window');
			tauriWindowInstance = getCurrentWindow();
		} catch (error) {
			console.warn('Failed to load Tauri window APIs:', error);
		}
	}
	return tauriWindowInstance;
};

// Window management APIs
export const tauriWindow = {
	async minimize() {
		const window = await loadTauriWindow();
		if (window) {
			try {
				await window.minimize();
			} catch (error) {
				console.warn('Failed to minimize window:', error);
			}
		}
		// Web fallback: do nothing (browsers handle this)
	},

	async maximize() {
		const window = await loadTauriWindow();
		if (window) {
			try {
				await window.toggleMaximize();
			} catch (error) {
				console.warn('Failed to maximize window:', error);
			}
		}
		// Web fallback: do nothing (browsers handle this)
	},

	async close() {
		const window = await loadTauriWindow();
		if (window) {
			try {
				await window.close();
			} catch (error) {
				console.warn('Failed to close window:', error);
			}
		} else {
			// Web fallback: attempt to close tab/window
			window.close();
		}
	},

	async isMaximized(): Promise<boolean> {
		const window = await loadTauriWindow();
		if (window) {
			try {
				return await window.isMaximized();
			} catch (error) {
				console.warn('Failed to check if window is maximized:', error);
				return false;
			}
		}
		// Web fallback: always return false
		return false;
	},
};

// Shell/system APIs
export const tauriShell = {
	async open(url: string) {
		// For now, just use web method for both platforms
		// This ensures compatibility across web and desktop
		window.open(url, '_blank');
	},
};

// App info APIs
export const tauriApp = {
	async getVersion(): Promise<string> {
		if (isTauri()) {
			try {
				const { getVersion } = await import('@tauri-apps/api/app');
				return await getVersion();
			} catch (error) {
				console.warn('Failed to get app version:', error);
				return '1.0.0';
			}
		}
		// Web fallback: return version from package.json or environment
		return import.meta.env.VITE_APP_VERSION || '1.0.0';
	},

	async getName(): Promise<string> {
		if (isTauri()) {
			try {
				const { getName } = await import('@tauri-apps/api/app');
				return await getName();
			} catch (error) {
				console.warn('Failed to get app name:', error);
				return 'DayFlow';
			}
		}
		// Web fallback: return app name
		return 'DayFlow';
	},
};

// Notifications using web APIs only (simpler and more compatible)
export const tauriNotifications = {
	async sendNotification(title: string, body?: string) {
		if ('Notification' in window) {
			if (Notification.permission === 'granted') {
				new Notification(title, { body });
			} else if (Notification.permission !== 'denied') {
				const permission = await Notification.requestPermission();
				if (permission === 'granted') {
					new Notification(title, { body });
				}
			}
		}
	},
};

// Utility to check if Tauri features are available
export const tauriFeatures = {
	get windowControls() {
		return isTauri();
	},
	get notifications() {
		return 'Notification' in window;
	},
	get systemShell() {
		return isTauri();
	},
};
