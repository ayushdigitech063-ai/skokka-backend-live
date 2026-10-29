import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend .env configuration
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuration & CLI flags
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Parse --batch-size=<number> or default to 10
const batchArg = args.find((a) => a.startsWith('--batch-size='));
const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1], 10) : 10;

// Parse --delay-ms=<number> or default to 100ms
const delayArg = args.find((a) => a.startsWith('--delay-ms='));
const DELAY_MS = delayArg ? parseInt(delayArg.split('=')[1], 10) : 100;

// Maximum allowed dimensions and input size
const MAX_DIMENSION = 1200; // fit inside 1200x1200 without enlargement
const WEBP_QUALITY = 85;
const MAX_RAW_BASE64_BYTES = 25 * 1024 * 1024; // 25 MB max raw base64 buffer safety limit

// Determine MongoDB URI
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error(JSON.stringify({
    level: 'ERROR',
    timestamp: new Date().toISOString(),
    event: 'CONFIG_ERROR',
    message: 'MONGODB_URI is not set in environment or backend/.env file.'
  }));
  process.exit(1);
}

// Upload directory path
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'escorts');

// Determine base public URL
// Matches existing app configuration: Express serves /uploads from backend/public/uploads
function resolvePublicBaseUrl() {
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/+$/, '');
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'https://mycityqueen.com/x';
}

const PUBLIC_BASE_URL = resolvePublicBaseUrl();

// Minimal Schema to access EscortProfile collection without schema enforcement interference
const EscortProfile = mongoose.model(
  'EscortProfile',
  new mongoose.Schema({}, { strict: false, collection: 'escortprofiles' })
);

/**
 * Structured logger helper
 */
function logEvent(level, event, data = {}) {
  const logEntry = {
    level,
    timestamp: new Date().toISOString(),
    event,
    ...data
  };
  console.log(JSON.stringify(logEntry));
}

/**
 * Sleep helper for throttling
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Validates if a string is a base64 image data URL
 */
function isBase64DataUrl(str) {
  if (!str || typeof str !== 'string') return false;
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(str.trim());
}

/**
 * Converts a base64 image string to WebP file and returns the file details
 */
async function convertBase64ToWebP({ base64Str, identifier, fieldName }) {
  const trimmed = base64Str.trim();
  const commaIdx = trimmed.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('Malformed data URL: missing comma separator');
  }

  const base64Data = trimmed.slice(commaIdx + 1);
  if (!base64Data || base64Data.length === 0) {
    throw new Error('Empty Base64 payload');
  }

  // Check approximate size before buffering (base64 size * 3/4)
  const approxSize = Math.ceil((base64Data.length * 3) / 4);
  if (approxSize > MAX_RAW_BASE64_BYTES) {
    throw new Error(`Base64 image size (~${Math.round(approxSize / (1024 * 1024))}MB) exceeds maximum allowed limit (${MAX_RAW_BASE64_BYTES / (1024 * 1024)}MB)`);
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length === 0) {
    throw new Error('Decoded base64 buffer is empty');
  }

  // Validate image with Sharp metadata inspection
  const imageInstance = sharp(buffer, { failOn: 'truncated' });
  const metadata = await imageInstance.metadata();

  if (!metadata || !metadata.format) {
    throw new Error('Unsupported or unrecognizable image format');
  }

  // Generate collision-resistant unique filename
  // Format: mig_{sanitized_skId}_{field}_{timestamp}_{randomHex}.webp
  const sanitizedId = String(identifier || 'profile').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedField = String(fieldName).replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const filename = `mig_${sanitizedId}_${sanitizedField}_${timestamp}_${randomSuffix}.webp`;
  const targetFilePath = path.join(UPLOADS_DIR, filename);

  // Safety: Ensure target file doesn't already exist (collision safeguard)
  if (fs.existsSync(targetFilePath)) {
    throw new Error(`Target file unexpectedly already exists: ${filename}`);
  }

  // Convert to WebP using sharp with dimension constraints
  await imageInstance
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: WEBP_QUALITY })
    .toFile(targetFilePath);

  // Verification step: verify file exists and is non-empty
  if (!fs.existsSync(targetFilePath)) {
    throw new Error(`File conversion succeeded but output file was not found on disk: ${filename}`);
  }

  const stats = fs.statSync(targetFilePath);
  if (stats.size === 0) {
    // Remove 0-byte corrupt file
    try { fs.unlinkSync(targetFilePath); } catch (e) {}
    throw new Error(`Generated image file is 0 bytes: ${filename}`);
  }

  // Generate public URL
  const publicUrl = `${PUBLIC_BASE_URL}/uploads/escorts/${filename}`;

  return {
    filename,
    filePath: targetFilePath,
    fileSize: stats.size,
    publicUrl
  };
}

/**
 * Main migration controller
 */
async function migrate() {
  logEvent('INFO', 'MIGRATION_START', {
    mode: isDryRun ? 'DRY_RUN' : 'LIVE',
    batchSize: BATCH_SIZE,
    delayMs: DELAY_MS,
    publicBaseUrl: PUBLIC_BASE_URL,
    uploadsDir: UPLOADS_DIR
  });

  // Ensure uploads directory exists if live run
  if (!isDryRun) {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  // Connect to MongoDB
  try {
    await mongoose.connect(MONGO_URI, { autoIndex: false });
    logEvent('INFO', 'DB_CONNECTED', { host: mongoose.connection.host });
  } catch (dbErr) {
    logEvent('FATAL', 'DB_CONNECT_FAILED', { error: dbErr.message });
    process.exit(1);
  }

  // Target query to identify profiles containing Base64 images
  // Idempotent: profiles whose photoUrl and gallery elements are already URLs will not match.
  const targetQuery = {
    $or: [
      { photoUrl: { $regex: /^data:image\//i } },
      { gallery: { $elemMatch: { $regex: /^data:image\//i } } }
    ]
  };

  const totalCandidateProfiles = await EscortProfile.countDocuments(targetQuery);
  logEvent('INFO', 'CANDIDATES_FOUND', { totalCandidateProfiles });

  if (totalCandidateProfiles === 0) {
    logEvent('INFO', 'ALL_CLEAN', { message: 'No profiles with base64 images found. Nothing to migrate.' });
    await mongoose.disconnect();
    return;
  }

  let totalProfilesProcessed = 0;
  let totalProfilesUpdated = 0;
  let totalImagesConverted = 0;
  let totalImagesFailed = 0;
  let totalImagesSkipped = 0;
  const orphanedFiles = [];

  // Sequential cursor-based processing with batching to avoid loading entire collection into memory
  let hasMore = true;
  let lastProcessedMongoId = null;

  while (hasMore) {
    // Build query with cursor pagination on _id
    const query = { ...targetQuery };
    if (lastProcessedMongoId) {
      query._id = { $gt: lastProcessedMongoId };
    }

    const batch = await EscortProfile.find(query)
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .lean();

    if (!batch || batch.length === 0) {
      hasMore = false;
      break;
    }

    for (const doc of batch) {
      lastProcessedMongoId = doc._id;
      totalProfilesProcessed++;

      const profileIdentifier = doc.skId || String(doc._id);
      const updates = {};
      let docNeedsUpdate = false;
      const createdFilesThisDoc = [];

      // ─── 1. Process photoUrl ──────────────────────────────────────
      if (doc.photoUrl) {
        if (typeof doc.photoUrl === 'string' && isBase64DataUrl(doc.photoUrl)) {
          if (isDryRun) {
            totalImagesConverted++;
            logEvent('INFO', 'IMAGE_DRY_RUN', {
              profileId: profileIdentifier,
              mongoId: String(doc._id),
              field: 'photoUrl',
              status: 'WOULD_CONVERT'
            });
          } else {
            try {
              const result = await convertBase64ToWebP({
                base64Str: doc.photoUrl,
                identifier: profileIdentifier,
                fieldName: 'cover'
              });
              createdFilesThisDoc.push(result.filePath);
              updates.photoUrl = result.publicUrl;
              docNeedsUpdate = true;
              totalImagesConverted++;

              logEvent('INFO', 'IMAGE_CONVERTED', {
                profileId: profileIdentifier,
                mongoId: String(doc._id),
                field: 'photoUrl',
                status: 'SUCCESS',
                filename: result.filename,
                sizeBytes: result.fileSize
              });
            } catch (convErr) {
              totalImagesFailed++;
              logEvent('WARN', 'IMAGE_FAILED', {
                profileId: profileIdentifier,
                mongoId: String(doc._id),
                field: 'photoUrl',
                status: 'FAILED',
                error: convErr.message
              });
              // Original base64 preserved in DB because updates.photoUrl is NOT set
            }
          }
        } else {
          // Already an HTTP URL or clean string
          totalImagesSkipped++;
        }
      }

      // ─── 2. Process gallery array ─────────────────────────────────
      if (Array.isArray(doc.gallery) && doc.gallery.length > 0) {
        const newGallery = [];
        let galleryModified = false;

        for (let i = 0; i < doc.gallery.length; i++) {
          const item = doc.gallery[i];
          if (typeof item === 'string' && isBase64DataUrl(item)) {
            if (isDryRun) {
              totalImagesConverted++;
              newGallery.push('[WOULD_CONVERT_WEBP_URL]');
              logEvent('INFO', 'IMAGE_DRY_RUN', {
                profileId: profileIdentifier,
                mongoId: String(doc._id),
                field: `gallery[${i}]`,
                status: 'WOULD_CONVERT'
              });
            } else {
              try {
                const result = await convertBase64ToWebP({
                  base64Str: item,
                  identifier: profileIdentifier,
                  fieldName: `g${i}`
                });
                createdFilesThisDoc.push(result.filePath);
                newGallery.push(result.publicUrl);
                galleryModified = true;
                totalImagesConverted++;

                logEvent('INFO', 'IMAGE_CONVERTED', {
                  profileId: profileIdentifier,
                  mongoId: String(doc._id),
                  field: `gallery[${i}]`,
                  status: 'SUCCESS',
                  filename: result.filename,
                  sizeBytes: result.fileSize
                });
              } catch (convErr) {
                // Preserve original Base64 item on failure
                totalImagesFailed++;
                newGallery.push(item);
                logEvent('WARN', 'IMAGE_FAILED', {
                  profileId: profileIdentifier,
                  mongoId: String(doc._id),
                  field: `gallery[${i}]`,
                  status: 'FAILED',
                  error: convErr.message
                });
              }
            }
          } else {
            // Already an HTTP URL, null, or non-base64: preserve as-is at exact index
            newGallery.push(item);
            totalImagesSkipped++;
          }
        }

        if (galleryModified && !isDryRun) {
          updates.gallery = newGallery;
          docNeedsUpdate = true;
        }
      }

      // ─── 3. Atomic DB Update ──────────────────────────────────────
      if (docNeedsUpdate && !isDryRun) {
        try {
          const updateResult = await EscortProfile.updateOne(
            { _id: doc._id },
            { $set: updates }
          );

          if (updateResult.modifiedCount > 0 || updateResult.acknowledged) {
            totalProfilesUpdated++;
            logEvent('INFO', 'PROFILE_SAVED', {
              profileId: profileIdentifier,
              mongoId: String(doc._id),
              fieldsUpdated: Object.keys(updates)
            });
          } else {
            throw new Error('MongoDB updateOne returned unacknowledged or 0 modified');
          }
        } catch (dbSaveErr) {
          logEvent('ERROR', 'DB_UPDATE_FAILED', {
            profileId: profileIdentifier,
            mongoId: String(doc._id),
            error: dbSaveErr.message,
            message: 'Database update failed. Original base64 in MongoDB remains untouched.'
          });

          // Files were written to disk but database was not updated.
          // DO NOT delete them now (rule 4: do not automatically delete files during migration).
          // Log them as orphaned files for auditing / cleanup.
          for (const fpath of createdFilesThisDoc) {
            orphanedFiles.push({
              profileId: profileIdentifier,
              mongoId: String(doc._id),
              filePath: fpath
            });
            logEvent('WARN', 'ORPHANED_FILE_LOGGED', {
              profileId: profileIdentifier,
              filePath: fpath,
              actionRequired: 'Manual audit/cleanup recommended'
            });
          }
        }
      }

      // Apply throttling delay between documents
      if (DELAY_MS > 0) {
        await sleep(DELAY_MS);
      }
    }
  }

  // Summary report
  logEvent('INFO', 'MIGRATION_SUMMARY', {
    mode: isDryRun ? 'DRY_RUN' : 'LIVE',
    totalCandidateProfiles,
    totalProfilesProcessed,
    totalProfilesUpdated: isDryRun ? 0 : totalProfilesUpdated,
    totalImagesConverted,
    totalImagesFailed,
    totalImagesSkipped,
    orphanedFilesCount: orphanedFiles.length,
    orphanedFiles: orphanedFiles.length > 0 ? orphanedFiles : undefined
  });

  await mongoose.disconnect();
  logEvent('INFO', 'DB_DISCONNECTED', { message: 'Database disconnected cleanly.' });
}

// Execute migration script
migrate().catch((fatalErr) => {
  logEvent('FATAL', 'UNHANDLED_EXCEPTION', { error: fatalErr.stack || fatalErr.message });
  try { mongoose.disconnect(); } catch (e) {}
  process.exit(1);
});
