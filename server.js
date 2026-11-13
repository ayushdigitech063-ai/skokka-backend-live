import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";
import EscortProfile from "./models/EscortProfile.js";
import { processProfileImages } from "./services/watermarkService.js";
import { autoSeedLocations } from "./utils/seedLocations.js";
import { autoSeedSuperAdmin } from "./utils/seedAdmin.js";
// Render provides process.env.PORT automatically.
// Local development will use 4000 if PORT is not defined.
const PORT = process.env.PORT || 4000;

// Auto seed default escort profiles (disabled)
const autoSeedEscorts = async () => {
  return;
};

// Connect MongoDB first, then start server
connectDB()
  .then(async () => {
    try {
      // Sample auto-seeders disabled as per requirement (only super admin seed active)
      // await autoSeedEscorts();
      // await autoSeedLocations();
      await autoSeedSuperAdmin();


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