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
    metaTitle: {
      type: String,
      default: '',
    },
    metaDescription: {
      type: String,
      default: '',
    },
    customSlug: {
      type: String,
      trim: true,
      default: '',
    },
    canonicalUrl: {
      type: String,
      trim: true,
      default: '',
    },
    robots: {
      type: String,
      trim: true,
      default: 'index, follow',
    },
    redirectUrl: {
      type: String,
      trim: true,
      default: '',
    },
    redirectType: {
      type: String,
      enum: ['none', '301', '302'],
      default: 'none',
    },
    focusKeywords: {
      type: [String],
      default: [],
    },
    ogImage: {
      type: String,
      trim: true,
      default: '',
    },
    ogTitle: {
      type: String,
      trim: true,
      default: '',
    },
    ogDescription: {
      type: String,
      trim: true,
      default: '',
    },
    pageContent: {
      type: String,
      default: '',
    },
    customSchema: {
      type: String,
      default: '',
    },
    faqs: [
      {
        question: {
          type: String,
          trim: true,
          default: '',
        },
        answer: {
          type: String,
          trim: true,
          default: '',
        },
      },
    ],
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
  if (this.customSlug && this.customSlug.trim()) {
    this.slug = generateSlug(this.customSlug.trim());
  } else if (!this.slug || (this.isModified('name') && !this.isModified('slug'))) {
    this.slug = generateSlug(this.name);
  }
});

export default mongoose.models.Area || mongoose.model('Area', AreaSchema);
