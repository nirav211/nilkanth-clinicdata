import mongoose from 'mongoose';
import { formatKolkataDateTime } from '../utils/formatters.js';

const paymentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    type: {
      type: String,
      enum: ['opd', 'report'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    mode: {
      type: String,
      enum: ['cash', 'upi', 'card', 'other'],
      default: 'cash'
    },
    note: {
      type: String,
      default: '',
      trim: true
    },
    paidAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    backfilled: {
      type: Boolean,
      default: false
    },
    // Keep date field synced for backwards compatibility
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for Asia/Kolkata formatted date and time
paymentSchema.virtual('paidAtLabel').get(function () {
  return formatKolkataDateTime(this.paidAt || this.date || this.createdAt);
});

// Indexes on paidAt and patientId
paymentSchema.index({ paidAt: -1 });
paymentSchema.index({ patientId: 1, paidAt: -1 });
paymentSchema.index({ mode: 1, paidAt: -1 });
paymentSchema.index({ type: 1, paidAt: -1 });

// Ensure date field matches paidAt
paymentSchema.pre('save', function (next) {
  if (this.paidAt && !this.date) {
    this.date = this.paidAt;
  }
  next();
});

export const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
