import React, { useState, useEffect, useRef } from 'react';
import { listPatients, getPatient, addPayment } from '../api/mockApi';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Money from '../components/Money';
import DateText from '../components/DateText';
import StatusText from '../components/StatusText';
import Input from '../components/Input';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { Search, X, Calendar, ChevronLeft, ChevronRight, Phone, MapPin, Printer, UserCheck, Stethoscope, HeartPulse } from 'lucide-react';

export function Patients() {
  const { showToast } = useToast();
  const searchInputRef = useRef(null);

  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Side panel state
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [showRxModal, setShowRxModal] = useState(false);

  // Inline payment in side panel
  const [payAmount, setPayAmount] = useState('');
  const [payType, setPayType] = useState('opd');
  const [payNote, setPayNote] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  // Keyboard shortcut: "/" focuses search box
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await listPatients({
        search,
        date: dateFilter,
        page,
        limit: 12
      });
      setPatients(res.patients);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      showToast('Could not load patient list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, dateFilter, page]);

  useEffect(() => {
    if (!selectedPatientId) {
      setSelectedPatient(null);
      return;
    }
    let isCurrent = true;
    setPanelLoading(true);
    getPatient(selectedPatientId)
      .then(p => {
        if (isCurrent) {
          setSelectedPatient(p);
          if (p.opdRemaining > 0) setPayType('opd');
          else if (p.reportRemaining > 0) setPayType('report');
        }
      })
      .catch(() => {
        showToast('Could not load patient record.', 'error');
      })
      .finally(() => {
        if (isCurrent) setPanelLoading(false);
      });

    return () => { isCurrent = false; };
  }, [selectedPatientId]);

  const handleReceivePayment = async (e) => {
    e.preventDefault();
    setPayError('');
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      setPayError('Enter a valid amount.');
      return;
    }

    if (payType === 'opd' && amt > selectedPatient.opdRemaining) {
      // Required wording: "Paid amount cannot be more than the charge."
      setPayError('Paid amount cannot be more than the charge.');
      return;
    }

    if (payType === 'report' && amt > selectedPatient.reportRemaining) {
      // Required wording: "Paid amount cannot be more than the charge."
      setPayError('Paid amount cannot be more than the charge.');
      return;
    }

    setPaying(true);
    try {
      const res = await addPayment(selectedPatient.id, {
        amount: amt,
        type: payType,
        note: payNote
      });
      // Required wording: "₹300 received from Kavita Desai."
      showToast(`₹${amt} received from ${selectedPatient.name}.`);
      setSelectedPatient(res.patient);
      setPayAmount('');
      setPayNote('');
      loadData();
    } catch (err) {
      setPayError(err.message || 'Payment could not be recorded.');
    } finally {
      setPaying(false);
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  // Quick stats
  const totalBilled = patients.reduce((s, p) => s + (p.opdCharge || 0) + (p.reportCharge || 0), 0);
  const totalCollected = patients.reduce((s, p) => s + (p.opdPaid || 0) + (p.reportPaid || 0), 0);
  const totalOutstanding = patients.reduce((s, p) => s + (p.opdRemaining || 0) + (p.reportRemaining || 0), 0);

  const columns = [
    {
      title: 'Token / ID',
      key: 'id',
      width: '110px',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-full bg-surface-mint text-brand font-mono font-semibold text-11 flex items-center justify-center border border-hairline">
            #{String(row.token || 1).padStart(2, '0')}
          </span>
          <span className="font-mono text-11 text-muted">{row.id}</span>
        </div>
      )
    },
    {
      title: 'Date',
      key: 'visitDate',
      width: '95px',
      render: (row) => <DateText date={row.visitDate} />
    },
    {
      title: 'Patient name & diagnosis',
      key: 'name',
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink text-15 hover:text-brand transition-colors">
              {row.name}
            </span>
            <span className="text-11 text-muted font-normal">
              {row.age ? `${row.age}y` : ''} {row.gender ? `(${row.gender[0]})` : ''}
            </span>
          </div>
          {row.diagnosis && (
            <span className="text-11 text-muted truncate block max-w-xs">
              {row.diagnosis}
            </span>
          )}
        </div>
      )
    },
    {
      title: 'Phone',
      key: 'phone',
      render: (row) => <span className="font-mono text-13">{row.phone}</span>
    },
    {
      title: 'OPD charge',
      key: 'opdCharge',
      align: 'right',
      render: (row) => <Money amount={row.opdCharge} />
    },
    {
      title: 'OPD paid',
      key: 'opdPaid',
      align: 'right',
      render: (row) => <Money amount={row.opdPaid} />
    },
    {
      title: 'OPD remaining',
      key: 'opdRemaining',
      align: 'right',
      render: (row) => (
        <span className={row.opdRemaining > 0 ? 'text-amber font-mono font-medium' : 'text-muted font-mono'}>
          <Money amount={row.opdRemaining} />
        </span>
      )
    },
    {
      title: 'Report charge',
      key: 'reportCharge',
      align: 'right',
      render: (row) => <Money amount={row.reportCharge} />
    },
    {
      title: 'Report paid',
      key: 'reportPaid',
      align: 'right',
      render: (row) => <Money amount={row.reportPaid} />
    },
    {
      title: 'Report remaining',
      key: 'reportRemaining',
      align: 'right',
      render: (row) => (
        <span className={row.reportRemaining > 0 ? 'text-amber font-mono font-medium' : 'text-muted font-mono'}>
          <Money amount={row.reportRemaining} />
        </span>
      )
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center',
      render: (row) => {
        const totalRem = row.opdRemaining + row.reportRemaining;
        const totalPaid = row.opdPaid + row.reportPaid;
        const st = totalRem === 0 ? 'Settled' : (totalPaid > 0 ? 'Partial' : 'Pending');
        return <StatusText status={st} />;
      }
    }
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Patients register & clinical ledger"
        subtitle="Daily register of check-ups, doctor prescriptions and accounts."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => window.location.href = '/add'}
              className="text-13 py-1.5 px-3 min-h-[36px]"
            >
              + New patient
            </Button>
          </div>
        }
      />

      {/* Ruled Mini Stats for Active Desk */}
      <div className="bg-surface border border-hairline rounded-[6px] p-3.5 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-hairline shadow-card">
        <div className="py-1 sm:py-0 sm:pr-4 flex items-center justify-between">
          <div>
            <span className="text-11 font-medium text-muted block">Registered patients</span>
            <span className="font-mono text-20 font-semibold text-ink">{total} in register</span>
          </div>
          <span className="text-11 bg-surface-subtle text-brand px-2 py-0.5 rounded border border-hairline font-mono">
            OPD Room 1
          </span>
        </div>
        <div className="py-1 sm:py-0 sm:px-4 flex items-center justify-between">
          <div>
            <span className="text-11 font-medium text-muted block">Total collected</span>
            <span className="font-mono text-20 font-semibold text-brand"><Money amount={totalCollected} /></span>
          </div>
          <span className="text-11 text-muted">Counter + UPI</span>
        </div>
        <div className="py-1 sm:py-0 sm:pl-4 flex items-center justify-between">
          <div>
            <span className="text-11 font-medium text-muted block">Pending balance</span>
            <span className={`font-mono text-20 font-semibold ${totalOutstanding > 0 ? 'text-amber' : 'text-brand'}`}>
              <Money amount={totalOutstanding} />
            </span>
          </div>
          <span className="text-11 text-muted">Due amount</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-hairline rounded-[6px] p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-card">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, phone, ID or diagnosis (press / to focus)"
            className="pl-9 pr-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Filters */}
          <div className="flex items-center gap-1 border border-hairline rounded-[4px] p-0.5 bg-paper">
            <button
              type="button"
              onClick={() => { setDateFilter(todayIso); setPage(1); }}
              className={`text-11 px-2.5 py-1 rounded-[3px] font-medium transition-colors ${
                dateFilter === todayIso
                  ? 'bg-surface text-brand font-semibold shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { setDateFilter(''); setPage(1); }}
              className={`text-11 px-2.5 py-1 rounded-[3px] font-medium transition-colors ${
                !dateFilter
                  ? 'bg-surface text-brand font-semibold shadow-sm'
                  : 'text-muted hover:text-ink'
              }`}
            >
              All dates
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-13 text-muted">
            <Calendar size={14} />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-auto text-13 py-1 min-h-[32px] h-[32px]"
            />
          </div>
        </div>
      </div>

      {/* Main Table or Empty State */}
      {patients.length === 0 && !loading ? (
        search.trim() ? (
          <EmptyState
            title="No records found"
            // Required wording: "No patient found for “[text]”. Check the spelling or search by phone number."
            description={`No patient found for “${search}”. Check the spelling or search by phone number.`}
            action={
              <Button variant="secondary" onClick={() => setSearch('')}>
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No patients saved today yet"
            // Required wording: "No patients saved today yet. New entries appear here."
            description="No patients saved today yet. New entries appear here."
            action={
              <Button variant="primary" onClick={() => window.location.href = '/add'}>
                Add patient
              </Button>
            }
          />
        )
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={patients}
            onRowClick={(row) => setSelectedPatientId(row.id)}
            emptyMessage={loading ? 'Loading patients...' : 'No patients to display.'}
          />

          {/* Pagination Bar */}
          <div className="flex items-center justify-between text-13 text-muted px-2 py-1">
            <div>
              Showing <span className="font-mono text-ink font-medium">{patients.length}</span> of{' '}
              <span className="font-mono text-ink font-medium">{total}</span> patients
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="text-13 py-1 px-2.5 min-h-[32px]"
              >
                <ChevronLeft size={14} className="mr-0.5" />
                Previous
              </Button>
              <span className="font-mono text-ink px-1">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="text-13 py-1 px-2.5 min-h-[32px]"
              >
                Next
                <ChevronRight size={14} className="ml-0.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Detail Side Panel */}
      {selectedPatientId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex justify-end bg-ink/30 animate-in fade-in"
          onClick={() => setSelectedPatientId(null)}
        >
          <div
            className="w-full max-w-lg bg-surface border-l border-hairline h-full overflow-y-auto p-4 sm:p-6 flex flex-col justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {panelLoading || !selectedPatient ? (
              <div className="py-12 text-center text-muted">
                Loading patient record...
              </div>
            ) : (
              <div className="space-y-5">
                {/* Panel Header */}
                <div className="flex items-start justify-between border-b border-hairline pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-11 font-mono font-semibold bg-surface-mint text-brand px-2 py-0.5 rounded border border-hairline">
                        Token #{String(selectedPatient.token || 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono text-13 text-muted">
                        {selectedPatient.id}
                      </span>
                    </div>
                    <h2 className="text-22 font-semibold text-ink">
                      {selectedPatient.name}
                    </h2>
                    <div className="text-13 text-muted flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span>Age: {selectedPatient.age || '—'} {selectedPatient.gender ? `(${selectedPatient.gender})` : ''}</span>
                      <span>Visit: <DateText date={selectedPatient.visitDate} /></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      onClick={() => setShowRxModal(true)}
                      className="text-11 py-1 px-2 min-h-[32px]"
                      title="Print Doctor Prescription (Rx)"
                    >
                      <Printer size={13} className="mr-1" />
                      Print Rx
                    </Button>
                    <button
                      type="button"
                      onClick={() => setSelectedPatientId(null)}
                      className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted hover:text-ink rounded-[4px] border border-hairline"
                      aria-label="Close panel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Clinical Vitals & Diagnosis Strip */}
                <div className="bg-surface-subtle p-3.5 rounded-[4px] border border-hairline space-y-2">
                  <div className="text-11 font-semibold text-brand uppercase tracking-wider">
                    Clinical findings & vitals
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center font-mono text-13 border-b border-hairline/60 pb-2">
                    <div>
                      <span className="text-11 font-sans text-muted block">BP</span>
                      <span className="font-semibold text-ink">{selectedPatient.bp || '120/80'}</span>
                    </div>
                    <div>
                      <span className="text-11 font-sans text-muted block">Pulse</span>
                      <span className="font-semibold text-ink">{selectedPatient.pulse ? `${selectedPatient.pulse} bpm` : '76 bpm'}</span>
                    </div>
                    <div>
                      <span className="text-11 font-sans text-muted block">Temp</span>
                      <span className="font-semibold text-ink">{selectedPatient.temp ? `${selectedPatient.temp} °F` : '98.6 °F'}</span>
                    </div>
                    <div>
                      <span className="text-11 font-sans text-muted block">Weight</span>
                      <span className="font-semibold text-ink">{selectedPatient.weight ? `${selectedPatient.weight} kg` : '—'}</span>
                    </div>
                  </div>
                  {selectedPatient.diagnosis && (
                    <div className="text-13 text-ink">
                      <span className="font-medium text-brand">Diagnosis: </span>
                      {selectedPatient.diagnosis}
                    </div>
                  )}
                  {selectedPatient.complaints && (
                    <div className="text-13 text-muted">
                      <span className="font-medium text-ink">Complaints: </span>
                      {selectedPatient.complaints}
                    </div>
                  )}
                </div>

                {/* Contact & Address */}
                <div className="space-y-1.5 text-13 bg-paper p-3 rounded-[4px] border border-hairline">
                  <div className="flex items-center gap-2 text-ink">
                    <Phone size={14} className="text-muted" />
                    <span className="font-mono">{selectedPatient.phone}</span>
                  </div>
                  {selectedPatient.address && (
                    <div className="flex items-start gap-2 text-muted">
                      <MapPin size={14} className="text-muted mt-0.5 flex-shrink-0" />
                      <span>{selectedPatient.address}</span>
                    </div>
                  )}
                </div>

                {/* Medicines Prescribed */}
                <div>
                  <h3 className="text-15 font-semibold text-ink mb-2 flex items-center justify-between">
                    <span>Medicines prescribed (Rx)</span>
                    <span className="text-11 text-muted font-normal">Dr. Jignesh Chauhan (B.A.M.S.)</span>
                  </h3>
                  {selectedPatient.medicines?.length > 0 ? (
                    <div className="border border-hairline rounded-[4px] overflow-hidden">
                      <table className="w-full text-left text-13">
                        <thead className="bg-paper border-b border-hairline text-muted">
                          <tr>
                            <th className="p-2 font-medium">Medicine</th>
                            <th className="p-2 font-medium">Dosage</th>
                            <th className="p-2 font-medium text-right">Days</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                          {selectedPatient.medicines.map((m, idx) => (
                            <tr key={idx} className="bg-white">
                              <td className="p-2 font-medium text-ink">{m.medicine}</td>
                              <td className="p-2 text-muted">{m.dosage}</td>
                              <td className="p-2 text-right font-mono text-ink">{m.days}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-13 text-muted">No medicines prescribed.</p>
                  )}
                </div>

                {/* Bill Breakdown Ledger */}
                <div>
                  <h3 className="text-15 font-semibold text-ink mb-2">
                    Billing ledger
                  </h3>
                  <div className="border border-hairline rounded-[4px] divide-y divide-hairline text-15 font-mono">
                    {/* OPD */}
                    <div className="p-3 bg-surface">
                      <div className="text-13 font-sans font-medium text-brand mb-1">
                        OPD consultation fee
                      </div>
                      <div className="flex justify-between text-muted text-13">
                        <span>Charge</span>
                        <Money amount={selectedPatient.opdCharge} />
                      </div>
                      <div className="flex justify-between text-ink text-13">
                        <span>Paid</span>
                        <Money amount={selectedPatient.opdPaid} />
                      </div>
                      <div className="flex justify-between font-semibold pt-1 border-t border-hairline/60">
                        <span>Remaining</span>
                        <span className={selectedPatient.opdRemaining > 0 ? 'text-amber' : 'text-brand'}>
                          <Money amount={selectedPatient.opdRemaining} />
                        </span>
                      </div>
                    </div>

                    {/* Report */}
                    {selectedPatient.reportCharge > 0 && (
                      <div className="p-3 bg-surface">
                        <div className="text-13 font-sans font-medium text-brand mb-1">
                          {selectedPatient.reportName || 'Diagnostic Report'}
                        </div>
                        <div className="flex justify-between text-muted text-13">
                          <span>Charge</span>
                          <Money amount={selectedPatient.reportCharge} />
                        </div>
                        <div className="flex justify-between text-ink text-13">
                          <span>Paid</span>
                          <Money amount={selectedPatient.reportPaid} />
                        </div>
                        <div className="flex justify-between font-semibold pt-1 border-t border-hairline/60">
                          <span>Remaining</span>
                          <span className={selectedPatient.reportRemaining > 0 ? 'text-amber' : 'text-brand'}>
                            <Money amount={selectedPatient.reportRemaining} />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Receive Payment Inline Form */}
                {(selectedPatient.opdRemaining > 0 || selectedPatient.reportRemaining > 0) && (
                  <div className="border border-hairline rounded-[6px] p-4 bg-surface-subtle">
                    <h3 className="text-15 font-semibold text-ink mb-2">
                      Receive remaining payment
                    </h3>
                    {payError && (
                      <p className="text-13 text-red font-medium mb-2">{payError}</p>
                    )}
                    <form onSubmit={handleReceivePayment} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-13 font-medium text-ink block mb-1">Apply to</label>
                          <select
                            value={payType}
                            onChange={(e) => setPayType(e.target.value)}
                            className="w-full bg-surface text-ink border border-hairline rounded-[4px] px-2.5 py-1.5 text-13"
                          >
                            <option value="opd" disabled={selectedPatient.opdRemaining === 0}>
                              OPD (due: ₹{selectedPatient.opdRemaining})
                            </option>
                            <option value="report" disabled={selectedPatient.reportRemaining === 0}>
                              Report (due: ₹{selectedPatient.reportRemaining})
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="text-13 font-medium text-ink block mb-1">Amount (₹)</label>
                          <Input
                            type="number"
                            mono
                            min="1"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            placeholder={
                              payType === 'opd'
                                ? String(selectedPatient.opdRemaining)
                                : String(selectedPatient.reportRemaining)
                            }
                            className="py-1 text-13"
                          />
                        </div>
                      </div>

                      <Input
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                        placeholder="Payment note (e.g. Cash, UPI, GPay)"
                        className="py-1 text-13"
                      />

                      <Button
                        type="submit"
                        variant="primary"
                        disabled={paying}
                        className="w-full text-13 py-1.5 min-h-[36px]"
                      >
                        {paying ? 'Recording payment...' : 'Receive payment'}
                      </Button>
                    </form>
                  </div>
                )}

                {/* Payment History */}
                <div>
                  <h3 className="text-15 font-semibold text-ink mb-2">
                    Payment receipts
                  </h3>
                  {selectedPatient.payments?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedPatient.payments.map((pm, idx) => (
                        <div
                          key={pm.id || idx}
                          className="flex items-center justify-between p-2.5 bg-paper rounded-[4px] border border-hairline text-13 font-mono"
                        >
                          <div>
                            <span className="text-ink font-sans font-medium text-13 block">
                              {pm.type === 'opd' ? 'OPD consultation' : 'Diagnostic report'}
                            </span>
                            <span className="text-muted text-11">{pm.date}</span>
                            {pm.note && <span className="text-muted font-sans ml-2">({pm.note})</span>}
                          </div>
                          <span className="font-semibold text-brand text-15">
                            <Money amount={pm.amount} />
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-13 text-muted">No payments recorded yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Doctor's Rx Prescription Slip Modal */}
      {showRxModal && selectedPatient && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40"
          onClick={() => setShowRxModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-white border border-hairline rounded-[6px] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Bar */}
            <div className="flex items-center justify-between border-b border-hairline pb-3 no-print">
              <span className="text-13 font-medium text-brand flex items-center gap-1.5">
                <Printer size={15} />
                Doctor's Prescription Slip (A4 / Thermal Printable)
              </span>
              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={() => window.print()} className="text-13 py-1 px-3 min-h-[34px]">
                  Print slip
                </Button>
                <Button variant="secondary" onClick={() => setShowRxModal(false)} className="text-13 py-1 px-3 min-h-[34px]">
                  Close
                </Button>
              </div>
            </div>

            {/* Official Doctor Prescription Pad */}
            <div className="print-rx-box border-2 border-brand/40 p-5 rounded-[4px] space-y-4 bg-white text-ink">
              {/* Clinic Header */}
              <div className="border-b-2 border-brand pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-22 font-bold text-brand leading-tight">
                    NILKANTH CLINIC
                  </h2>
                  <p className="text-15 font-semibold text-ink">
                    Dr. Jignesh Chauhan <span className="font-medium text-brand text-13">B.A.M.S.</span>
                  </p>
                  <p className="text-11 text-muted">
                    Consulting Ayurvedic Physician & Family Healthcare
                  </p>
                </div>
                <div className="text-right text-11 text-muted font-mono leading-tight">
                  <p>Navrangpura, Ahmedabad</p>
                  <p className="text-ink font-semibold">Mobile: +91 90336 63170</p>
                  <p className="text-brand font-semibold mt-1">Timings: 9am-1pm | 5pm-9pm</p>
                </div>
              </div>

              {/* Patient Demographics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-13 border-b border-hairline pb-3">
                <div>
                  <span className="text-muted block text-11">Patient Name:</span>
                  <span className="font-semibold text-ink">{selectedPatient.name}</span>
                </div>
                <div>
                  <span className="text-muted block text-11">Token / ID:</span>
                  <span className="font-mono font-medium text-brand">
                    #{String(selectedPatient.token || 1).padStart(2, '0')} ({selectedPatient.id})
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-11">Age / Gender:</span>
                  <span>{selectedPatient.age || '—'} Y / {selectedPatient.gender}</span>
                </div>
                <div>
                  <span className="text-muted block text-11">Date:</span>
                  <span className="font-mono"><DateText date={selectedPatient.visitDate} /></span>
                </div>
              </div>

              {/* Vitals */}
              <div className="bg-paper p-2 rounded text-11 font-mono flex flex-wrap gap-4 text-muted">
                <span>BP: <strong className="text-ink">{selectedPatient.bp || '120/80 mmHg'}</strong></span>
                <span>Pulse: <strong className="text-ink">{selectedPatient.pulse ? `${selectedPatient.pulse} bpm` : '76 bpm'}</strong></span>
                <span>Temp: <strong className="text-ink">{selectedPatient.temp ? `${selectedPatient.temp} °F` : '98.6 °F'}</strong></span>
                <span>Weight: <strong className="text-ink">{selectedPatient.weight ? `${selectedPatient.weight} kg` : '—'}</strong></span>
              </div>

              {/* Rx Symbol & Prescriptions */}
              <div>
                <div className="text-22 font-bold text-brand mb-2 font-mono">
                  ℞
                </div>
                <table className="w-full text-left text-13 border-collapse">
                  <thead>
                    <tr className="border-b border-hairline text-muted text-11">
                      <th className="py-1">#</th>
                      <th className="py-1">Medicine name</th>
                      <th className="py-1">Dosage & timing</th>
                      <th className="py-1 text-right">Days</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {selectedPatient.medicines?.map((m, idx) => (
                      <tr key={idx} className="py-1.5">
                        <td className="py-2 text-muted font-mono">{idx + 1}.</td>
                        <td className="py-2 font-semibold text-ink">{m.medicine}</td>
                        <td className="py-2 text-muted">{m.dosage}</td>
                        <td className="py-2 text-right font-mono text-ink">{m.days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Doctor's Signature */}
              <div className="pt-8 flex justify-between items-end border-t border-hairline text-11">
                <div className="text-muted">
                  <p>Sunday Evening Closed.</p>
                  <p>Contact / Emergency: 90336 63170</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-ink/80 mb-1"></div>
                  <span className="font-semibold text-ink">Dr. Jignesh Chauhan</span>
                  <span className="block text-muted">B.A.M.S. | Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Patients;
