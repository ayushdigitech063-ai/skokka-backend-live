import mongoose from 'mongoose';
import { generateSlug } from '../utils/slugify.js';

const AreaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Area name is required'],
      trim: true,
    },
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'City',
      required: [true, 'City ID is required'],
      index: true,
    },
    stateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State',
      required: [true, 'State ID is required'],
      index: true,
    },
    pincode: {
      type: String,
      trim: true,
      default: '',
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate area names in the same city
AreaSchema.index({ name: 1, cityId: 1 }, { unique: true });
AreaSchema.index({ slug: 1, cityId: 1 }, { unique: true });

// Auto-generate slug before validation
AreaSchema.pre('validate', function () {
  if (this.isModified('name') || !this.slug) {
    this.slug = generateSlug(this.name);
  }
});

export default mongoose.models.Area || mongoose.model('Area', AreaSchema);
