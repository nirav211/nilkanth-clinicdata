import express from 'express';
import { z } from 'zod';
import { Patient, Payment, AuditLog } from '../models/index.js';

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
  visitDate: z.string().optional()
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

    res.json({
      patients,
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

  try {
    const patient = new Patient({
      ...data,
      createdBy: req.user._id, // Logged-in user used for createdBy
      visitDate: data.visitDate ? new Date(data.visitDate) : new Date()
    });

    await patient.save();

    // Create payment records if paid > 0
    if (data.opdPaid > 0) {
      await Payment.create({
        patientId: patient._id,
        type: 'opd',
        amount: data.opdPaid,
        receivedBy: req.user._id, // Logged-in user used for receivedBy
        date: patient.visitDate
      });
    }

    if (data.reportPaid > 0) {
      await Payment.create({
        patientId: patient._id,
        type: 'report',
        amount: data.reportPaid,
        receivedBy: req.user._id,
        date: patient.visitDate
      });
    }

    // Audit log
    await AuditLog.create({
      userId: req.user._id, // Logged-in user used for AuditLog userId
      action: 'CREATE_PATIENT',
      patientId: patient._id,
      details: { name: patient.name, opdCharge: data.opdCharge, reportCharge: data.reportCharge }
    });

    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not save patient' });
  }
});

/**
 * GET /api/patients/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, isDeleted: false });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const payments = await Payment.find({ patientId: patient._id }).sort({ date: -1 });

    res.json({
      ...patient.toJSON(),
      payments
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve patient' });
  }
});

/**
 * POST /api/patients/:id/payments
 */
router.post('/:id/payments', async (req, res) => {
  const { amount, type, note } = req.body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Enter a valid payment amount.' });
  }

  if (!['opd', 'report'].includes(type)) {
    return res.status(400).json({ error: 'Invalid payment type.' });
  }

  try {
    const patient = await Patient.findOne({ _id: req.params.id, isDeleted: false });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (type === 'opd') {
      if (numAmount > patient.opdRemaining) {
        return res.status(400).json({ error: 'Paid amount cannot be more than the charge.' });
      }
      patient.opdPaid += numAmount;
    } else {
      if (numAmount > patient.reportRemaining) {
        return res.status(400).json({ error: 'Paid amount cannot be more than the charge.' });
      }
      patient.reportPaid += numAmount;
    }

    await patient.save();

    const payment = await Payment.create({
      patientId: patient._id,
      type,
      amount: numAmount,
      receivedBy: req.user._id, // Logged-in user used for receivedBy
      date: new Date()
    });

    // Audit log
    await AuditLog.create({
      userId: req.user._id, // Logged-in user used for AuditLog userId
      action: 'ADD_PAYMENT',
      patientId: patient._id,
      details: { amount: numAmount, type, note }
    });

    res.json({ patient, payment });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Payment recording failed' });
  }
});

export default router;

