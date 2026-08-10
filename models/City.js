import mongoose from 'mongoose';
import { generateSlug } from '../utils/slugify.js';

const CitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
    },
    stateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State',
      required: [true, 'State ID is required'],
      index: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['Tier 1', 'Tier 2', 'Tier 3'],
      default: 'Tier 2',
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
    metaTitle: {
      type: String,
      default: '',
    },
    metaDescription: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate city names in the same state
CitySchema.index({ name: 1, stateId: 1 }, { unique: true });
CitySchema.index({ slug: 1, stateId: 1 }, { unique: true });

// Auto-generate slug before validation
CitySchema.pre('validate', function () {
  if (this.isModified('name') || !this.slug) {
    this.slug = generateSlug(this.name);
  }
});

// Virtual populate for Areas in this City
CitySchema.virtual('areas', {
  ref: 'Area',
  localField: '_id',
  foreignField: 'cityId',
  match: { isDeleted: false, isActive: true },
});

export default mongoose.models.City || mongoose.model('City', CitySchema);
