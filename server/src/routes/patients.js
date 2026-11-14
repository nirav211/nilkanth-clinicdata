import express from 'express';
import { z } from 'zod';
import { Patient, Payment, AuditLog } from '../models/index.js';
import { formatKolkataDateTime } from '../utils/formatters.js';

const router = express.Router();

const patientSchema = z.object({
  name: z.string().min(1, 'Patient name is required.'),
  age: z.coerce.number().min(0).max(130).optional().nullable(),
  phone: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits.'),
  weight: z.string().optional().default(''),
  address: z.string().optional().default(''),
  medicines: z.array(z.object({
    name: z.string().min(1),
    dosage: z.string().optional().default(''),
    days: z.string().optional().default('')
  })).optional().default([]),
  reportName: z.string().optional().default(''),
  opdCharge: z.coerce.number().min(0).default(0),
  opdPaid: z.coerce.number().min(0).default(0),
  reportCharge: z.coerce.number().min(0).default(0),
  reportPaid: z.coerce.number().min(0).default(0),
  visitDate: z.string().optional(),
  paymentMode: z.string().optional()
});

/**
 * GET /api/patients
 */
router.get('/', async (req, res) => {
  try {
    const { search = '', date = '', page = 1, limit = 12 } = req.query;
    const query = { isDeleted: false };

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { address: regex }];
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.visitDate = { $gte: start, $lte: end };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 12);
    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);

    const formattedPatients = patients.map(p => {
      const json = p.toJSON();
      return {
        ...json,
        lastPaymentAtLabel: p.lastPaymentAt ? formatKolkataDateTime(p.lastPaymentAt) : ''
      };
    });

    res.json({
      patients: formattedPatients,
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize) || 1
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patients list' });
  }
});

/**
 * POST /api/patients
 * When a patient is created with opdPaid or reportPaid > 0, also creates Payment records.
 * mode taken from paymentMode field (default "cash").
 */
router.post('/', async (req, res) => {
  const parsed = patientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid patient details' });
  }

  const data = parsed.data;

  if (data.opdPaid > data.opdCharge || data.reportPaid > data.reportCharge) {
    return res.status(400).json({ error: 'Paid amount cannot be more than the charge.' });
  }

  const rawMode = (req.body.paymentMode || req.body.mode || 'cash').toLowerCase();
  const paymentMode = ['cash', 'upi', 'card', 'other'].includes(rawMode) ? rawMode : 'cash';
  const saveTime = new Date();

  try {
    const hasInitialPayment = data.opdPaid > 0 || data.reportPaid > 0;
    const patient = new Patient({
      ...data,
      createdBy: req.user._id,
      visitDate: data.visitDate ? new Date(data.visitDate) : new Date(),
      lastPaymentAt: hasInitialPayment ? saveTime : null
    });

    await patient.save();

    // Create payment records if paid > 0 so history starts from first payment
    if (data.opdPaid > 0) {
      await Payment.create({
        patientId: patient._id,
        type: 'opd',
        amount: data.opdPaid,
        mode: paymentMode,
        paidAt: saveTime,
        date: saveTime,
        receivedBy: req.user._id,
        note: 'Initial OPD payment at registration'
      });
    }

    if (data.reportPaid > 0) {
      await Payment.create({
        patientId: patient._id,
        type: 'report',
        amount: data.reportPaid,
        mode: paymentMode,
        paidAt: saveTime,
        date: saveTime,
        receivedBy: req.user._id,
        note: 'Initial report payment at registration'
      });
    }

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE_PATIENT',
      patientId: patient._id,
      details: {
        name: patient.name,
        opdCharge: data.opdCharge,
        reportCharge: data.reportCharge,
        paymentMode,
        paidAt: saveTime
      }
    });

    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not save patient' });
  }
});

/**
 * GET /api/patients/:id
 * Returns payments newest first, with paidAt in ISO and paidAtLabel in Asia/Kolkata format.
 */
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, isDeleted: false });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const payments = await Payment.find({ patientId: patient._id })
      .sort({ paidAt: -1, date: -1, createdAt: -1 });

    const formattedPayments = payments.map(p => {
      const pDate = p.paidAt || p.date || p.createdAt;
      return {
        ...p.toJSON(),
        paidAt: pDate ? new Date(pDate).toISOString() : '',
        paidAtLabel: formatKolkataDateTime(pDate)
      };
    });

    res.json({
      ...patient.toJSON(),
      lastPaymentAtLabel: patient.lastPaymentAt ? formatKolkataDateTime(patient.lastPaymentAt) : '',
      payments: formattedPayments
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve patient' });
  }
});

/**
 * POST /api/patients/:id/payments
 * Accept amount, type, mode, note, and optional paidAt.
 * paidAt cannot be in the future and cannot be before the patient's visit date.
 * Amount cannot exceed remaining.
 * Saves paidAt in AuditLog detail.
 */
router.post('/:id/payments', async (req, res) => {
  const { amount, type, mode = 'cash', note = '', paidAt } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Enter a valid payment amount.' });
  }

  if (!['opd', 'report'].includes(type)) {
    return res.status(400).json({ error: 'Invalid payment type.' });
  }

  const rawMode = String(mode).toLowerCase();
  const paymentMode = ['cash', 'upi', 'card', 'other'].includes(rawMode) ? rawMode : 'cash';

  // Determine and validate paidAt date
  let paymentDate = new Date();
  if (paidAt) {
    paymentDate = new Date(paidAt);
    if (isNaN(paymentDate.getTime())) {
      return res.status(400).json({ error: 'Invalid payment date and time.' });
    }
  }

  // 1. paidAt cannot be in the future (allow 10 seconds margin for network skew)
  const now = new Date();
  if (paymentDate.getTime() > now.getTime() + 10000) {
    return res.status(400).json({ error: 'Payment date cannot be in the future.' });
  }

  try {
    const patient = await Patient.findOne({ _id: req.params.id, isDeleted: false });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // 2. paidAt cannot be before the patient's visit date
    // Compare full date timestamps:
    const visitDateObj = new Date(patient.visitDate);
    // Allow start of visit date in Asia/Kolkata
    const visitKolkataDay = new Date(visitDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00.000+05:30');
    if (paymentDate.getTime() < visitKolkataDay.getTime()) {
      return res.status(400).json({ error: 'Payment date cannot be before the visit date.' });
    }

    // 3. Amount cannot exceed remaining
    const remaining = type === 'opd' ? patient.opdRemaining : patient.reportRemaining;
    if (numAmount > remaining) {
      return res.status(400).json({ error: `Amount cannot be more than the remaining ₹${remaining}.` });
    }

    if (type === 'opd') {
      patient.opdPaid += numAmount;
    } else {
      patient.reportPaid += numAmount;
    }

    if (!patient.lastPaymentAt || paymentDate > patient.lastPaymentAt) {
      patient.lastPaymentAt = paymentDate;
    }

    await patient.save();

    const payment = await Payment.create({
      patientId: patient._id,
      type,
      amount: numAmount,
      mode: paymentMode,
      note: (note || '').trim(),
      paidAt: paymentDate,
      date: paymentDate,
      receivedBy: req.user._id
    });

    // Save paidAt in the AuditLog detail
    await AuditLog.create({
      userId: req.user._id,
      action: 'ADD_PAYMENT',
      patientId: patient._id,
      details: {
        amount: numAmount,
        type,
        mode: paymentMode,
        note: (note || '').trim(),
        paidAt: paymentDate
      }
    });

    const paymentJson = {
      ...payment.toJSON(),
      paidAt: payment.paidAt.toISOString(),
      paidAtLabel: formatKolkataDateTime(payment.paidAt)
    };

    res.json({
      patient: patient.toJSON(),
      payment: paymentJson
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Payment recording failed' });
  }
});

export default router;
