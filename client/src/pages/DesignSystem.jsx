import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import Field from '../components/Field';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import Money from '../components/Money';
import DateText from '../components/DateText';
import StatusText from '../components/StatusText';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

export function DesignSystem() {
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('opd');

  const sampleTableData = [
    { id: 'NK-101', name: 'Rameshchandra Patel', area: 'Navrangpura', charge: 300, paid: 300, remaining: 0, status: 'Settled' },
    { id: 'NK-102', name: 'Kavita Desai', area: 'Satellite', charge: 650, paid: 0, remaining: 650, status: 'Pending' },
    { id: 'NK-103', name: 'Hitesh Shah', area: 'Maninagar', charge: 700, paid: 500, remaining: 200, status: 'Partial' }
  ];

  const sampleColumns = [
    { title: 'ID', key: 'id', render: (r) => <span className="font-mono text-13">{r.id}</span> },
    { title: 'Patient', key: 'name' },
    { title: 'Area', key: 'area' },
    { title: 'Charge', key: 'charge', align: 'right', render: (r) => <Money amount={r.charge} /> },
    { title: 'Paid', key: 'paid', align: 'right', render: (r) => <Money amount={r.paid} /> },
    { title: 'Remaining', key: 'remaining', align: 'right', render: (r) => <Money amount={r.remaining} /> },
    { title: 'Status', key: 'status', align: 'center', render: (r) => <StatusText status={r.status} /> }
  ];

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-16">
      <PageHeader
        title="Clinical ledger design system"
        subtitle="Light green & white medical palette, typography tokens and clinical components."
      />

      {/* 1. Design Tokens */}
      <section className="space-y-6">
        <h2 className="text-22 font-semibold text-ink border-b border-hairline pb-2">
          Clinical color tokens & typography
        </h2>

        {/* Colours */}
        <div>
          <h3 className="text-15 font-medium text-muted mb-3">Colours (light green & crisp white palette)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-paper border border-hairline p-3 rounded-[4px] shadow-sm">
              <div className="h-10 rounded-[2px] bg-paper border border-hairline mb-2" />
              <div className="text-13 font-semibold text-ink">Paper background</div>
              <div className="font-mono text-11 text-muted">#F4F9F6</div>
            </div>
            <div className="bg-surface border border-hairline p-3 rounded-[4px] shadow-sm">
              <div className="h-10 rounded-[2px] bg-surface border border-hairline mb-2" />
              <div className="text-13 font-semibold text-ink">Surface white</div>
              <div className="font-mono text-11 text-muted">#FFFFFF</div>
            </div>
            <div className="bg-surface border border-hairline p-3 rounded-[4px] shadow-sm">
              <div className="h-10 rounded-[2px] bg-surface-subtle border border-hairline mb-2" />
              <div className="text-13 font-semibold text-ink">Light green accent</div>
              <div className="font-mono text-11 text-muted">#EBF5EE</div>
            </div>
            <div className="bg-surface border border-hairline p-3 rounded-[4px] shadow-sm">
              <div className="h-10 rounded-[2px] bg-brand mb-2" />
              <div className="text-13 font-semibold text-ink">Clinical green</div>
              <div className="font-mono text-11 text-muted">#0B6E4F</div>
            </div>
            <div className="bg-surface border border-hairline p-3 rounded-[4px] shadow-sm">
              <div className="h-10 rounded-[2px] bg-ink mb-2" />
              <div className="text-13 font-semibold text-ink">Dark slate ink</div>
              <div className="font-mono text-11 text-muted">#111A16</div>
            </div>
            <div className="bg-surface border border-hairline p-3 rounded-[4px] shadow-sm">
              <div className="h-10 rounded-[2px] bg-hairline mb-2" />
              <div className="text-13 font-semibold text-ink">Green hairline</div>
              <div className="font-mono text-11 text-muted">#CFE3D3</div>
            </div>
            <div className="bg-surface border border-hairline p-3 rounded-[4px] shadow-sm">
              <div className="h-10 rounded-[2px] bg-amber mb-2" />
              <div className="text-13 font-semibold text-ink">Pending amber</div>
              <div className="font-mono text-11 text-muted">#B7791F</div>
            </div>
            <div className="bg-surface border border-hairline p-3 rounded-[4px] shadow-sm">
              <div className="h-10 rounded-[2px] bg-red mb-2" />
              <div className="text-13 font-semibold text-ink">Error red</div>
              <div className="font-mono text-11 text-muted">#B42318</div>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div>
          <h3 className="text-15 font-medium text-muted mb-3">Type sizes (13, 15, 17, 22, 28 px) & IBM Plex</h3>
          <div className="bg-surface border border-hairline rounded-[6px] p-4 divide-y divide-hairline shadow-sm">
            <div className="py-2 flex items-baseline justify-between">
              <span className="text-28 font-semibold">28px Semibold — Main clinic heading</span>
              <span className="font-mono text-13 text-muted">text-28 font-semibold</span>
            </div>
            <div className="py-2 flex items-baseline justify-between">
              <span className="text-22 font-semibold">22px Semibold — Section titles</span>
              <span className="font-mono text-13 text-muted">text-22 font-semibold</span>
            </div>
            <div className="py-2 flex items-baseline justify-between">
              <span className="text-17 font-medium">17px Medium — Block headers and dialogs</span>
              <span className="font-mono text-13 text-muted">text-17 font-medium</span>
            </div>
            <div className="py-2 flex items-baseline justify-between">
              <span className="text-15">15px Regular — Body text, table cells and input controls</span>
              <span className="font-mono text-13 text-muted">text-15 font-regular</span>
            </div>
            <div className="py-2 flex items-baseline justify-between">
              <span className="text-13 text-muted">13px Regular — Form field labels, hints and status indicators</span>
              <span className="font-mono text-13 text-muted">text-13 text-muted</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Components */}
      <section className="space-y-8">
        <h2 className="text-22 font-semibold text-ink border-b border-hairline pb-2">
          Clinical components
        </h2>

        {/* Micro components */}
        <div className="bg-surface border border-hairline rounded-[6px] p-5 space-y-4 shadow-sm">
          <h3 className="text-17 font-semibold text-ink">Micro components</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="text-13 text-muted mb-2">Money (Indian grouping, IBM Plex Mono)</div>
              <div className="space-y-1 font-mono text-15">
                <div><Money amount={300} /></div>
                <div><Money amount={1200} /></div>
                <div><Money amount={25000} /></div>
                <div><Money amount={125000} /></div>
              </div>
            </div>

            <div>
              <div className="text-13 text-muted mb-2">DateText (12 Nov 2026 format)</div>
              <div className="space-y-1 text-15">
                <div><DateText date="2026-11-14" /></div>
                <div><DateText date="2026-08-15" /></div>
                <div><DateText date="2026-01-26" /></div>
              </div>
            </div>

            <div>
              <div className="text-13 text-muted mb-2">StatusText (coloured dot, not a pill)</div>
              <div className="space-y-2">
                <div><StatusText status="Settled" /></div>
                <div><StatusText status="Partial" /></div>
                <div><StatusText status="Pending" /></div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="bg-surface border border-hairline rounded-[6px] p-5 space-y-4 shadow-sm">
          <h3 className="text-17 font-semibold text-ink">Buttons</h3>
          <p className="text-13 text-muted">
            4px border radius, no drop shadows, min 44px touch target on phones, verb first.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Save patient</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="quiet">Clear filters</Button>
            <Button variant="primary" disabled>Disabled action</Button>
          </div>
        </div>

        {/* Inputs & Fields */}
        <div className="bg-surface border border-hairline rounded-[6px] p-5 space-y-4 shadow-sm">
          <h3 className="text-17 font-semibold text-ink">Form inputs & fields</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Patient name" htmlFor="demo-name" required hint="Full official name">
              <Input
                id="demo-name"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Rameshchandra Patel"
              />
            </Field>

            <Field label="Phone number" htmlFor="demo-phone" required hint="10 digits mono">
              <Input
                id="demo-phone"
                mono
                defaultValue="9825012345"
                placeholder="9825012345"
              />
            </Field>

            <Field label="With validation error" htmlFor="demo-err" error="Phone number must be 10 digits.">
              <Input
                id="demo-err"
                mono
                error
                defaultValue="98250"
              />
            </Field>

            <Field label="Consultation type" htmlFor="demo-select">
              <Select
                id="demo-select"
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
              >
                <option value="opd">OPD General Consultation</option>
                <option value="report">Pathology / Diagnostic Report</option>
                <option value="combined">Combined Consultation & Report</option>
              </Select>
            </Field>
          </div>
        </div>

        {/* DataTable */}
        <div className="space-y-2">
          <h3 className="text-17 font-semibold text-ink">DataTable</h3>
          <p className="text-13 text-muted">
            Sticky header, 40px rows, hairline dividers (#CFE3D3), no zebra striping, right-aligned mono numbers.
          </p>
          <DataTable
            columns={sampleColumns}
            data={sampleTableData}
          />
        </div>

        {/* Toast triggers */}
        <div className="bg-surface border border-hairline rounded-[6px] p-5 space-y-4 shadow-sm">
          <h3 className="text-17 font-semibold text-ink">Toast notifications</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => showToast('Saved: Rameshchandra Patel')}
            >
              Show saved toast
            </Button>
            <Button
              variant="secondary"
              onClick={() => showToast('₹300 received from Kavita Desai.')}
            >
              Show payment toast
            </Button>
            <Button
              variant="secondary"
              onClick={() => showToast('Paid amount cannot be more than the charge.', 'error')}
            >
              Show error toast
            </Button>
          </div>
        </div>

        {/* EmptyState */}
        <div className="bg-surface border border-hairline rounded-[6px] p-5 space-y-4 shadow-sm">
          <h3 className="text-17 font-semibold text-ink">EmptyState</h3>
          <EmptyState
            title="No patients saved today yet"
            description="No patients saved today yet. New entries appear here."
            action={<Button variant="primary">Add patient</Button>}
          />
        </div>

        {/* ConfirmDialog Trigger */}
        <div className="bg-surface border border-hairline rounded-[6px] p-5 space-y-4 shadow-sm">
          <h3 className="text-17 font-semibold text-ink">ConfirmDialog</h3>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open confirm dialog
          </Button>

          <ConfirmDialog
            isOpen={dialogOpen}
            title="Sign out of Nilkanth Clinic"
            message="Are you sure you want to sign out? Any unsaved entries on this screen will be lost."
            confirmLabel="Sign out"
            cancelLabel="Stay signed in"
            onConfirm={() => {
              setDialogOpen(false);
              showToast('Signed out successfully');
            }}
            onCancel={() => setDialogOpen(false)}
          />
        </div>
      </section>
    </div>
  );
}

export default DesignSystem;
