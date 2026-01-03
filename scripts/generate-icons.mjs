import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'src-tauri', 'icons');
const sourceImage = join(__dirname, '..', '화면 캡처 2026-01-03 154219.png');

async function generateIcons() {
  try {
    // Create square icons at different sizes
    const sizes = [32, 128, 256];

    for (const size of sizes) {
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(join(iconsDir, size === 256 ? '128x128@2x.png' : `${size}x${size}.png`));

      console.log(`Generated ${size}x${size}.png`);
    }

    // Create ICO from 32x32 PNG
    const png32 = await sharp(sourceImage)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    const ico = await pngToIco(png32);
    writeFileSync(join(iconsDir, 'icon.ico'), ico);
    console.log('Generated icon.ico');

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
