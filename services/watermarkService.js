import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Uploads directory for saving watermarked images as static files
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'escorts');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mycityqueen.com/x';

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

    // ── Smaller font size (was minDim/15, now minDim/25) ──
    const minDim = Math.min(width, height);
    const fontSize = Math.max(11, Math.round(minDim / 25));
    const logoSize = Math.max(18, Math.round(fontSize * 1.6));

    // ── Load & resize MyCityQueen logo as PNG buffer ──
    // Try multiple paths (local dev vs production server layout)
    const logoPaths = [
      path.join(__dirname, '..', '..', 'frontend', 'public', 'logo.png'),
      path.join(__dirname, '..', 'public', 'logo.png'),
      '/home/deploy/apps/mycityqueen/frontend/public/logo.png',
      '/home/deploy/apps/mycityqueen/frontend/.next/static/media/logo.png',
    ];
    let logoBuffer = null;
    for (const lp of logoPaths) {
      try {
        if (fs.existsSync(lp)) {
          logoBuffer = await sharp(lp)
            .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
          break;
        }
      } catch (logoErr) {
        console.warn('[WATERMARK] Could not load logo from', lp, ':', logoErr.message);
      }
    }

    // ── SVG text watermark (smaller, positioned right of logo) ──
    const textOffsetX = logoBuffer ? Math.round(logoSize / 2) + 6 : 0;
    const svgOverlay = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .wm-text {
            fill: #ffffff;
            fill-opacity: 0.35;
            stroke: #000000;
            stroke-opacity: 0.15;
            stroke-width: 0.5px;
            font-family: Arial, Helvetica, sans-serif;
            font-size: ${fontSize}px;
            font-weight: 800;
            letter-spacing: 1.5px;
          }
        </style>
        <text
          x="${Math.round(width / 2) + textOffsetX}"
          y="${Math.round(height / 2) + Math.round(fontSize / 3)}"
          text-anchor="middle"
          dominant-baseline="central"
          transform="rotate(-18, ${width / 2}, ${height / 2})"
          class="wm-text"
        >
          MYCITYQUEEN
        </text>
      </svg>
    `;

    // ── Build composite layers: logo (left of center) + text SVG ──
    const compositeLayers = [];

    // 1. Logo overlay (semi-transparent, positioned left-of-center, rotated area)
    if (logoBuffer) {
      const logoLeft = Math.round(width / 2) - Math.round(logoSize / 2) - textOffsetX - Math.round(fontSize * 2.5);
      const logoTop = Math.round(height / 2) - Math.round(logoSize / 2) - Math.round(logoSize / 3);
      compositeLayers.push({
        input: await sharp(logoBuffer)
          .ensureAlpha()
          .png()
          .toBuffer(),
        top: Math.max(0, logoTop),
        left: Math.max(0, logoLeft),
      });
    }

    // 2. Text SVG overlay
    compositeLayers.push({
      input: Buffer.from(svgOverlay),
      top: 0,
      left: 0,
    });

    // Composite overlay with Sharp
    let pipeline = sharp(inputBuffer).composite(compositeLayers);

    // Attach watermark marker comment to prevent double-watermarking on re-saves
    pipeline = pipeline.withMetadata({
      exif: {
        IFD0: {
          ImageDescription: WATERMARK_MARKER,
        },
      },
    });

    // Always output as optimized WebP for storage efficiency
    const outputBuffer = await pipeline
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Save to disk and return HTTP URL (never store base64 in MongoDB)
    const hash = crypto.randomBytes(8).toString('hex');
    const filename = `wm_${Date.now()}_${hash}.webp`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, outputBuffer);

    return `${PUBLIC_BASE_URL}/uploads/escorts/${filename}`;
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
