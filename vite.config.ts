import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},

	// Define environment variables for platform detection
	define: {
		'import.meta.env.IS_BROWSER': JSON.stringify(process.env.IS_BROWSER || false),
	},

	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	//
	// 1. prevent vite from obscuring rust errors
	clearScreen: false,
	// 2. tauri expects a fixed port, fail if that port is not available
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: 'ws',
					host,
					port: 1421,
			  }
			: undefined,
		watch: {
			// 3. tell vite to ignore watching `src-tauri`
			ignored: ['**/src-tauri/**'],
		},
	},

	// Build configuration for web deployment
	build: {
		// Output directory for web build
		outDir: process.env.TAURI_ENV ? 'dist' : 'dist-web',
		// Ensure compatibility with modern browsers for web deployment
		target: process.env.TAURI_ENV ? 'esnext' : 'es2015',
	},
}));
