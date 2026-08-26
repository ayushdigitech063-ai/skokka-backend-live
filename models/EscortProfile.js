import mongoose from 'mongoose';

const EscortProfileSchema = new mongoose.Schema(
  {
    // Human-readable ID like SK-101
    skId: {
      type: String,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    title: { type: String, trim: true },
    city: { type: String, trim: true, default: 'Jaipur' },
    location: { type: String, trim: true },
    category: {
      type: String,
      default: 'Call Girls',
      trim: true,
    },
    age: { type: Number, default: 22 },
    rating: { type: Number, default: 4.8, min: 1, max: 5 },
    rate: { type: String, default: '₹3,000 / hr' },
    price: { type: Number, default: 0 },
    availability: { type: String, default: 'Incall / Outcall' },
    tags: [{ type: String, trim: true }],
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    telegram: { type: String, trim: true },
    photoUrl: { type: String, trim: true },
    gallery: [{ type: String, trim: true }],
    description: { type: String, trim: true },

    // Placement / Package type
    packageType: {
      type: String,
      default: 'FREE_STANDARD',
      trim: true,
    },
    isVerified: { type: Boolean, default: false },
    isVip: { type: Boolean, default: false },
    isSuperTop: { type: Boolean, default: false },

    // Approval status
    status: {
      type: String,
      enum: ['APPROVED', 'PENDING_APPROVAL', 'REJECTED'],
      default: 'APPROVED',
    },

    // Who submitted (optional — for user-submitted ads)
    submittedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate unique skId like SK-101 before saving
EscortProfileSchema.pre('save', async function () {
  if (!this.skId || typeof this.skId !== 'string' || !this.skId.trim()) {
    const profiles = await mongoose.model('EscortProfile').find({ skId: /^SK-\d+$/i }).select('skId').lean();
    let maxNum = 100;
    for (const p of profiles) {
      if (p.skId) {
        const match = p.skId.match(/SK-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    let nextNum = maxNum + 1;
    let candidate = `SK-${nextNum}`;
    while (await mongoose.model('EscortProfile').exists({ skId: candidate })) {
      nextNum++;
      candidate = `SK-${nextNum}`;
    }
    this.skId = candidate;
  }
});

const EscortProfile = mongoose.model('EscortProfile', EscortProfileSchema);
export default EscortProfile;
export { EscortProfile };
