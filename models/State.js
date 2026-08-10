import mongoose from 'mongoose';
import { generateSlug } from '../utils/slugify.js';

const StateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'State name is required'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
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

// Auto-generate slug before validation
StateSchema.pre('validate', function () {
  if (this.isModified('name') || !this.slug) {
    this.slug = generateSlug(this.name);
  }
});

// Virtual populate for Cities in this State
StateSchema.virtual('cities', {
  ref: 'City',
  localField: '_id',
  foreignField: 'stateId',
  match: { isDeleted: false, isActive: true },
});

export default mongoose.models.State || mongoose.model('State', StateSchema);
