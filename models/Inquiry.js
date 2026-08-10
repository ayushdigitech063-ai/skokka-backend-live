import mongoose from 'mongoose';

const InquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      default: 'General Support Desk',
    },
    subject: {
      type: String,
      default: 'Customer Inquiry',
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['UNREAD', 'RESOLVED', 'SPAM'],
      default: 'UNREAD',
    },
  },
  { timestamps: true }
);

export default mongoose.models.Inquiry || mongoose.model('Inquiry', InquirySchema);
