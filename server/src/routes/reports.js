import express from 'express';
import { Patient, Payment } from '../models/index.js';
import { formatKolkataDateTime, calculateDaysPending } from '../utils/formatters.js';

const router = express.Router();
const TIMEZONE = 'Asia/Kolkata';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Helper to build date range filter in Asia/Kolkata timezone
 */
function buildDateFilter(from, to, date, fieldName = 'visitDate') {
  const match = { isDeleted: false };
  const fromStr = from || date;
  const toStr = to || date;

  if (fromStr && !DATE_REGEX.test(fromStr)) {
    throw new Error('Invalid from date format. Use YYYY-MM-DD.');
  }
  if (toStr && !DATE_REGEX.test(toStr)) {
    throw new Error('Invalid to date format. Use YYYY-MM-DD.');
  }

  if (fromStr || toStr) {
    match[fieldName] = {};
    if (fromStr) {
      match[fieldName].$gte = new Date(`${fromStr}T00:00:00.000+05:30`);
    }
    if (toStr) {
      match[fieldName].$lte = new Date(`${toStr}T23:59:59.999+05:30`);
    }
  }

  return match;
}

/**
 * GET /api/reports/opd
 * Added daysPending (days since the visit date) to each patient.
 */
router.get('/opd', async (req, res) => {
  try {
    const { from, to, date, pending } = req.query;
    const match = buildDateFilter(from, to, date);
    const isPendingOnly = pending === 'true' || pending === true;

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          opdRemaining: {
            $max: [
              0,
              {
                $subtract: [
                  { $ifNull: ['$opdCharge', 0] },
                  { $ifNull: ['$opdPaid', 0] }
                ]
              }
            ]
          }
        }
      }
    ];

    if (isPendingOnly) {
      pipeline.push({ $match: { opdRemaining: { $gt: 0 } } });
    }

    pipeline.push({
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              opdCharge: { $sum: '$opdCharge' },
              opdPaid: { $sum: '$opdPaid' },
              opdRemaining: { $sum: '$opdRemaining' }
            }
          }
        ],
        patients: [
          { $sort: { opdRemaining: -1, visitDate: -1 } },
          {
            $project: {
              _id: 1,
              id: '$_id',
              patientId: '$_id',
              name: 1,
              patientName: '$name',
              phone: 1,
              visitDate: 1,
              opdCharge: 1,
              opdPaid: 1,
              opdRemaining: 1,
              charge: '$opdCharge',
              paid: '$opdPaid',
              remaining: '$opdRemaining',
              status: {
                $cond: [
                  { $eq: ['$opdRemaining', 0] },
                  'Settled',
                  { $cond: [{ $gt: ['$opdPaid', 0] }, 'Partial', 'Pending'] }
                ]
              }
            }
          }
        ]
      }
    });

    const result = await Patient.aggregate(pipeline);
    const facet = result[0] || { totals: [], patients: [] };
    const totalsData = facet.totals[0] || { opdCharge: 0, opdPaid: 0, opdRemaining: 0 };

    const patientsList = (facet.patients || []).map(p => ({
      ...p,
      daysPending: calculateDaysPending(p.visitDate)
    }));

    res.json({
      totals: {
        opdCharge: totalsData.opdCharge,
        opdPaid: totalsData.opdPaid,
        opdRemaining: totalsData.opdRemaining,
        charge: totalsData.opdCharge,
        paid: totalsData.opdPaid,
        remaining: totalsData.opdRemaining
      },
      patients: patientsList,
      items: patientsList
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to generate OPD report' });
  }
});

/**
 * Report charge logic handler
 * Added daysPending (days since the visit date) to each patient.
 */
async function handleReportCharge(req, res) {
  try {
    const { from, to, date, pending } = req.query;
    const match = buildDateFilter(from, to, date);
    match.reportCharge = { $gt: 0 };

    const isPendingOnly = pending === 'true' || pending === true;

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          reportRemaining: {
            $max: [
              0,
              {
                $subtract: [
                  { $ifNull: ['$reportCharge', 0] },
                  { $ifNull: ['$reportPaid', 0] }
                ]
              }
            ]
          }
        }
      }
    ];

    if (isPendingOnly) {
      pipeline.push({ $match: { reportRemaining: { $gt: 0 } } });
    }

    pipeline.push({
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              reportCharge: { $sum: '$reportCharge' },
              reportPaid: { $sum: '$reportPaid' },
              reportRemaining: { $sum: '$reportRemaining' }
            }
          }
        ],
        patients: [
          { $sort: { reportRemaining: -1, visitDate: -1 } },
          {
            $project: {
              _id: 1,
              id: '$_id',
              patientId: '$_id',
              name: 1,
              patientName: '$name',
              phone: 1,
              reportName: 1,
              visitDate: 1,
              reportCharge: 1,
              reportPaid: 1,
              reportRemaining: 1,
              charge: '$reportCharge',
              paid: '$reportPaid',
              remaining: '$reportRemaining',
              status: {
                $cond: [
                  { $eq: ['$reportRemaining', 0] },
                  'Settled',
                  { $cond: [{ $gt: ['$reportPaid', 0] }, 'Partial', 'Pending'] }
                ]
              }
            }
          }
        ]
      }
    });

    const result = await Patient.aggregate(pipeline);
    const facet = result[0] || { totals: [], patients: [] };
    const totalsData = facet.totals[0] || { reportCharge: 0, reportPaid: 0, reportRemaining: 0 };

    const patientsList = (facet.patients || []).map(p => ({
      ...p,
      daysPending: calculateDaysPending(p.visitDate)
    }));

    res.json({
      totals: {
        reportCharge: totalsData.reportCharge,
        reportPaid: totalsData.reportPaid,
        reportRemaining: totalsData.reportRemaining,
        charge: totalsData.reportCharge,
        paid: totalsData.reportPaid,
        remaining: totalsData.reportRemaining
      },
      patients: patientsList,
      items: patientsList
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to generate report charge summary' });
  }
}

router.get('/report-charge', handleReportCharge);
router.get('/charge', handleReportCharge);

/**
 * GET /api/reports/combined
 */
router.get('/combined', async (req, res) => {
  try {
    const { from, to, date } = req.query;
    const match = buildDateFilter(from, to, date);

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          opdRem: {
            $max: [
              0,
              {
                $subtract: [
                  { $ifNull: ['$opdCharge', 0] },
                  { $ifNull: ['$opdPaid', 0] }
                ]
              }
            ]
          },
          reportRem: {
            $max: [
              0,
              {
                $subtract: [
                  { $ifNull: ['$reportCharge', 0] },
                  { $ifNull: ['$reportPaid', 0] }
                ]
              }
            ]
          },
          dateStr: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$visitDate',
              timezone: TIMEZONE
            }
          }
        }
      },
      {
        $facet: {
          byDate: [
            {
              $group: {
                _id: '$dateStr',
                patientCount: { $sum: 1 },
                opdCharge: { $sum: '$opdCharge' },
                reportCharge: { $sum: '$reportCharge' },
                totalPaid: { $sum: { $add: ['$opdPaid', '$reportPaid'] } },
                totalRemaining: { $sum: { $add: ['$opdRem', '$reportRem'] } },
                opdPaid: { $sum: '$opdPaid' },
                reportPaid: { $sum: '$reportPaid' },
                totalCharge: { $sum: { $add: ['$opdCharge', '$reportCharge'] } }
              }
            },
            { $sort: { _id: -1 } },
            {
              $project: {
                _id: 0,
                date: '$_id',
                patientCount: 1,
                opdCharge: 1,
                reportCharge: 1,
                totalPaid: 1,
                totalRemaining: 1,
                opdPaid: 1,
                reportPaid: 1,
                totalCharge: 1
              }
            }
          ],
          grandTotal: [
            {
              $group: {
                _id: null,
                patientCount: { $sum: 1 },
                opdCharge: { $sum: '$opdCharge' },
                reportCharge: { $sum: '$reportCharge' },
                totalPaid: { $sum: { $add: ['$opdPaid', '$reportPaid'] } },
                totalRemaining: { $sum: { $add: ['$opdRem', '$reportRem'] } },
                opdPaid: { $sum: '$opdPaid' },
                reportPaid: { $sum: '$reportPaid' },
                totalCharge: { $sum: { $add: ['$opdCharge', '$reportCharge'] } }
              }
            },
            {
              $project: {
                _id: 0,
                patientCount: 1,
                opdCharge: 1,
                reportCharge: 1,
                totalPaid: 1,
                totalRemaining: 1,
                opdPaid: 1,
                reportPaid: 1,
                totalCharge: 1
              }
            }
          ]
        }
      }
    ];

    const result = await Patient.aggregate(pipeline);
    const facet = result[0] || { byDate: [], grandTotal: [] };
    const dateRows = facet.byDate || [];
    const grandTotalRow = facet.grandTotal[0] || {
      patientCount: 0,
      opdCharge: 0,
      reportCharge: 0,
      totalPaid: 0,
      totalRemaining: 0,
      totalCharge: 0
    };

    res.json({
      dates: dateRows,
      grandTotal: grandTotalRow,
      rows: [
        ...dateRows,
        {
          date: 'Grand Total',
          isGrandTotal: true,
          ...grandTotalRow
        }
      ],
      totals: grandTotalRow,
      items: dateRows
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to generate combined report' });
  }
});

/**
 * GET /api/reports/payments
 * Query params: optional from, to, type, mode.
 * Returns payments in range (newest first) with:
 * paidAt, paidAtLabel, patient name, phone, type, amount, mode,
 * plus totals by day, by type, by mode, and a grand total.
 */
router.get('/payments', async (req, res) => {
  try {
    const { from, to, date, type, mode } = req.query;
    const match = {};

    const fromStr = from || date;
    const toStr = to || date;

    if (fromStr && !DATE_REGEX.test(fromStr)) {
      return res.status(400).json({ error: 'Invalid from date format. Use YYYY-MM-DD.' });
    }
    if (toStr && !DATE_REGEX.test(toStr)) {
      return res.status(400).json({ error: 'Invalid to date format. Use YYYY-MM-DD.' });
    }

    if (fromStr || toStr) {
      match.paidAt = {};
      if (fromStr) {
        match.paidAt.$gte = new Date(`${fromStr}T00:00:00.000+05:30`);
      }
      if (toStr) {
        match.paidAt.$lte = new Date(`${toStr}T23:59:59.999+05:30`);
      }
    }

    if (type && ['opd', 'report'].includes(type)) {
      match.type = type;
    }

    if (mode && ['cash', 'upi', 'card', 'other'].includes(mode)) {
      match.mode = mode;
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patientDoc'
        }
      },
      {
        $unwind: {
          path: '$patientDoc',
          preserveNullAndEmptyArrays: true
        }
      },
      // Exclude payments for soft-deleted patients if any
      {
        $match: {
          'patientDoc.isDeleted': { $ne: true }
        }
      },
      {
        $addFields: {
          mode: {
            $switch: {
              branches: [
                { case: { $in: ['$mode', ['cash', 'upi', 'card', 'other']] }, then: '$mode' }
              ],
              default: 'cash'
            }
          },
          dateStr: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$paidAt',
              timezone: TIMEZONE
            }
          }
        }
      },
      {
        $facet: {
          paymentsList: [
            { $sort: { paidAt: -1, _id: -1 } },
            {
              $project: {
                _id: 1,
                id: '$_id',
                paidAt: 1,
                amount: 1,
                type: 1,
                mode: 1,
                note: 1,
                patientId: '$patientDoc._id',
                patientName: { $ifNull: ['$patientDoc.name', '—'] },
                name: { $ifNull: ['$patientDoc.name', '—'] },
                phone: { $ifNull: ['$patientDoc.phone', '—'] },
                token: '$patientDoc.token'
              }
            }
          ],
          byDay: [
            {
              $group: {
                _id: '$dateStr',
                count: { $sum: 1 },
                amount: { $sum: '$amount' },
                cash: {
                  $sum: { $cond: [{ $eq: ['$mode', 'cash'] }, '$amount', 0] }
                },
                upi: {
                  $sum: { $cond: [{ $eq: ['$mode', 'upi'] }, '$amount', 0] }
                },
                card: {
                  $sum: { $cond: [{ $eq: ['$mode', 'card'] }, '$amount', 0] }
                },
                other: {
                  $sum: { $cond: [{ $eq: ['$mode', 'other'] }, '$amount', 0] }
                }
              }
            },
            { $sort: { _id: -1 } },
            {
              $project: {
                _id: 0,
                date: '$_id',
                count: 1,
                amount: 1,
                cash: 1,
                upi: 1,
                card: 1,
                other: 1
              }
            }
          ],
          byType: [
            {
              $group: {
                _id: '$type',
                amount: { $sum: '$amount' },
                count: { $sum: 1 }
              }
            }
          ],
          byMode: [
            {
              $group: {
                _id: '$mode',
                amount: { $sum: '$amount' },
                count: { $sum: 1 }
              }
            }
          ],
          grandTotal: [
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$amount' },
                totalCount: { $sum: 1 }
              }
            }
          ]
        }
      }
    ];

    const result = await Payment.aggregate(pipeline);
    const facet = result[0] || {
      paymentsList: [],
      byDay: [],
      byType: [],
      byMode: [],
      grandTotal: []
    };

    const payments = (facet.paymentsList || []).map(p => ({
      ...p,
      paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : '',
      paidAtLabel: formatKolkataDateTime(p.paidAt)
    }));

    // Format byType
    const byTypeObj = { opd: 0, report: 0 };
    (facet.byType || []).forEach(t => {
      if (t._id) byTypeObj[t._id] = t.amount;
    });

    // Format byMode
    const byModeObj = { cash: 0, upi: 0, card: 0, other: 0 };
    (facet.byMode || []).forEach(m => {
      const modeKey = (m._id && ['cash', 'upi', 'card', 'other'].includes(m._id)) ? m._id : 'cash';
      byModeObj[modeKey] = (byModeObj[modeKey] || 0) + m.amount;
    });

    const grandTotalObj = facet.grandTotal[0] || { totalAmount: 0, totalCount: 0 };

    res.json({
      payments,
      items: payments,
      totals: {
        byDay: facet.byDay || [],
        byType: byTypeObj,
        byMode: byModeObj,
        grandTotal: grandTotalObj,
        totalAmount: grandTotalObj.totalAmount,
        totalCount: grandTotalObj.totalCount
      },
      grandTotal: grandTotalObj
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to generate payments report' });
  }
});

export default router;
