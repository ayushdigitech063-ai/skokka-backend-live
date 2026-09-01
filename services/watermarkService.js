import sharp from 'sharp';

/**
 * Global Centralized Watermark Processing Service for MyCityQueen
 * 
 * Requirements satisfied:
 * 1. Watermark Text: "MyCityQueen"
 * 2. Position: Exact center of the image
 * 3. Rotation: -22 degrees diagonal
 * 4. Appearance: Bold white/light gray text with ~28% opacity
 * 5. Responsive Sizing: Calculated dynamically based on image width & height
 * 6. Server-Side: Applies permanently to pixel data before DB/Public storage
 * 7. Roles: Applied identically regardless of whether uploaded by User, Admin, or Super Admin
 */

// Internal marker to prevent re-watermarking already processed images
const WATERMARK_MARKER = 'mcq_watermarked_v1';

/**
 * Helper to convert various image input types (Base64 Data URL, HTTP URL, Buffer) into a Buffer
 */
async function getBufferFromInput(input) {
  if (!input) return null;

  if (Buffer.isBuffer(input)) {
    return input;
  }

  if (typeof input === 'string') {
    const cleanInput = input.trim();
    if (!cleanInput) return null;

    // 1. Base64 Data URL (e.g. data:image/jpeg;base64,...)
    if (cleanInput.startsWith('data:image/')) {
      const parts = cleanInput.split(';base64,');
      if (parts.length === 2) {
        return Buffer.from(parts[1], 'base64');
      }
    }

    // 2. HTTP / HTTPS URL
    if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
      try {
        const response = await fetch(cleanInput);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch (err) {
        console.warn(`[WATERMARK] Could not fetch image from URL (${cleanInput}):`, err.message);
        return null;
      }
    }
  }

  return null;
}

/**
 * Applies "MyCityQueen" watermark to a single image
 * @param {string|Buffer} input - Image as Base64 Data URL, HTTP URL, or Buffer
 * @returns {Promise<string>} - Watermarked Base64 Data URL (or original input if not processable)
 */
export async function applyWatermarkToImage(input) {
  if (!input || (typeof input !== 'string' && !Buffer.isBuffer(input))) {
    return input;
  }

  // Skip static/UI assets (logos, icons, placeholders)
  if (typeof input === 'string') {
    const lower = input.toLowerCase();
    if (
      lower.includes('/images/logo') ||
      lower.includes('logo.png') ||
      lower.includes('favicon') ||
      lower.includes('icon.png') ||
      lower.includes('apple-icon')
    ) {
      return input;
    }
  }

  try {
    const inputBuffer = await getBufferFromInput(input);
    if (!inputBuffer) {
      return input;
    }

    // Inspect image metadata with Sharp
    const sharpInstance = sharp(inputBuffer);
    const metadata = await sharpInstance.metadata();

    // Check if already watermarked by inspecting EXIF/metadata comment
    if (metadata.exif || metadata.comments) {
      const commentStr = JSON.stringify(metadata.comments || metadata.exif || '');
      if (commentStr.includes(WATERMARK_MARKER)) {
        // Already watermarked, return input as-is to avoid duplicate overlays
        return input;
      }
    }

    const width = metadata.width || 800;
    const height = metadata.height || 1000;
    const format = metadata.format || 'jpeg';

    // Calculate dynamic responsive font size based on image dimensions
    // Approx 25%-30% scaling relative to image minimum dimension
    const minDim = Math.min(width, height);
    const fontSize = Math.max(22, Math.round(minDim / 10));

    // SVG Watermark Overlay
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
            text-transform: uppercase;
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

    // Composite overlay with Sharp
    let pipeline = sharp(inputBuffer).composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      },
    ]);

    // Attach watermark marker comment to prevent double-watermarking on re-saves
    pipeline = pipeline.withMetadata({
      exif: {
        IFD0: {
          ImageDescription: WATERMARK_MARKER,
        },
      },
    });

    let outputBuffer;
    let mimeType = 'image/jpeg';

    if (format === 'png') {
      outputBuffer = await pipeline.png().toBuffer();
      mimeType = 'image/png';
    } else if (format === 'webp') {
      outputBuffer = await pipeline.webp().toBuffer();
      mimeType = 'image/webp';
    } else {
      outputBuffer = await pipeline.jpeg({ quality: 90 }).toBuffer();
      mimeType = 'image/jpeg';
    }

    return `data:${mimeType};base64,${outputBuffer.toString('base64')}`;
  } catch (err) {
    console.error('[WATERMARK] ❌ Error applying watermark to image:', err.message);
    // Return original input if non-critical processing error
    return input;
  }
}

/**
 * Applies "MyCityQueen" watermark to an array of gallery images
 * @param {Array<string>} images - Array of image Data URLs or HTTP URLs
 * @returns {Promise<Array<string>>} - Array of watermarked Data URLs
 */
export async function applyWatermarkToGallery(images) {
  if (!Array.isArray(images) || images.length === 0) {
    return images || [];
  }

  const watermarkedList = await Promise.all(
    images.map((img) => applyWatermarkToImage(img))
  );

  return watermarkedList;
}

/**
 * Processes all content images in an Escort Profile payload
 * @param {Object} payload - Object containing photoUrl and/or gallery
 * @returns {Promise<Object>} - Payload with watermarked content images
 */
export async function processProfileImages(payload) {
  if (!payload || typeof payload !== 'object') return payload;

  const processed = { ...payload };

  // 1. Main Cover Photo (photoUrl)
  if (processed.photoUrl && typeof processed.photoUrl === 'string' && processed.photoUrl.trim()) {
    processed.photoUrl = await applyWatermarkToImage(processed.photoUrl);
  }

  // 2. Gallery Photos (gallery array)
  if (Array.isArray(processed.gallery) && processed.gallery.length > 0) {
    processed.gallery = await applyWatermarkToGallery(processed.gallery);
  }

  return processed;
}
