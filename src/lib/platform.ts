/**
 * Platform detection utilities for Tauri/Web hybrid app
 */

/**
 * Detect if the app is running in Tauri (desktop) environment
 * Uses IS_BROWSER environment variable - if set, we're in browser mode
 * If not set, we assume we're in Tauri desktop mode
 */
export const isTauri = (): boolean => {
	return !import.meta.env.IS_BROWSER;
};

/**
 * Detect if the app is running in web browser environment
 */
export const isWeb = (): boolean => {
	return !!import.meta.env.IS_BROWSER;
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
