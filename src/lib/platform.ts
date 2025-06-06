/**
 * Platform detection utilities for Tauri/Web hybrid app
 */

declare global {
	interface Window {
		__TAURI__?: unknown;
	}
}

/**
 * Detect if the app is running in Tauri (desktop) environment
 */
export const isTauri = (): boolean => {
	return typeof window !== 'undefined' && window.__TAURI__ !== undefined && window.__TAURI__ !== false && window.__TAURI__ !== null;
};

/**
 * Detect if the app is running in web browser environment
 */
export const isWeb = (): boolean => {
	return !isTauri();
};

/**
 * Platform-specific feature detection
 */
export const platformFeatures = {
	hasWindowControls: isTauri(),
	hasNativeDialogs: isTauri(),
	hasAlwaysOnTop: isTauri(),
	hasWindowResize: isTauri(),
	hasNativeNotifications: isTauri(),
	hasFileSystem: isTauri(),
} as const;

/**
 * Execute code only in Tauri environment
 */
export const onTauri = (callback: () => void | Promise<void>): void => {
	if (isTauri()) {
		callback();
	}
};

/**
 * Execute code only in web environment
 */
export const onWeb = (callback: () => void | Promise<void>): void => {
	if (isWeb()) {
		callback();
	}
};

/**
 * Get platform-specific value
 */
export const platformValue = <T>(tauriValue: T, webValue: T): T => {
	return isTauri() ? tauriValue : webValue;
};
