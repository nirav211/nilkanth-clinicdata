import React, { useState, useEffect } from 'react';
import { getCurrentUser, reportOpd, reportCharge, reportCombined, addPayment } from '../api/mockApi';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Money from '../components/Money';
import DateText from '../components/DateText';
import StatusText from '../components/StatusText';
import Input from '../components/Input';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import { Printer, Calendar, ShieldAlert } from 'lucide-react';

export function FinalReport() {
  const { showToast } = useToast();
  const user = getCurrentUser();

  const [activeTab, setActiveTab] = useState('opd'); // 'opd', 'charge', 'combined'
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({ items: [], totals: { charge: 0, paid: 0, remaining: 0 } });

  // Inline payment state per row: { [patientId]: amount }
  const [inlineAmounts, setInlineAmounts] = useState({});
  const [processingId, setProcessingId] = useState(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      let res;
      if (activeTab === 'opd') {
        res = await reportOpd({ date: dateFilter });
      } else if (activeTab === 'charge') {
        res = await reportCharge({ date: dateFilter });
      } else {
        res = await reportCombined({ date: dateFilter });
      }
      setReportData(res);
    } catch (e) {
      showToast('Could not load report data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeTab, dateFilter]);

  const handleInlineAmountChange = (patientId, val) => {
    setInlineAmounts(prev => ({ ...prev, [patientId]: val }));
  };

  const handleReceiveInline = async (item, type = 'opd') => {
    const rawAmt = inlineAmounts[item.patientId];
    const maxAllowed = type === 'opd' ? (item.remaining || item.opdRemaining) : (item.remaining || item.reportRemaining);
    const amt = rawAmt !== undefined && rawAmt !== '' ? Number(rawAmt) : maxAllowed;

    if (!amt || amt <= 0) {
      showToast('Enter a valid amount to receive.', 'amber');
      return;
    }

    if (amt > maxAllowed) {
      // Required wording: "Paid amount cannot be more than the charge."
      showToast('Paid amount cannot be more than the charge.', 'error');
      return;
    }

    setProcessingId(item.patientId);
    try {
      await addPayment(item.patientId, {
        amount: amt,
        type: type === 'report' ? 'report' : 'opd',
        note: `Payment received in final report (${type === 'opd' ? 'OPD' : 'Report'})`
      });

      // Required wording: "₹300 received from Kavita Desai."
      showToast(`₹${amt} received from ${item.patientName}.`);

      setInlineAmounts(prev => {
        const next = { ...prev };
        delete next[item.patientId];
        return next;
      });

      loadReport();
    } catch (err) {
      showToast(err.message || 'Payment could not be recorded.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const { items, totals } = reportData;

  // Columns for OPD Tab
  const opdColumns = [
    {
      title: 'Token / ID',
      key: 'patientId',
      width: '110px',
      render: (r) => (
        <div>
          <span className="font-mono text-11 bg-surface-mint text-brand px-1.5 py-0.5 rounded border border-hairline">
            #{String(r.token || 1).padStart(2, '0')}
          </span>
          <span className="font-mono text-11 text-muted block mt-0.5">{r.patientId}</span>
        </div>
      )
    },
    {
      title: 'Date',
      key: 'date',
      width: '95px',
      render: (r) => <DateText date={r.date} />
    },
    {
      title: 'Patient',
      key: 'patientName',
      render: (r) => (
        <div>
          <span className="font-medium text-ink block">{r.patientName}</span>
          <span className="font-mono text-11 text-muted">{r.phone}</span>
        </div>
      )
    },
    {
      title: 'OPD charge',
      key: 'charge',
      align: 'right',
      render: (r) => <Money amount={r.charge} />
    },
    {
      title: 'OPD paid',
      key: 'paid',
      align: 'right',
      render: (r) => <Money amount={r.paid} />
    },
    {
      title: 'OPD remaining',
      key: 'remaining',
      align: 'right',
      render: (r) => (
        <span className={r.remaining > 0 ? 'text-amber font-mono font-medium' : 'text-muted font-mono'}>
          <Money amount={r.remaining} />
        </span>
      )
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center',
      render: (r) => <StatusText status={r.status} />
    },
    {
      title: 'Receive payment',
      key: 'action',
      className: 'no-print',
      headerClassName: 'no-print',
      render: (r) => {
        if (r.remaining <= 0) {
          return <span className="text-13 text-brand font-medium">Paid in full</span>;
        }
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Input
              type="number"
              mono
              placeholder={String(r.remaining)}
              value={inlineAmounts[r.patientId] !== undefined ? inlineAmounts[r.patientId] : ''}
              onChange={(e) => handleInlineAmountChange(r.patientId, e.target.value)}
              className="w-20 py-0.5 px-2 text-13 min-h-[30px] h-[30px]"
            />
            <Button
              variant="primary"
              disabled={processingId === r.patientId}
              onClick={() => handleReceiveInline(r, 'opd')}
              className="text-13 py-0.5 px-2.5 min-h-[30px] h-[30px]"
            >
              {processingId === r.patientId ? '...' : 'Receive'}
            </Button>
          </div>
        );
      }
    }
  ];

  // Columns for Report Charge Tab
  const reportColumns = [
    {
      title: 'Token / ID',
      key: 'patientId',
      width: '110px',
      render: (r) => (
        <div>
          <span className="font-mono text-11 bg-surface-mint text-brand px-1.5 py-0.5 rounded border border-hairline">
            #{String(r.token || 1).padStart(2, '0')}
          </span>
          <span className="font-mono text-11 text-muted block mt-0.5">{r.patientId}</span>
        </div>
      )
    },
    {
      title: 'Date',
      key: 'date',
      width: '95px',
      render: (r) => <DateText date={r.date} />
    },
    {
      title: 'Patient',
      key: 'patientName',
      render: (r) => (
        <div>
          <span className="font-medium text-ink block">{r.patientName}</span>
          <span className="font-mono text-11 text-muted">{r.phone}</span>
        </div>
      )
    },
    {
      title: 'Report name',
      key: 'reportName',
      render: (r) => <span className="text-15">{r.reportName}</span>
    },
    {
      title: 'Charge',
      key: 'charge',
      align: 'right',
      render: (r) => <Money amount={r.charge} />
    },
    {
      title: 'Paid',
      key: 'paid',
      align: 'right',
      render: (r) => <Money amount={r.paid} />
    },
    {
      title: 'Remaining',
      key: 'remaining',
      align: 'right',
      render: (r) => (
        <span className={r.remaining > 0 ? 'text-amber font-mono font-medium' : 'text-muted font-mono'}>
          <Money amount={r.remaining} />
        </span>
      )
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center',
      render: (r) => <StatusText status={r.status} />
    },
    {
      title: 'Receive payment',
      key: 'action',
      className: 'no-print',
      headerClassName: 'no-print',
      render: (r) => {
        if (r.remaining <= 0) {
          return <span className="text-13 text-brand font-medium">Paid in full</span>;
        }
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Input
              type="number"
              mono
              placeholder={String(r.remaining)}
              value={inlineAmounts[r.patientId] !== undefined ? inlineAmounts[r.patientId] : ''}
              onChange={(e) => handleInlineAmountChange(r.patientId, e.target.value)}
              className="w-20 py-0.5 px-2 text-13 min-h-[30px] h-[30px]"
            />
            <Button
              variant="primary"
              disabled={processingId === r.patientId}
              onClick={() => handleReceiveInline(r, 'report')}
              className="text-13 py-0.5 px-2.5 min-h-[30px] h-[30px]"
            >
              {processingId === r.patientId ? '...' : 'Receive'}
            </Button>
          </div>
        );
      }
    }
  ];

  // Columns for Combined Tab
  const combinedColumns = [
    {
      title: 'Date',
      key: 'date',
      width: '90px',
      render: (r) => <DateText date={r.date} />
    },
    {
      title: 'Patient',
      key: 'patientName',
      render: (r) => (
        <div>
          <span className="font-medium text-ink block leading-tight">{r.patientName}</span>
          <span className="font-mono text-11 text-muted">#{String(r.token || 1).padStart(2, '0')}</span>
        </div>
      )
    },
    {
      title: 'OPD charge',
      key: 'opdCharge',
      align: 'right',
      render: (r) => <Money amount={r.opdCharge} />
    },
    {
      title: 'OPD paid',
      key: 'opdPaid',
      align: 'right',
      render: (r) => <Money amount={r.opdPaid} />
    },
    {
      title: 'Report charge',
      key: 'reportCharge',
      align: 'right',
      render: (r) => <Money amount={r.reportCharge} />
    },
    {
      title: 'Report paid',
      key: 'reportPaid',
      align: 'right',
      render: (r) => <Money amount={r.reportPaid} />
    },
    {
      title: 'Total charge',
      key: 'totalCharge',
      align: 'right',
      render: (r) => <Money amount={r.totalCharge} />
    },
    {
      title: 'Total paid',
      key: 'totalPaid',
      align: 'right',
      render: (r) => <Money amount={r.totalPaid} />
    },
    {
      title: 'Total remaining',
      key: 'totalRemaining',
      align: 'right',
      render: (r) => (
        <span className={r.totalRemaining > 0 ? 'text-amber font-mono font-medium' : 'text-muted font-mono'}>
          <Money amount={r.totalRemaining} />
        </span>
      )
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center',
      render: (r) => <StatusText status={r.status} />
    }
  ];

  const getFooterRow = () => {
    if (activeTab === 'opd') {
      return (
        <>
          <td colSpan={3} className="px-3 py-2 text-13 font-semibold text-ink">
            Totals ({items.length} records)
          </td>
          <td className="px-3 py-2 text-right font-mono font-semibold">
            <Money amount={totals.charge} />
          </td>
          <td className="px-3 py-2 text-right font-mono font-semibold text-brand">
            <Money amount={totals.paid} />
          </td>
          <td className="px-3 py-2 text-right font-mono font-semibold text-amber">
            <Money amount={totals.remaining} />
          </td>
          <td colSpan={2} className="no-print"></td>
        </>
      );
    }
    if (activeTab === 'charge') {
      return (
        <>
          <td colSpan={3} className="px-3 py-2 text-13 font-semibold text-ink">
            Totals ({items.length} reports)
          </td>
          <td className="px-3 py-2 text-right font-mono font-semibold">
            <Money amount={totals.charge} />
          </td>
          <td className="px-3 py-2 text-right font-mono font-semibold text-brand">
            <Money amount={totals.paid} />
          </td>
          <td className="px-3 py-2 text-right font-mono font-semibold text-amber">
            <Money amount={totals.remaining} />
          </td>
          <td colSpan={2} className="no-print"></td>
        </>
      );
    }
    return (
      <>
        <td colSpan={2} className="px-3 py-2 text-13 font-semibold text-ink">
          Totals ({items.length} entries)
        </td>
        <td className="px-3 py-2 text-right font-mono font-semibold">
          <Money amount={totals.opdCharge} />
        </td>
        <td className="px-3 py-2 text-right font-mono font-semibold">
          <Money amount={totals.opdPaid} />
        </td>
        <td className="px-3 py-2 text-right font-mono font-semibold">
          <Money amount={totals.reportCharge} />
        </td>
        <td className="px-3 py-2 text-right font-mono font-semibold">
          <Money amount={totals.reportPaid} />
        </td>
        <td className="px-3 py-2 text-right font-mono font-semibold">
          <Money amount={totals.charge} />
        </td>
        <td className="px-3 py-2 text-right font-mono font-semibold text-brand">
          <Money amount={totals.paid} />
        </td>
        <td className="px-3 py-2 text-right font-mono font-semibold text-amber">
          <Money amount={totals.remaining} />
        </td>
        <td></td>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Printable Clinic Header */}
      <div className="hidden print:block print-header mb-6">
        <h1 className="text-22 font-bold text-black">Nilkanth Clinic</h1>
        <p className="text-13 text-black">
          Daily Accounts & Patient Collections Ledger — Date: {dateFilter || 'All dates'}
        </p>
      </div>

      <PageHeader
        title="Final report & accounts ledger"
        subtitle="Clinic collections and accounting ledger (admin only)."
        className="no-print"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => window.print()}
              className="text-13 py-1.5 px-3 min-h-[36px]"
            >
              <Printer size={16} className="mr-1.5" />
              Print ledger
            </Button>
          </div>
        }
      />

      {/* Ruled Summary (Requirement: three totals at top: charge, paid, remaining as a ruled summary, not coloured cards) */}
      <div className="bg-surface border border-hairline rounded-[6px] p-4 sm:p-6 shadow-card">
        <div className="text-13 font-semibold text-brand tracking-tight mb-3">
          Ruled ledger balance summary — {activeTab === 'opd' ? 'OPD charge' : activeTab === 'charge' ? 'Report charge' : 'Combined'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-hairline">
          <div className="py-2 sm:py-0 sm:pr-6">
            <span className="text-13 text-muted block mb-1">Total charge</span>
            <div className="text-22 sm:text-28 font-mono font-semibold text-ink tracking-tight">
              <Money amount={totals.charge} />
            </div>
            <span className="text-13 text-muted mt-0.5 block">Total billed across records</span>
          </div>

          <div className="py-2 sm:py-0 sm:px-6">
            <span className="text-13 text-muted block mb-1">Total paid</span>
            <div className="text-22 sm:text-28 font-mono font-semibold text-brand tracking-tight">
              <Money amount={totals.paid} />
            </div>
            <span className="text-13 text-muted mt-0.5 block">Collected at counter & UPI</span>
          </div>

          <div className="py-2 sm:py-0 sm:pl-6">
            <span className="text-13 text-muted block mb-1">Total remaining</span>
            <div className="text-22 sm:text-28 font-mono font-semibold text-amber tracking-tight">
              <Money amount={totals.remaining} />
            </div>
            <span className="text-13 text-muted mt-0.5 block">Outstanding balance</span>
          </div>
        </div>
      </div>

      {/* Tabs and Date Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
        {/* Three Tabs: OPD charge, Report charge, Combined */}
        <div className="flex items-center border border-hairline rounded-[4px] p-0.5 bg-paper">
          <button
            type="button"
            onClick={() => setActiveTab('opd')}
            className={`px-3 py-1.5 text-13 font-medium rounded-[3px] transition-colors ${
              activeTab === 'opd'
                ? 'bg-surface text-brand font-semibold shadow-sm border border-hairline'
                : 'text-muted hover:text-ink'
            }`}
          >
            OPD charge
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('charge')}
            className={`px-3 py-1.5 text-13 font-medium rounded-[3px] transition-colors ${
              activeTab === 'charge'
                ? 'bg-surface text-brand font-semibold shadow-sm border border-hairline'
                : 'text-muted hover:text-ink'
            }`}
          >
            Report charge
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('combined')}
            className={`px-3 py-1.5 text-13 font-medium rounded-[3px] transition-colors ${
              activeTab === 'combined'
                ? 'bg-surface text-brand font-semibold shadow-sm border border-hairline'
                : 'text-muted hover:text-ink'
            }`}
          >
            Combined
          </button>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-13 text-muted">
            <Calendar size={14} />
            <span>Date:</span>
          </div>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-auto text-13 py-1 min-h-[32px] h-[32px]"
          />
          {dateFilter && (
            <Button
              variant="quiet"
              onClick={() => setDateFilter('')}
              className="text-13 py-1 px-2 min-h-[32px] h-[32px]"
            >
              All dates
            </Button>
          )}
        </div>
      </div>

      {/* Dense Ledger Table with Ruled Totals Row */}
      <DataTable
        columns={
          activeTab === 'opd'
            ? opdColumns
            : activeTab === 'charge'
            ? reportColumns
            : combinedColumns
        }
        data={items}
        footerRow={getFooterRow()}
        emptyMessage={loading ? 'Calculating ledger...' : 'No records found for the selected date.'}
      />
    </div>
  );
}

export default FinalReport;
