import sharp from 'sharp';
import { applyWatermarkToImage, processProfileImages } from '../services/watermarkService.js';

async function testFullWatermarkPipeline() {
  console.log("🚀 Testing MyCityQueen Global Watermark System Pipeline...");

  // 1. Create a dummy unwatermarked image buffer
  const sampleBuffer = await sharp({
    create: {
      width: 1200,
      height: 1600,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }
    }
  }).jpeg().toBuffer();

  const rawDataUrl = `data:image/jpeg;base64,${sampleBuffer.toString('base64')}`;

  console.log("📸 Original image payload size:", rawDataUrl.length);

  // 2. Test single image watermark
  const watermarkedUrl = await applyWatermarkToImage(rawDataUrl);
  console.log("✨ Watermarked image result created! Payload size:", watermarkedUrl.length);

  // Verify result is a valid base64 data url
  if (!watermarkedUrl.startsWith('data:image/jpeg;base64,')) {
    throw new Error("Result is not a valid base64 Data URL!");
  }

  // 3. Test full Escort Profile payload processing
  const testPayload = {
    name: "Test Escort Model",
    city: "Jaipur",
    photoUrl: rawDataUrl,
    gallery: [rawDataUrl, rawDataUrl],
  };

  const processedPayload = await processProfileImages(testPayload);

  if (!processedPayload.photoUrl.startsWith('data:image/') || processedPayload.gallery.length !== 2) {
    throw new Error("Failed to watermark profile photoUrl or gallery!");
  }

  console.log("✅ ALL WATERMARK TESTS PASSED SUCCESSFULLY! 👑");
}

testFullWatermarkPipeline().catch((err) => {
  console.error("❌ Watermark test failed:", err);
  process.exit(1);
});
