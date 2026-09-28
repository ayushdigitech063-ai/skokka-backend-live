import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skokka';
const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mycityqueen.com/x';

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'escorts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Minimal Schema to query profiles
const EscortSchema = new mongoose.Schema({}, { strict: false });
const EscortProfile = mongoose.model('EscortProfile', EscortSchema);

async function processBase64(base64Str, filenamePrefix) {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image/')) {
    return base64Str; // Return as-is if already a URL or empty
  }

  try {
    const parts = base64Str.split(';base64,');
    if (parts.length !== 2) return base64Str;

    const buffer = Buffer.from(parts[1], 'base64');
    const filename = `${filenamePrefix}_${Date.now()}.webp`;
    const filepath = path.join(uploadsDir, filename);

    // Convert to optimized WebP image (max width 1200px, 85% quality)
    await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(filepath);

    const publicUrl = `${PUBLIC_BASE_URL}/uploads/escorts/${filename}`;
    return publicUrl;
  } catch (err) {
    console.error(`❌ Failed to convert Base64 for ${filenamePrefix}:`, err.message);
    return base64Str;
  }
}

async function runMigration() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  const profiles = await EscortProfile.find({
    $or: [
      { photoUrl: { $regex: /^data:image\// } },
      { gallery: { $elemMatch: { $regex: /^data:image\// } } }
    ]
  });

  console.log(`📦 Found ${profiles.length} profiles with Base64 image data.`);

  let updatedCount = 0;

  for (const doc of profiles) {
    const skId = doc.skId || doc._id.toString();
    console.log(`\n⏳ Processing profile: ${skId} (${doc.name})...`);

    let isModified = false;

    // 1. Process cover photoUrl
    if (doc.photoUrl && doc.photoUrl.startsWith('data:image/')) {
      const newUrl = await processBase64(doc.photoUrl, `${skId}_cover`);
      if (newUrl !== doc.photoUrl) {
        doc.photoUrl = newUrl;
        isModified = true;
        console.log(`   📸 Converted photoUrl -> ${newUrl}`);
      }
    }

    // 2. Process gallery array
    if (Array.isArray(doc.gallery) && doc.gallery.length > 0) {
      const newGallery = [];
      for (let i = 0; i < doc.gallery.length; i++) {
        const item = doc.gallery[i];
        if (item && item.startsWith('data:image/')) {
          const newUrl = await processBase64(item, `${skId}_gallery_${i}`);
          newGallery.push(newUrl);
          isModified = true;
        } else {
          newGallery.push(item);
        }
      }
      doc.gallery = newGallery;
      console.log(`   🖼️ Converted ${newGallery.length} gallery images.`);
    }

    if (isModified) {
      doc.markModified('photoUrl');
      doc.markModified('gallery');
      await doc.save();
      updatedCount++;
      console.log(`✅ Saved profile ${skId}`);
    }
  }

  console.log(`\n🎉 Migration Complete! Total profiles updated: ${updatedCount}`);
  await mongoose.disconnect();
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('🔥 Migration Script Error:', err);
  process.exit(1);
});
