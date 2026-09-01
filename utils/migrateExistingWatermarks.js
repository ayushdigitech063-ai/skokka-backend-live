import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/db.js';
import EscortProfile from '../models/EscortProfile.js';
import { processProfileImages } from '../services/watermarkService.js';

async function migrateDatabaseWatermarks() {
  try {
    await connectDB();
    console.log('🔄 Checking database for content images to watermark...');

    const profiles = await EscortProfile.find({});
    console.log(`Found ${profiles.length} total profiles in database.`);

    let updatedCount = 0;
    for (const profile of profiles) {
      let modified = false;

      // Process main photo
      if (profile.photoUrl) {
        const watermarkedPhoto = await processProfileImages({ photoUrl: profile.photoUrl });
        if (watermarkedPhoto.photoUrl && watermarkedPhoto.photoUrl !== profile.photoUrl) {
          profile.photoUrl = watermarkedPhoto.photoUrl;
          modified = true;
        }
      }

      // Process gallery
      if (Array.isArray(profile.gallery) && profile.gallery.length > 0) {
        const watermarkedGallery = await processProfileImages({ gallery: profile.gallery });
        if (watermarkedGallery.gallery) {
          profile.gallery = watermarkedGallery.gallery;
          modified = true;
        }
      }

      if (modified) {
        await profile.save();
        updatedCount++;
        console.log(`✅ Applied watermark to profile: ${profile.name} (${profile.skId})`);
      }
    }

    console.log(`🎉 Migration complete! ${updatedCount} profiles were watermarked.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

if (process.argv[2] === '--run') {
  migrateDatabaseWatermarks();
}
