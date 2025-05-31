import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import png2icons from 'png2icons';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateIcons() {
	const svgPath = path.join(__dirname, 'public', 'logo.svg');
	const iconDir = path.join(__dirname, 'src-tauri', 'icons');

	// Ensure the icons directory exists
	if (!fs.existsSync(iconDir)) {
		fs.mkdirSync(iconDir, { recursive: true });
	}

	try {
		// Read the SVG file
		const svgBuffer = fs.readFileSync(svgPath);

		// Generate PNG icons
		await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(iconDir, '32x32.png'));

		await sharp(svgBuffer).resize(128, 128).png().toFile(path.join(iconDir, '128x128.png'));

		await sharp(svgBuffer).resize(256, 256).png().toFile(path.join(iconDir, '128x128@2x.png'));
		// Generate a larger PNG for ICO conversion
		const iconPngBuffer = await sharp(svgBuffer).resize(256, 256).png().toBuffer();

		fs.writeFileSync(path.join(iconDir, 'icon.png'), iconPngBuffer);

		// Generate ICO file
		try {
			const icoBuffer = png2icons.createICO(iconPngBuffer, png2icons.BILINEAR, 0, false);
			fs.writeFileSync(path.join(iconDir, 'icon.ico'), icoBuffer);
			console.log('- icon.ico');
		} catch (icoError) {
			console.log('- icon.png (ICO conversion failed, you may need to convert manually)');
		}

		// Generate ICNS file
		try {
			const icnsBuffer = png2icons.createICNS(iconPngBuffer, png2icons.BILINEAR, 0);
			fs.writeFileSync(path.join(iconDir, 'icon.icns'), icnsBuffer);
			console.log('- icon.icns');
		} catch (icnsError) {
			console.log('- icon.png (ICNS conversion failed, you may need to convert manually)');
		}

		console.log('Icons generated successfully!');
		console.log('Generated files:');
		console.log('- 32x32.png');
		console.log('- 128x128.png');
		console.log('- 128x128@2x.png');
		console.log('- icon.png');
	} catch (error) {
		console.error('Error generating icons:', error);
	}
}

generateIcons();
