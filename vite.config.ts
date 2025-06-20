import MillionLint from '@million/lint';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
	plugins: [
		react({
			babel: {
				presets: [],
				plugins: [
					['babel-plugin-react-compiler', {}]
				]
			}
		}), 
		tailwindcss(),
		// Enable MillionLint in development only with optimized settings
		process.env.NODE_ENV !== 'production' && MillionLint.vite({ 
			enabled: true,
			filter: {
				// Focus on your components for better performance insights
				include: "**/src/components/**/*.{tsx,jsx}",
				exclude: "**/node_modules/**/*"
			},
			// Enable DOM optimizations for better performance
			optimizeDOM: true
		}),
		// ESLint disabled for dev server - rely on IDE integration instead
		// Bundle analyzer - generates stats.html on build
		process.env.ANALYZE && visualizer({
			filename: 'dist/stats.html',
			open: true,
			gzipSize: true,
			brotliSize: true,
		})
	].filter(Boolean),
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
		// Optimize bundle splitting for better caching
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['react', 'react-dom'],
					ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
					supabase: ['@supabase/supabase-js'],
					calendar: ['react-big-calendar', 'date-fns'],
					dnd: ['@dnd-kit/core', '@dnd-kit/sortable']
				}
			}
		}
	},
}));
