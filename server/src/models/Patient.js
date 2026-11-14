import mongoose from 'mongoose';
import { formatKolkataDateTime } from '../utils/formatters.js';

const medicineItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    dosage: {
      type: String,
      default: '',
      trim: true
    },
    days: {
      type: String,
      default: '',
      trim: true
    }
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    age: {
      type: Number,
      min: 0,
      max: 130
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: 'Phone number must be 10 digits.'
      }
    },
    weight: {
      type: String,
      default: '',
      trim: true
    },
    address: {
      type: String,
      default: '',
      trim: true
    },
    medicines: [medicineItemSchema],
    reportName: {
      type: String,
      default: '',
      trim: true
    },
    opdCharge: {
      type: Number,
      default: 0,
      min: 0
    },
    opdPaid: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: function (val) {
          const charge = typeof this.opdCharge === 'number' ? this.opdCharge : 0;
          return val <= charge;
        },
        message: 'Paid amount cannot be more than the charge.'
      }
    },
    reportCharge: {
      type: Number,
      default: 0,
      min: 0
    },
    reportPaid: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: function (val) {
          const charge = typeof this.reportCharge === 'number' ? this.reportCharge : 0;
          return val <= charge;
        },
        message: 'Paid amount cannot be more than the charge.'
      }
    },
    visitDate: {
      type: Date,
      default: Date.now
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isSample: {
      type: Boolean,
      default: false
    },
    sheetRowNumber: {
      type: Number,
      default: null
    },
    sheetSyncStatus: {
      type: String,
      default: ''
    },
    lastPaymentAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes on visitDate, phone and name
patientSchema.index({ visitDate: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ name: 1 });

// High-performance compound indexes for reports aggregation (75,000+ patients/year)
patientSchema.index({ isDeleted: 1, visitDate: -1 });
patientSchema.index({ isDeleted: 1, reportCharge: 1, visitDate: -1 });
patientSchema.index({ lastPaymentAt: -1 });

// Virtuals
patientSchema.virtual('lastPaymentAtLabel').get(function () {
  return this.lastPaymentAt ? formatKolkataDateTime(this.lastPaymentAt) : '';
});
patientSchema.virtual('opdRemaining').get(function () {
  const charge = typeof this.opdCharge === 'number' ? this.opdCharge : 0;
  const paid = typeof this.opdPaid === 'number' ? this.opdPaid : 0;
  return Math.max(0, charge - paid);
});

patientSchema.virtual('reportRemaining').get(function () {
  const charge = typeof this.reportCharge === 'number' ? this.reportCharge : 0;
  const paid = typeof this.reportPaid === 'number' ? this.reportPaid : 0;
  return Math.max(0, charge - paid);
});

patientSchema.virtual('totalRemaining').get(function () {
  return this.opdRemaining + this.reportRemaining;
});

// Guard against update operations where paid > charge
patientSchema.pre('validate', function (next) {
  if (this.opdPaid > this.opdCharge) {
    return next(new Error('Paid amount cannot be more than the charge.'));
  }
  if (this.reportPaid > this.reportCharge) {
    return next(new Error('Paid amount cannot be more than the charge.'));
  }
  next();
});

export const Patient = mongoose.model('Patient', patientSchema);
export default Patient;

