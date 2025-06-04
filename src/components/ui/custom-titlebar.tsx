import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, X } from 'lucide-react';
import { Button } from './button';

interface CustomTitlebarProps {
	title?: string;
}

export const CustomTitlebar: React.FC<CustomTitlebarProps> = () => {
	const appWindow = getCurrentWindow();

	const handleMinimize = () => {
		appWindow.minimize();
	};

	const handleToggleMaximize = () => {
		appWindow.toggleMaximize();
	};

	const handleClose = () => {
		appWindow.close();
	};

	const handleDragRegionDoubleClick = (e: React.MouseEvent) => {
		if (e.detail === 2) {
			appWindow.toggleMaximize();
		}
	};
	return (
		<div className='flex items-center justify-between h-12 select-none fixed top-0 left-0 right-0 z-50'>
			<div 
				className='flex items-center gap-2 px-3 h-full flex-1'
				data-tauri-drag-region
				onDoubleClick={handleDragRegionDoubleClick}
			>
				{/* <img
					src="/logo.svg"
					className="w-4 h-4"
					alt="DayFlow Logo"
					draggable={false}
				/>
				<span className="text-sm font-medium text-foreground">DayFlow</span> */}
			</div>

			{/* Right side - Window Controls */}
			<div className='flex items-center h-full'>
				<Button
					onClick={handleMinimize}
					variant='ghost'
					size='sm'
					className='h-12 w-12 p-0 rounded-none hover:bg-muted/50 transition-colors'
					aria-label='Minimize'
				>
					<Minus className='h-3 w-3' />
				</Button>
				<Button
					onClick={handleToggleMaximize}
					variant='ghost'
					size='sm'
					className='h-12 w-12 p-0 rounded-none hover:bg-muted/50 transition-colors'
					aria-label='Maximize'
				>
					<div className='w-2.5 h-2.5 border border-current' />
				</Button>
				<Button
					onClick={handleClose}
					variant='ghost'
					size='sm'
					className='h-12 w-12 p-0 rounded-none hover:bg-destructive hover:text-destructive-foreground transition-colors'
					aria-label='Close'
				>
					<X  />
				</Button>
			</div>
		</div>
	);
};
