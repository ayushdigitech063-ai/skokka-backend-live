import mongoose from 'mongoose';

const SystemSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

const SystemSettings = mongoose.model('SystemSettings', SystemSettingsSchema);
export default SystemSettings;
export { SystemSettings };
