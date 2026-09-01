import sharp from 'sharp';

async function testCenterWatermark() {
  console.log("Testing Center Horizontal Crown + mycityqueen Watermark...");
  const width = 800;
  const height = 1000;
  const minDim = Math.min(width, height);
  const fontSize = Math.max(26, Math.round(minDim / 8));

  const dummyBuffer = await sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: 30, g: 41, b: 59, alpha: 1 }
    }
  }).png().toBuffer();

  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .watermark-center {
          fill: #ffffff;
          fill-opacity: 0.55;
          stroke: #000000;
          stroke-opacity: 0.35;
          stroke-width: 1.5px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: ${fontSize}px;
          font-weight: 800;
          letter-spacing: 2px;
        }
        .crown-icon {
          fill: #ffffff;
          fill-opacity: 0.55;
          stroke: #000000;
          stroke-opacity: 0.35;
          stroke-width: 1.5px;
        }
      </style>

      <g transform="translate(${width / 2}, ${height / 2})">
        <!-- Crown Icon -->
        <path class="crown-icon" transform="translate(-${fontSize * 3.2}, -${fontSize * 0.55}) scale(${fontSize / 28})" d="M2 22 L6 7 L12 15 L18 3 L24 15 L30 7 L34 22 Z" />
        <!-- mycityqueen Text -->
        <text x="${fontSize * 0.3}" y="2" text-anchor="middle" dominant-baseline="middle" class="watermark-center">
          mycityqueen
        </text>
      </g>
    </svg>
  `;

  const watermarkedBuffer = await sharp(dummyBuffer)
    .composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  console.log("✅ Center Watermark rendered successfully! Buffer size:", watermarkedBuffer.length);
}

testCenterWatermark().catch(err => console.error("❌ Error rendering center watermark:", err));
