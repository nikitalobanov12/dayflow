/**
 * Platform-aware window control APIs
 * Provides fallbacks for web environment
 */

import { isTauri } from '@/lib/platform';

// Lazy imports for Tauri APIs (only load when needed)
let tauriWindow: any = null;

const loadTauriWindow = async () => {
	if (isTauri() && !tauriWindow) {
		try {
			const { getCurrentWindow } = await import('@tauri-apps/api/window');
			tauriWindow = getCurrentWindow();
		} catch (error) {
			console.warn('Failed to load Tauri window APIs:', error);
		}
	}
	return tauriWindow;
};

export interface WindowControls {
	minimize: () => Promise<void>;
	toggleMaximize: () => Promise<void>;
	close: () => Promise<void>;
	setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>;
	setSize: (width: number, height: number) => Promise<void>;
	setPosition: (x: number, y: number) => Promise<void>;
	setResizable: (resizable: boolean) => Promise<void>;
	setDecorations: (decorations: boolean) => Promise<void>;
	setFullscreen: (fullscreen: boolean) => Promise<void>;
	center: () => Promise<void>;
	setFocus: () => Promise<void>;
	isAlwaysOnTop: () => Promise<boolean>;
	setVisibleOnAllWorkspaces: (visible: boolean) => Promise<void>;
	setMinimizable: (minimizable: boolean) => Promise<void>;
}

class TauriWindowControls implements WindowControls {
	async minimize(): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			await window.minimize();
		}
	}

	async toggleMaximize(): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			await window.toggleMaximize();
		}
	}

	async close(): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			await window.close();
		}
	}

	async setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			await window.setAlwaysOnTop(alwaysOnTop);
		}
	}

	async setSize(width: number, height: number): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			const { LogicalSize } = await import('@tauri-apps/api/dpi');
			await window.setSize(new LogicalSize(width, height));
		}
	}

	async setPosition(x: number, y: number): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			const { LogicalPosition } = await import('@tauri-apps/api/dpi');
			await window.setPosition(new LogicalPosition(x, y));
		}
	}

	async setResizable(resizable: boolean): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			await window.setResizable(resizable);
		}
	}

	async setDecorations(decorations: boolean): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			await window.setDecorations(decorations);
		}
	}

	async setFullscreen(fullscreen: boolean): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			await window.setFullscreen(fullscreen);
		}
	}

	async center(): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			await window.center();
		}
	}

	async setFocus(): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			await window.setFocus();
		}
	}

	async isAlwaysOnTop(): Promise<boolean> {
		const window = await loadTauriWindow();
		if (window) {
			return await window.isAlwaysOnTop();
		}
		return false;
	}

	async setVisibleOnAllWorkspaces(visible: boolean): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			try {
				await window.setVisibleOnAllWorkspaces(visible);
			} catch (error) {
				// Platform might not support this feature
				console.debug('setVisibleOnAllWorkspaces not supported:', error);
			}
		}
	}

	async setMinimizable(minimizable: boolean): Promise<void> {
		const window = await loadTauriWindow();
		if (window) {
			await window.setMinimizable(minimizable);
		}
	}
}

class WebWindowControls implements WindowControls {
	async minimize(): Promise<void> {
		// In web, we can't actually minimize the browser window
		console.log('Minimize requested (web environment - no action taken)');
	}

	async toggleMaximize(): Promise<void> {
		// In web, we could potentially use Fullscreen API
		if (document.fullscreenElement) {
			await document.exitFullscreen();
		} else {
			await document.documentElement.requestFullscreen();
		}
	}

	async close(): Promise<void> {
		// In web, we can only close if it was opened by script
		// Otherwise show a message to user
		if (window.history.length > 1) {
			window.history.back();
		} else {
			alert('Please close this tab manually');
		}
	}

	async setAlwaysOnTop(_alwaysOnTop: boolean): Promise<void> {
		// Not possible in web - no-op
	}

	async setSize(_width: number, _height: number): Promise<void> {
		// Not possible in web - no-op
	}

	async setPosition(_x: number, _y: number): Promise<void> {
		// Not possible in web - no-op
	}

	async setResizable(_resizable: boolean): Promise<void> {
		// Not possible in web - no-op
	}

	async setDecorations(_decorations: boolean): Promise<void> {
		// Not possible in web - no-op
	}

	async setFullscreen(fullscreen: boolean): Promise<void> {
		if (fullscreen && !document.fullscreenElement) {
			await document.documentElement.requestFullscreen();
		} else if (!fullscreen && document.fullscreenElement) {
			await document.exitFullscreen();
		}
	}

	async center(): Promise<void> {
		// Not possible in web - no-op
	}

	async setFocus(): Promise<void> {
		window.focus();
	}

	async isAlwaysOnTop(): Promise<boolean> {
		return false;
	}

	async setVisibleOnAllWorkspaces(_visible: boolean): Promise<void> {
		// Not possible in web - no-op
	}

	async setMinimizable(_minimizable: boolean): Promise<void> {
		// Not possible in web - no-op
	}
}

// Export the appropriate implementation based on platform
export const windowControls: WindowControls = isTauri() ? new TauriWindowControls() : new WebWindowControls();
