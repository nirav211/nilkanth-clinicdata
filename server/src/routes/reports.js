import express from 'express';
import { Patient } from '../models/index.js';

const router = express.Router();
const TIMEZONE = 'Asia/Kolkata';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Helper to build date range filter in Asia/Kolkata timezone
 */
function buildDateFilter(from, to, date) {
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
    match.visitDate = {};
    if (fromStr) {
      // Midnight in Asia/Kolkata (+05:30)
      match.visitDate.$gte = new Date(`${fromStr}T00:00:00.000+05:30`);
    }
    if (toStr) {
      // End of day in Asia/Kolkata (+05:30)
      match.visitDate.$lte = new Date(`${toStr}T23:59:59.999+05:30`);
    }
  }

  return match;
}

/**
 * GET /api/reports/opd
 * Totals for OPD charge, OPD paid and OPD remaining.
 * Patient list with each patient's name, phone, visit date, OPD charge, paid and remaining.
 * Optional query pending=true to return only patients with a remaining amount.
 * Sort by largest remaining amount first.
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
    const patientsList = facet.patients || [];

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
 * Totals for report charge, report paid and report remaining.
 * Only for patients whose report charge is more than 0.
 * Optional query pending=true to return only patients with a remaining amount.
 * Sort by largest remaining amount first.
 */
async function handleReportCharge(req, res) {
  try {
    const { from, to, date, pending } = req.query;
    const match = buildDateFilter(from, to, date);
    match.reportCharge = { $gt: 0 }; // only for patients whose report charge is more than 0

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
    const patientsList = facet.patients || [];

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

// Support both /report-charge (per requirement) and /charge (legacy alias)
router.get('/report-charge', handleReportCharge);
router.get('/charge', handleReportCharge);

/**
 * GET /api/reports/combined
 * Grouped by date (Asia/Kolkata timezone), newest first, with:
 * patient count, OPD charge, report charge, total paid and total remaining,
 * plus a grand total row.
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

export default router;
