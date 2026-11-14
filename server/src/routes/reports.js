import express from 'express';
import { Patient } from '../models/index.js';

const router = express.Router();

/**
 * GET /api/reports/opd
 */
router.get('/opd', async (req, res) => {
  try {
    const { date = '' } = req.query;
    const query = { isDeleted: false };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.visitDate = { $gte: start, $lte: end };
    }

    const patients = await Patient.find(query).sort({ visitDate: -1 });

    const items = patients.map(p => ({
      patientId: p._id,
      patientName: p.name,
      phone: p.phone,
      date: p.visitDate,
      charge: p.opdCharge,
      paid: p.opdPaid,
      remaining: p.opdRemaining,
      status: p.opdRemaining === 0 ? 'Settled' : (p.opdPaid > 0 ? 'Partial' : 'Pending')
    }));

    const totals = items.reduce(
      (acc, cur) => {
        acc.charge += cur.charge;
        acc.paid += cur.paid;
        acc.remaining += cur.remaining;
        return acc;
      },
      { charge: 0, paid: 0, remaining: 0 }
    );

    res.json({
      date: date || 'All records',
      items,
      totals
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate OPD report' });
  }
});

/**
 * GET /api/reports/charge
 */
router.get('/charge', async (req, res) => {
  try {
    const { date = '' } = req.query;
    const query = { isDeleted: false };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.visitDate = { $gte: start, $lte: end };
    }

    const patients = await Patient.find(query).sort({ visitDate: -1 });

    const items = patients
      .filter(p => p.reportCharge > 0 || p.reportName)
      .map(p => ({
        patientId: p._id,
        patientName: p.name,
        reportName: p.reportName || 'Diagnostic Report',
        phone: p.phone,
        date: p.visitDate,
        charge: p.reportCharge,
        paid: p.reportPaid,
        remaining: p.reportRemaining,
        status: p.reportRemaining === 0 ? 'Settled' : (p.reportPaid > 0 ? 'Partial' : 'Pending')
      }));

    const totals = items.reduce(
      (acc, cur) => {
        acc.charge += cur.charge;
        acc.paid += cur.paid;
        acc.remaining += cur.remaining;
        return acc;
      },
      { charge: 0, paid: 0, remaining: 0 }
    );

    res.json({
      date: date || 'All records',
      items,
      totals
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report charge summary' });
  }
});

/**
 * GET /api/reports/combined
 */
router.get('/combined', async (req, res) => {
  try {
    const { date = '' } = req.query;
    const query = { isDeleted: false };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.visitDate = { $gte: start, $lte: end };
    }

    const patients = await Patient.find(query).sort({ visitDate: -1 });

    const items = patients.map(p => {
      const totalCharge = p.opdCharge + p.reportCharge;
      const totalPaid = p.opdPaid + p.reportPaid;
      const totalRemaining = p.totalRemaining;

      return {
        patientId: p._id,
        patientName: p.name,
        phone: p.phone,
        date: p.visitDate,
        opdCharge: p.opdCharge,
        opdPaid: p.opdPaid,
        opdRemaining: p.opdRemaining,
        reportCharge: p.reportCharge,
        reportPaid: p.reportPaid,
        reportRemaining: p.reportRemaining,
        totalCharge,
        totalPaid,
        totalRemaining,
        status: totalRemaining === 0 ? 'Settled' : (totalPaid > 0 ? 'Partial' : 'Pending')
      };
    });

    const totals = items.reduce(
      (acc, cur) => {
        acc.opdCharge += cur.opdCharge;
        acc.opdPaid += cur.opdPaid;
        acc.opdRemaining += cur.opdRemaining;
        acc.reportCharge += cur.reportCharge;
        acc.reportPaid += cur.reportPaid;
        acc.reportRemaining += cur.reportRemaining;
        acc.charge += cur.totalCharge;
        acc.paid += cur.totalPaid;
        acc.remaining += cur.totalRemaining;
        return acc;
      },
      {
        opdCharge: 0,
        opdPaid: 0,
        opdRemaining: 0,
        reportCharge: 0,
        reportPaid: 0,
        reportRemaining: 0,
        charge: 0,
        paid: 0,
        remaining: 0
      }
    );

    res.json({
      date: date || 'All records',
      items,
      totals
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate combined report' });
  }
});

export default router;

