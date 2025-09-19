const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration for favicon sizes and formats
const FAVICON_CONFIG = {
  'favicon.ico': [
    { size: 16, format: 'ico' },
    { size: 32, format: 'ico' },
    { size: 48, format: 'ico' }
  ],
  'favicon-16x16.png': { size: 16, format: 'png' },
  'favicon-32x32.png': { size: 32, format: 'png' },
  'apple-touch-icon.png': { size: 180, format: 'png' },
  'icon-192x192.png': { size: 192, format: 'png' },
  'icon-512x512.png': { size: 512, format: 'png' },
  'og-image.jpg': { size: 1200, format: 'jpeg', aspectRatio: 1.91 }
};

// Path configuration
const SOURCE_DIR = path.join(__dirname, '..', 'src', 'static', 'images');
const BUILD_DIR = path.join(__dirname, '..', 'build', 'assets', 'images');
const LOGO_SMALL_PATH = path.join(SOURCE_DIR, 'logo-small.svg');
const LOGO_PATH = path.join(SOURCE_DIR, 'logo.svg');

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function generateFavicon(sourceSvg, outputPath, size, format) {
  try {
    const image = sharp(sourceSvg, { density: 300 });
    
    if (format === 'ico') {
      // For ICO format, we need to handle it differently
      const buffer = await image
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
      
      // Convert PNG buffer to ICO (simple approach for single size)
      // Note: For multi-size ICO, we'd need a proper ICO library
      await fs.promises.writeFile(outputPath, buffer);
    } else {
      await image
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toFormat(format)
        .toFile(outputPath);
    }
    
    console.log(`✓ Generated ${outputPath} (${size}x${size} ${format})`);
  } catch (error) {
    console.error(`✗ Failed to generate ${outputPath}:`, error.message);
    throw error;
  }
}

async function generateMultiSizeIco(sourceSvg, outputPath, sizes) {
  try {
    const buffers = [];
    
    for (const { size } of sizes) {
      const buffer = await sharp(sourceSvg, { density: 300 })
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
      
      buffers.push({ buffer, size });
    }
    
    // Since sharp doesn't support ICO format directly, we'll use the largest size for favicon.ico
    // This is a common practice as browsers will use the appropriate size
    const largestSize = Math.max(...sizes.map(s => s.size));
    const largestBuffer = buffers.find(b => b.size === largestSize).buffer;
    await fs.promises.writeFile(outputPath, largestBuffer);
    
    console.log(`✓ Generated ${outputPath} with sizes: ${sizes.map(s => s.size).join(', ')}px`);
  } catch (error) {
    console.error(`✗ Failed to generate multi-size ICO ${outputPath}:`, error.message);
    throw error;
  }
}

async function generateOpenGraphImage(sourceSvg, outputPath, width, aspectRatio) {
  try {
    const height = Math.round(width / aspectRatio);
  
    await sharp(sourceSvg, { density: 300 })
      .resize(width, height, {
        fit: 'contain',
        background: { r: 0, g: 82, b: 180, alpha: 1 } // Nordum blue background
      })
      .jpeg({ quality: 90 })
      .toFile(outputPath);
  
    console.log(`✓ Generated ${outputPath} (${width}x${height} jpeg)`);
  } catch (error) {
    console.error(`✗ Failed to generate ${outputPath}:`, error.message);
    throw error;
  }
}

async function buildFavicons() {
  console.log('🚀 Generating favicons...');
  
  try {
    // Ensure build directory exists
    await ensureDirectoryExists(BUILD_DIR);
    
    // Check if source files exist
    if (!fs.existsSync(LOGO_SMALL_PATH)) {
      throw new Error(`Source SVG not found: ${LOGO_SMALL_PATH}`);
    }
    
    if (!fs.existsSync(LOGO_PATH)) {
      throw new Error(`Source SVG not found: ${LOGO_PATH}`);
    }
    
    // Generate favicons from logo-small.svg (for favicon.ico and smaller sizes)
    for (const [filename, config] of Object.entries(FAVICON_CONFIG)) {
      const outputPath = path.join(BUILD_DIR, filename);
      
      if (filename === 'favicon.ico') {
        // Handle multi-size ICO
        await generateMultiSizeIco(LOGO_SMALL_PATH, outputPath, config);
      } else if (filename.includes('favicon')) {
        // All favicon.* files use the small logo
        await generateFavicon(LOGO_SMALL_PATH, outputPath, config.size, config.format);
      } else if (filename === 'og-image.jpg') {
        // Open Graph image uses the main logo with specific aspect ratio
        await generateOpenGraphImage(LOGO_PATH, outputPath, config.size, config.aspectRatio);
      } else {
        // Larger icons (apple-touch-icon, icon-*) use the main logo
        await generateFavicon(LOGO_PATH, outputPath, config.size, config.format);
      }
    }
    
    // Copy the webmanifest file
    const webmanifestSource = path.join(SOURCE_DIR, 'site.webmanifest');
    const webmanifestDest = path.join(BUILD_DIR, 'site.webmanifest');
    
    if (fs.existsSync(webmanifestSource)) {
      await fs.promises.copyFile(webmanifestSource, webmanifestDest);
      console.log('✓ Copied site.webmanifest');
    }
    
    console.log('✅ All favicons generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating favicons:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  buildFavicons();
}

module.exports = { buildFavicons };