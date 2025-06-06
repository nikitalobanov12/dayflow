import { ReactNode } from 'react';
import { isTauri } from '@/lib/platform';

interface TauriConditionalProps {
	children: ReactNode;
	fallback?: ReactNode;
}

/**
 * Conditionally renders children only in Tauri environment
 * Shows fallback content (or nothing) in web environment
 */
export function TauriConditional({ children, fallback = null }: TauriConditionalProps) {
	return isTauri() ? <>{children}</> : <>{fallback}</>;
}

/**
 * Conditionally renders children only in web environment
 */
export function WebConditional({ children, fallback = null }: TauriConditionalProps) {
	return !isTauri() ? <>{children}</> : <>{fallback}</>;
}

/**
 * Platform-aware component that renders different content based on environment
 */
interface PlatformConditionalProps {
	tauri?: ReactNode;
	web?: ReactNode;
}

export function PlatformConditional({ tauri, web }: PlatformConditionalProps) {
	return isTauri() ? <>{tauri}</> : <>{web}</>;
}
