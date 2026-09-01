import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function testWatermark() {
  console.log("Testing Sharp watermark overlay...");
  const width = 800;
  const height = 1000;
  
  // Create a dummy image
  const dummyBuffer = await sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: 30, g: 41, b: 59, alpha: 1 }
    }
  }).png().toBuffer();

  const fontSize = Math.max(28, Math.round(Math.min(width, height) / 10));

  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .watermark-text {
          fill: #ffffff;
          fill-opacity: 0.28;
          font-family: Arial, Helvetica, sans-serif;
          font-size: ${fontSize}px;
          font-weight: 800;
          letter-spacing: 4px;
        }
      </style>
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="central"
        transform="rotate(-22, ${width / 2}, ${height / 2})"
        class="watermark-text"
      >
        MyCityQueen
      </text>
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

  console.log("✅ Sharp Watermark Generated Successfully! Buffer size:", watermarkedBuffer.length);
}

testWatermark().catch(err => console.error("❌ Watermark test error:", err));
