import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";
import EscortProfile from "./models/EscortProfile.js";
import { processProfileImages } from "./services/watermarkService.js";
import { autoSeedLocations } from "./utils/seedLocations.js";
import { autoSeedSuperAdmin } from "./utils/seedAdmin.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, "public", "uploads", "escorts");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://mycityqueen.com/x";

/**
 * Auto-migrate base64 images to WebP files on disk.
 * Runs in background on every server startup — safe to re-run (idempotent).
 */
const autoMigrateBase64Images = async () => {
  try {
    const profiles = await EscortProfile.find({
      $or: [
        { photoUrl: { $regex: /^data:image\//i } },
        { gallery: { $elemMatch: { $regex: /^data:image\//i } } },
      ],
    });

    if (profiles.length === 0) {
      console.log("✅ No base64 images to migrate — all clean.");
      return;
    }

    console.log(`🔄 Auto-migrating ${profiles.length} profiles with base64 images...`);
    let updated = 0;

    for (const doc of profiles) {
      let modified = false;

      // Convert photoUrl
      if (doc.photoUrl && typeof doc.photoUrl === "string" && doc.photoUrl.startsWith("data:image/")) {
        try {
          const parts = doc.photoUrl.split(";base64,");
          if (parts.length === 2) {
            const buf = Buffer.from(parts[1], "base64");
            const hash = crypto.randomBytes(8).toString("hex");
            const fname = `mig_${doc.skId || doc._id}_cover_${hash}.webp`;
            await sharp(buf)
              .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
              .webp({ quality: 85 })
              .toFile(path.join(UPLOADS_DIR, fname));
            doc.photoUrl = `${PUBLIC_BASE_URL}/uploads/escorts/${fname}`;
            modified = true;
          }
        } catch (imgErr) {
          console.warn(`  ⚠️ Could not convert photoUrl for ${doc.skId}:`, imgErr.message);
        }
      }

      // Convert gallery items
      if (Array.isArray(doc.gallery) && doc.gallery.length > 0) {
        const newGallery = [];
        for (let i = 0; i < doc.gallery.length; i++) {
          const item = doc.gallery[i];
          if (item && typeof item === "string" && item.startsWith("data:image/")) {
            try {
              const parts = item.split(";base64,");
              if (parts.length === 2) {
                const buf = Buffer.from(parts[1], "base64");
                const hash = crypto.randomBytes(8).toString("hex");
                const fname = `mig_${doc.skId || doc._id}_g${i}_${hash}.webp`;
                await sharp(buf)
                  .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
                  .webp({ quality: 85 })
                  .toFile(path.join(UPLOADS_DIR, fname));
                newGallery.push(`${PUBLIC_BASE_URL}/uploads/escorts/${fname}`);
                modified = true;
              } else {
                newGallery.push(item);
              }
            } catch (imgErr) {
              console.warn(`  ⚠️ Could not convert gallery[${i}] for ${doc.skId}:`, imgErr.message);
              newGallery.push(item);
            }
          } else {
            newGallery.push(item);
          }
        }
        doc.gallery = newGallery;
      }

      if (modified) {
        doc.markModified("photoUrl");
        doc.markModified("gallery");
        await doc.save();
        updated++;
        console.log(`  ✅ Migrated: ${doc.skId || doc._id} (${doc.name})`);
      }
    }

    console.log(`🎉 Auto-migration done! ${updated}/${profiles.length} profiles updated.`);
  } catch (err) {
    console.error("❌ Auto-migration error:", err.message);
  }
};
// Render provides process.env.PORT automatically.
// Local development will use 4000 if PORT is not defined.
const PORT = process.env.PORT || 4000;

// Auto seed default escort profiles
const autoSeedEscorts = async () => {
  try {
    const count = await EscortProfile.countDocuments();

    if (count === 0) {
      const defaults = [
        {
          skId: "SK-101",
          name: "Ananya Sharma",
          title: "Ananya Sharma - Indian VIP Companion",
          city: "Jaipur",
          location: "Jaipur (Bani Park)",
          category: "VIP Escorts",
          age: 23,
          rating: 4.9,
          rate: "₹6,000 / hr",
          price: 6000,
          availability:
            "Incall / Outcall Rates: ₹6,000 / hr (Night: ₹10,000 / night)",
          tags: ["VIP", "Independent", "Indian Companion", "Bani Park"],
          phone: "+91 98765 43210",
          whatsapp: "919876543210",
          photoUrl:
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
          gallery: [
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
          ],
          description:
            "High class Indian VIP companion in Jaipur. Available 24/7 for 5-star hotel and private appointments.",
          packageType: "VIP Featured ⭐",
          isVerified: true,
          isVip: true,
          status: "APPROVED",
        },

        {
          skId: "SK-102",
          name: "Priya Patel",
          title: "Priya Patel - College Escort",
          city: "Jaipur",
          location: "Jaipur (Malviya Nagar)",
          category: "Call Girls",
          age: 21,
          rating: 4.8,
          rate: "₹4,500 / hr",
          price: 4500,
          availability:
            "Incall / Outcall Rates: ₹4,500 / hr (Night: ₹8,000 / night)",
          tags: ["Verified", "Call Girl", "College Escort", "Malviya Nagar"],
          phone: "+91 98123 44556",
          whatsapp: "919812344556",
          photoUrl:
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
          gallery: [
            "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
          ],
          description:
            "Charming independent college model with soft personality. Top rated service in Malviya Nagar, Jaipur.",
          packageType: "Verified Listing 🛡️",
          isVerified: true,
          isVip: false,
          status: "APPROVED",
        },

        {
          skId: "SK-103",
          name: "Simran & Neha Duo",
          title: "Simran & Neha Duo Escort Service",
          city: "Jaipur",
          location: "Jaipur (C-Scheme)",
          category: "VIP Escorts",
          age: 24,
          rating: 4.9,
          rate: "₹9,000 / hr",
          price: 9000,
          availability:
            "Incall / Outcall Rates: ₹9,000 / hr (Night: ₹15,000 / night)",
          tags: ["VIP", "Duo Escort", "Luxury", "C-Scheme"],
          phone: "+91 97711 22334",
          whatsapp: "919771122334",
          photoUrl:
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
          gallery: [
            "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
          ],
          description:
            "Exclusive double companion duo escort service in C-Scheme, Jaipur. Premium luxury hospitality.",
          packageType: "VIP Featured ⭐",
          isVerified: true,
          isVip: true,
          status: "APPROVED",
        },

        {
          skId: "SK-104",
          name: "Komal Verma",
          title: "Komal Verma - Independent Model",
          city: "Jaipur",
          location: "Jaipur (Mansarovar)",
          category: "Independent Girls",
          age: 22,
          rating: 4.8,
          rate: "₹3,500 / hr",
          price: 3500,
          availability:
            "Incall / Outcall Rates: ₹3,500 / hr (Night: ₹7,000 / night)",
          tags: ["Verified", "Independent Girls", "Mansarovar"],
          phone: "+91 99887 66554",
          whatsapp: "919988766554",
          photoUrl:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
          gallery: [
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
          ],
          description:
            "Verified independent companion available in Mansarovar, Jaipur for private meetings.",
          packageType: "Verified Package 🛡️",
          isVerified: true,
          isVip: false,
          status: "APPROVED",
        },

        {
          skId: "SK-105",
          name: "Russian Elena",
          title: "Russian Elena - Foreign VIP Companion",
          city: "Jaipur",
          location: "Jaipur (Airport Road)",
          category: "Russian Escorts",
          age: 25,
          rating: 5.0,
          rate: "₹14,000 / hr",
          price: 14000,
          availability:
            "Incall / Outcall Rates: ₹14,000 / hr (Night: ₹25,000 / night)",
          tags: ["Russian", "VIP Escorts", "VIP Featured", "Airport Road"],
          phone: "+91 96543 21098",
          whatsapp: "919654321098",
          photoUrl:
            "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80",
          gallery: [
            "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80",
          ],
          description:
            "Genuine foreign Russian VIP companion on Airport Road, Jaipur. 5-Star hotel outcall specialist.",
          packageType: "VIP Featured ⭐",
          isVerified: true,
          isVip: true,
          status: "APPROVED",
        },

        {
          skId: "SK-106",
          name: "Pooja Sharma",
          title: "Pooja Sharma - Verified Independent Model",
          city: "Jaipur",
          location: "Jaipur (Vaishali Nagar)",
          category: "Call Girls",
          age: 23,
          rating: 4.9,
          rate: "₹4,000 / hr",
          price: 4000,
          availability:
            "Incall / Outcall Rates: ₹4,000 / hr (Night: ₹8,000 / night)",
          tags: ["Verified", "Call Girl", "Vaishali Nagar"],
          phone: "+91 98989 11223",
          whatsapp: "919898911223",
          photoUrl:
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
          gallery: [
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
          ],
          description:
            "Selfie verified independent model in Vaishali Nagar, Jaipur. Discrete & friendly service.",
          packageType: "Verified Package 🛡️",
          isVerified: true,
          isVip: false,
          status: "APPROVED",
        },
      ];

      const watermarkedDefaults = await Promise.all(
        defaults.map((d) => processProfileImages(d))
      );

      await EscortProfile.insertMany(watermarkedDefaults);

      console.log("🌱 Default escort profiles auto-seeded into MongoDB Atlas.");
    } else {
      console.log(`📦 Escort profiles already exist: ${count}`);
    }
  } catch (err) {
    console.error("❌ Auto seed error:", err.message);
  }
};

// Connect MongoDB first, then start server
connectDB()
  .then(async () => {
    try {
      await autoSeedEscorts();
      await autoSeedLocations();
      await autoSeedSuperAdmin();

      // Auto-migrate any remaining base64 images to file URLs (runs in background)
      autoMigrateBase64Images().catch((e) => console.error("Migration bg error:", e.message));

      const server = app.listen(PORT, "0.0.0.0", () => {
        console.log("========================================");
        console.log("🚀 Skokka Backend Started");
        console.log(`🌐 Port: ${PORT}`);
        console.log(`🔐 Environment: ${process.env.NODE_ENV || "development"}`);
        console.log("========================================");
      });

      // Handle unhandled promise rejections
      process.on("unhandledRejection", (err) => {
        console.error(`💥 Unhandled Promise Rejection: ${err.message}`);

        server.close(() => {
          process.exit(1);
        });
      });

      // Handle uncaught exceptions
      process.on("uncaughtException", (err) => {
        console.error(`💥 Uncaught Exception: ${err.message}`);

        server.close(() => {
          process.exit(1);
        });
      });
    } catch (error) {
      console.error("❌ Server startup error:", error);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  });