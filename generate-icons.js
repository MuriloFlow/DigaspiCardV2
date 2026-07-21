const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function generateIcons() {
  const inputPath = path.join(__dirname, "public", "lg-sem-fundo.png");
  const icon192Path = path.join(__dirname, "public", "icon-192.png");
  const icon512Path = path.join(__dirname, "public", "icon-512.png");
  const faviconPath = path.join(__dirname, "public", "favicon.ico");
  const appFaviconPath = path.join(__dirname, "src", "app", "favicon.ico");
  const appIconPath = path.join(__dirname, "src", "app", "icon.png");
  const appleIconPath = path.join(__dirname, "src", "app", "apple-icon.png");

  if (!fs.existsSync(inputPath)) {
    console.error("Input image not found");
    return;
  }

  await createPngIcon(inputPath, icon512Path, 512, 360);
  console.log("Created icon-512.png");

  await createPngIcon(inputPath, icon192Path, 192, 140);
  console.log("Created icon-192.png");

  await sharp(icon512Path).resize(192, 192).png().toFile(appIconPath);
  await sharp(icon512Path).resize(180, 180).png().toFile(appleIconPath);

  const faviconBuffers = await Promise.all(
    [16, 32, 48, 64].map((size) =>
      sharp(icon512Path).resize(size, size).png().toBuffer(),
    ),
  );
  const ico = createIco(faviconBuffers, [16, 32, 48, 64]);
  fs.writeFileSync(faviconPath, ico);
  fs.writeFileSync(appFaviconPath, ico);
  console.log("Created favicon.ico");
}

async function createPngIcon(inputPath, outputPath, size, logoSize) {
  const logoBuffer = await sharp(inputPath)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 9, g: 9, b: 11, alpha: 1 },
    },
  })
    .composite([
      {
        input: logoBuffer,
        gravity: "center",
      },
    ])
    .png()
    .toFile(outputPath);
}

function createIco(images, sizes) {
  const headerSize = 6;
  const directorySize = 16 * images.length;
  let offset = headerSize + directorySize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directories = images.map((image, index) => {
    const size = sizes[index];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.length;
    return entry;
  });

  return Buffer.concat([header, ...directories, ...images]);
}

generateIcons().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
