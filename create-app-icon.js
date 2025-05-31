import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createAppIcon() {
	const svgPath = path.join(__dirname, 'public', 'logo.svg');
	const outputPath = path.join(__dirname, 'app-icon.png');

	try {
		// Convert SVG to 1024x1024 PNG as required by Tauri
		await sharp(svgPath).resize(1024, 1024).png().toFile(outputPath);

		console.log('✅ Created app-icon.png (1024x1024) from logo.svg');
		console.log('📝 Now run: npm run tauri icon');
	} catch (error) {
		console.error('❌ Error creating app-icon.png:', error);
	}
}

createAppIcon();
