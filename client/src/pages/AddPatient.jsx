import React, { useState, useRef, useEffect } from 'react';
import { createPatient } from '../api/mockApi';
import Field from '../components/Field';
import Input from '../components/Input';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { formatIndianCurrency } from '../components/Money';
import { Plus, Trash2, HeartPulse, Pill, Receipt, UserCheck } from 'lucide-react';

const AHMEDABAD_AREAS = [
  'Navrangpura', 'Satellite', 'Maninagar', 'Bopal', 'Paldi',
  'Naroda', 'Vastrapur', 'Chandkheda', 'Ghatlodiya', 'Isanpur'
];

const COMMON_MEDICINES = [
  { name: 'Paracetamol 650 mg', dosage: '1 tab thrice daily after meals', days: '3' },
  { name: 'Pantoprazole 40 mg', dosage: '1 tab morning empty stomach', days: '5' },
  { name: 'Azithromycin 500 mg', dosage: '1 tab once daily before lunch', days: '3' },
  { name: 'Cetirizine 10 mg', dosage: '1 tab at night', days: '5' },
  { name: 'Amoxicillin 500 mg', dosage: '1 cap twice daily after food', days: '5' },
  { name: 'Cough syrup Ambroxol', dosage: '2 tsp thrice daily after food', days: '5' }
];

const INITIAL_FORM = {
  name: '',
  age: '',
  gender: 'Male',
  phone: '',
  weight: '',
  bp: '',
  pulse: '',
  temp: '',
  complaints: '',
  diagnosis: '',
  address: '',
  medicines: [
    { medicine: '', dosage: '', days: '' }
  ],
  opdCharge: 300,
  opdPaid: 300,
  reportName: '',
  reportCharge: 0,
  reportPaid: 0
};

export function AddPatient() {
  const { showToast } = useToast();
  const nameInputRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const medicineInputRefs = useRef([]);

  // Autofocus on name on initial mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Keyboard shortcut: Ctrl+Enter (or Cmd+Enter) saves patient
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleMedicineChange = (index, field, value) => {
    setForm(prev => {
      const nextMeds = [...prev.medicines];
      nextMeds[index] = { ...nextMeds[index], [field]: value };
      return { ...prev, medicines: nextMeds };
    });
  };

  const addMedicineRow = (focusNew = true) => {
    setForm(prev => ({
      ...prev,
      medicines: [...prev.medicines, { medicine: '', dosage: '', days: '' }]
    }));
    if (focusNew) {
      setTimeout(() => {
        const nextIdx = form.medicines.length;
        if (medicineInputRefs.current[nextIdx]) {
          medicineInputRefs.current[nextIdx].focus();
        }
      }, 50);
    }
  };

  const applyCommonMedicine = (med) => {
    setForm(prev => {
      const emptyIdx = prev.medicines.findIndex(m => !m.medicine.trim());
      if (emptyIdx !== -1) {
        const nextMeds = [...prev.medicines];
        nextMeds[emptyIdx] = { medicine: med.name, dosage: med.dosage, days: med.days };
        return { ...prev, medicines: nextMeds };
      }
      return {
        ...prev,
        medicines: [...prev.medicines, { medicine: med.name, dosage: med.dosage, days: med.days }]
      };
    });
  };

  const removeMedicineRow = (index) => {
    if (form.medicines.length <= 1) {
      setForm(prev => ({
        ...prev,
        medicines: [{ medicine: '', dosage: '', days: '' }]
      }));
      return;
    }
    setForm(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, idx) => idx !== index)
    }));
  };

  const handleMedicineDaysKeyDown = (e, index) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      addMedicineRow(true);
    }
  };

  // Calculations
  const opdChargeNum = Number(form.opdCharge) || 0;
  const opdPaidNum = Number(form.opdPaid) || 0;
  const opdRemaining = Math.max(0, opdChargeNum - opdPaidNum);

  const reportChargeNum = Number(form.reportCharge) || 0;
  const reportPaidNum = Number(form.reportPaid) || 0;
  const reportRemaining = Math.max(0, reportChargeNum - reportPaidNum);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) {
      errs.name = 'Patient name is required.';
    }

    const cleanPhone = form.phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      // Required wording: "Phone number must be 10 digits."
      errs.phone = 'Phone number must be 10 digits.';
    }

    if (opdPaidNum > opdChargeNum) {
      // Required wording: "Paid amount cannot be more than the charge."
      errs.opdPaid = 'Paid amount cannot be more than the charge.';
    }

    if (reportPaidNum > reportChargeNum) {
      // Required wording: "Paid amount cannot be more than the charge."
      errs.reportPaid = 'Paid amount cannot be more than the charge.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const savedPatient = await createPatient({
        ...form,
        phone: form.phone.trim().replace(/\D/g, '')
      });

      // Clear the form
      setForm({
        ...INITIAL_FORM,
        medicines: [{ medicine: '', dosage: '', days: '' }]
      });
      setErrors({});

      // Required wording: "Saved: [name]"
      showToast(`Saved: ${savedPatient.name}`);

      // Return focus to name input
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    } catch (err) {
      // Required wording: "Could not save. Check the internet and try again. Your entry is still on the screen."
      const msg = err.message || 'Could not save. Check the internet and try again. Your entry is still on the screen.';
      setErrors(prev => ({ ...prev, form: msg }));
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="New patient register"
        subtitle="OPD consultation, clinical vitals and billing entry. Press Ctrl+Enter to save."
        actions={
          <div className="text-13 text-muted font-mono hidden sm:flex items-center gap-2">
            <span>Shortcut:</span>
            <kbd className="bg-surface border border-hairline px-2 py-0.5 rounded-[4px] text-brand font-semibold shadow-sm">
              Ctrl + Enter
            </kbd>
          </div>
        }
      />

      {errors.form && (
        <div className="p-3 bg-red-subtle border border-red text-red text-15 rounded-[4px]">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Patient Demographics & Vitals */}
        <section className="bg-surface border border-hairline rounded-[6px] p-4 sm:p-6 shadow-card">
          <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
            <h2 className="text-17 font-semibold text-ink flex items-center gap-2">
              <UserCheck size={18} className="text-brand" />
              <span>Patient demographics & vitals</span>
            </h2>
            <span className="text-13 text-muted">
              Step 1 of 3: Registration
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field
              label="Full name"
              htmlFor="p-name"
              required
              error={errors.name}
              className="sm:col-span-2"
            >
              <Input
                id="p-name"
                ref={nameInputRef}
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Rameshchandra Patel"
                error={Boolean(errors.name)}
                tabIndex={1}
                required
              />
            </Field>

            <Field label="Age" htmlFor="p-age">
              <div className="flex gap-2">
                <Input
                  id="p-age"
                  type="number"
                  min="0"
                  max="125"
                  value={form.age}
                  onChange={(e) => handleChange('age', e.target.value)}
                  placeholder="45"
                  tabIndex={2}
                />
                <select
                  value={form.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="bg-surface text-ink border border-hairline rounded-[4px] px-2 text-13"
                >
                  <option value="Male">M</option>
                  <option value="Female">F</option>
                  <option value="Child">Child</option>
                </select>
              </div>
            </Field>

            <Field
              label="Phone number"
              htmlFor="p-phone"
              required
              hint="10 digits"
              error={errors.phone}
            >
              <Input
                id="p-phone"
                type="tel"
                mono
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="9825012345"
                error={Boolean(errors.phone)}
                tabIndex={3}
                required
              />
            </Field>

            {/* Clinical Vitals Row */}
            <div className="sm:col-span-2 lg:col-span-4 bg-surface-subtle p-3 rounded-[4px] border border-hairline grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-11 font-medium text-muted block mb-1">Weight (kg)</label>
                <Input
                  value={form.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  placeholder="68"
                  className="bg-white min-h-[34px] py-1 text-13"
                  tabIndex={4}
                />
              </div>
              <div>
                <label className="text-11 font-medium text-muted block mb-1">Blood pressure (mmHg)</label>
                <Input
                  value={form.bp}
                  onChange={(e) => handleChange('bp', e.target.value)}
                  placeholder="120/80"
                  mono
                  className="bg-white min-h-[34px] py-1 text-13"
                  tabIndex={5}
                />
              </div>
              <div>
                <label className="text-11 font-medium text-muted block mb-1">Pulse (bpm)</label>
                <Input
                  value={form.pulse}
                  onChange={(e) => handleChange('pulse', e.target.value)}
                  placeholder="76"
                  mono
                  className="bg-white min-h-[34px] py-1 text-13"
                  tabIndex={6}
                />
              </div>
              <div>
                <label className="text-11 font-medium text-muted block mb-1">Temperature (°F)</label>
                <Input
                  value={form.temp}
                  onChange={(e) => handleChange('temp', e.target.value)}
                  placeholder="98.6"
                  mono
                  className="bg-white min-h-[34px] py-1 text-13"
                  tabIndex={7}
                />
              </div>
            </div>

            <Field label="Complaints / Provisional diagnosis" htmlFor="p-diagnosis" className="sm:col-span-2">
              <Input
                id="p-diagnosis"
                value={form.diagnosis}
                onChange={(e) => handleChange('diagnosis', e.target.value)}
                placeholder="e.g. Viral fever, dry cough, hypertension check"
                tabIndex={8}
              />
            </Field>

            <Field label="Address / Area in Ahmedabad" htmlFor="p-address" className="sm:col-span-2">
              <Input
                id="p-address"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="e.g. Navrangpura, Ahmedabad"
                tabIndex={9}
              />
              {/* Quick Area Chips */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {AHMEDABAD_AREAS.slice(0, 6).map(area => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => handleChange('address', `${area}, Ahmedabad`)}
                    className="text-11 px-2 py-0.5 rounded-[3px] bg-paper border border-hairline text-muted hover:text-brand hover:border-brand transition-colors"
                  >
                    {area}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </section>

        {/* Section 2: Medicines Prescribed */}
        <section className="bg-surface border border-hairline rounded-[6px] p-4 sm:p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-hairline pb-3 mb-4 gap-2">
            <div>
              <h2 className="text-17 font-semibold text-ink flex items-center gap-2">
                <Pill size={18} className="text-brand" />
                <span>Medicines prescribed (Rx)</span>
              </h2>
              <p className="text-13 text-muted">
                Press Enter in the Days field to append a new row
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => addMedicineRow(true)}
              className="text-13 py-1.5 px-3 min-h-[36px]"
            >
              <Plus size={14} className="mr-1" />
              Add medicine row
            </Button>
          </div>

          {/* Quick clinical presets */}
          <div className="mb-4 p-2.5 bg-surface-subtle border border-hairline rounded-[4px]">
            <span className="text-11 font-semibold text-brand block mb-1">
              Common clinic prescriptions (click to insert):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MEDICINES.map((med, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyCommonMedicine(med)}
                  className="text-11 bg-white border border-hairline px-2 py-1 rounded-[3px] text-ink hover:text-brand hover:border-brand font-medium transition-colors"
                >
                  + {med.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {form.medicines.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 sm:gap-3 items-center border-b sm:border-b-0 border-hairline/60 pb-3 sm:pb-0"
              >
                <div className="col-span-12 sm:col-span-6">
                  <Input
                    ref={(el) => (medicineInputRefs.current[idx] = el)}
                    value={item.medicine}
                    onChange={(e) => handleMedicineChange(idx, 'medicine', e.target.value)}
                    placeholder="Medicine name & strength (e.g. Paracetamol 650 mg)"
                    tabIndex={10 + idx * 3}
                  />
                </div>
                <div className="col-span-8 sm:col-span-4">
                  <Input
                    value={item.dosage}
                    onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                    placeholder="Dosage instruction (e.g. 1 tab after food)"
                    tabIndex={11 + idx * 3}
                  />
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <Input
                    mono
                    value={item.days}
                    onChange={(e) => handleMedicineChange(idx, 'days', e.target.value)}
                    onKeyDown={(e) => handleMedicineDaysKeyDown(e, idx)}
                    placeholder="Days"
                    title="Press Enter to add row"
                    tabIndex={12 + idx * 3}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removeMedicineRow(idx)}
                    className="p-1 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center text-muted hover:text-red hover:bg-paper rounded-[4px] focus:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                    title="Remove medicine"
                    aria-label="Remove medicine row"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3 & 4: OPD Charge & Report Charge */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 3: OPD Charge */}
          <section className="bg-surface border border-hairline rounded-[6px] p-4 sm:p-6 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-hairline pb-2 mb-4">
                <h2 className="text-17 font-semibold text-ink flex items-center gap-2">
                  <Receipt size={18} className="text-brand" />
                  <span>OPD consultation charge</span>
                </h2>
                <span className="text-11 bg-surface-subtle border border-hairline text-brand px-2 py-0.5 rounded font-mono">
                  Dr. Jignesh Chauhan (B.A.M.S.)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="OPD charge (₹)" htmlFor="opd-charge">
                  <Input
                    id="opd-charge"
                    type="number"
                    mono
                    min="0"
                    value={form.opdCharge}
                    onChange={(e) => handleChange('opdCharge', e.target.value)}
                    tabIndex={50}
                  />
                </Field>
                <Field label="Paid now (₹)" htmlFor="opd-paid" error={errors.opdPaid}>
                  <Input
                    id="opd-paid"
                    type="number"
                    mono
                    min="0"
                    value={form.opdPaid}
                    onChange={(e) => handleChange('opdPaid', e.target.value)}
                    error={Boolean(errors.opdPaid)}
                    tabIndex={51}
                  />
                </Field>
              </div>
            </div>

            {/* Bill-style block for OPD */}
            <div className="mt-6 pt-4 border-t border-hairline bg-surface-subtle p-3 rounded-[4px]">
              <div className="text-13 text-brand font-medium mb-1.5 flex items-center justify-between">
                <span>OPD ledger summary</span>
                <span className="text-11 text-muted">Counter Cash/UPI</span>
              </div>
              <div className="space-y-1 font-mono text-15">
                <div className="flex justify-between items-center text-muted">
                  <span>Charge</span>
                  <span className="tabular-nums">{formatIndianCurrency(opdChargeNum)}</span>
                </div>
                <div className="flex justify-between items-center text-ink">
                  <span>Paid</span>
                  <span className="tabular-nums text-brand font-medium">{formatIndianCurrency(opdPaidNum)}</span>
                </div>
                <div className="flex justify-between items-center font-semibold pt-1 border-t border-hairline">
                  <span className={opdRemaining > 0 ? 'text-amber' : 'text-ink'}>Remaining</span>
                  <span className={`tabular-nums ${opdRemaining > 0 ? 'text-amber' : 'text-ink'}`}>
                    {formatIndianCurrency(opdRemaining)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Report Charge */}
          <section className="bg-surface border border-hairline rounded-[6px] p-4 sm:p-6 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-hairline pb-2 mb-4">
                <h2 className="text-17 font-semibold text-ink flex items-center gap-2">
                  <HeartPulse size={18} className="text-brand" />
                  <span>Report / Lab investigation</span>
                </h2>
                <span className="text-11 bg-surface-subtle border border-hairline text-brand px-2 py-0.5 rounded">
                  Diagnostics
                </span>
              </div>
              <div className="space-y-4">
                <Field label="Investigation / Report name" htmlFor="report-name">
                  <Input
                    id="report-name"
                    value={form.reportName}
                    onChange={(e) => handleChange('reportName', e.target.value)}
                    placeholder="e.g. Complete Blood Count (CBC), Urine Routine"
                    tabIndex={52}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Report charge (₹)" htmlFor="report-charge">
                    <Input
                      id="report-charge"
                      type="number"
                      mono
                      min="0"
                      value={form.reportCharge}
                      onChange={(e) => handleChange('reportCharge', e.target.value)}
                      tabIndex={53}
                    />
                  </Field>
                  <Field label="Paid now (₹)" htmlFor="report-paid" error={errors.reportPaid}>
                    <Input
                      id="report-paid"
                      type="number"
                      mono
                      min="0"
                      value={form.reportPaid}
                      onChange={(e) => handleChange('reportPaid', e.target.value)}
                      error={Boolean(errors.reportPaid)}
                      tabIndex={54}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Bill-style block for Report */}
            <div className="mt-6 pt-4 border-t border-hairline bg-surface-subtle p-3 rounded-[4px]">
              <div className="text-13 text-brand font-medium mb-1.5 flex items-center justify-between">
                <span>Report ledger summary</span>
                <span className="text-11 text-muted">Lab Desk</span>
              </div>
              <div className="space-y-1 font-mono text-15">
                <div className="flex justify-between items-center text-muted">
                  <span>Charge</span>
                  <span className="tabular-nums">{formatIndianCurrency(reportChargeNum)}</span>
                </div>
                <div className="flex justify-between items-center text-ink">
                  <span>Paid</span>
                  <span className="tabular-nums text-brand font-medium">{formatIndianCurrency(reportPaidNum)}</span>
                </div>
                <div className="flex justify-between items-center font-semibold pt-1 border-t border-hairline">
                  <span className={reportRemaining > 0 ? 'text-amber' : 'text-ink'}>Remaining</span>
                  <span className={`tabular-nums ${reportRemaining > 0 ? 'text-amber' : 'text-ink'}`}>
                    {formatIndianCurrency(reportRemaining)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Submit Action Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-hairline">
          <div className="text-13 text-muted">
            Total visit billing: <span className="font-mono font-semibold text-ink">{formatIndianCurrency(opdChargeNum + reportChargeNum)}</span>
            {' '}| Collected: <span className="font-mono font-semibold text-brand">{formatIndianCurrency(opdPaidNum + reportPaidNum)}</span>
            {opdRemaining + reportRemaining > 0 && (
              <span className="ml-1 text-amber">
                | Pending: <span className="font-mono font-semibold">{formatIndianCurrency(opdRemaining + reportRemaining)}</span>
              </span>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            className="w-full sm:w-auto px-8"
            tabIndex={60}
          >
            {saving ? 'Saving patient...' : 'Save patient'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AddPatient;
