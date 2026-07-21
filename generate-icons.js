const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const inputPath = path.join(__dirname, 'public', 'lg-sem-fundo.png');
  const icon192Path = path.join(__dirname, 'public', 'icon-192.png');
  const icon512Path = path.join(__dirname, 'public', 'icon-512.png');
  
  if (!fs.existsSync(inputPath)) {
    console.error('Input image not found');
    return;
  }

  // Create a 512x512 with dark background and centered logo (scaled to fit)
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 9, g: 9, b: 11, alpha: 1 } // #09090b
    }
  })
  .composite([
    {
      input: await sharp(inputPath).resize(360, 360, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(),
      gravity: 'center'
    }
  ])
  .png()
  .toFile(icon512Path);

  console.log('Created icon-512.png');

  // Create a 192x192 with dark background and centered logo (scaled to fit)
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 9, g: 9, b: 11, alpha: 1 } // #09090b
    }
  })
  .composite([
    {
      input: await sharp(inputPath).resize(140, 140, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(),
      gravity: 'center'
    }
  ])
  .png()
  .toFile(icon192Path);

  console.log('Created icon-192.png');
}

generateIcons().catch(console.error);
