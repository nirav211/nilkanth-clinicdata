// Nilkanth Clinic — Hybrid API & Ledger Data Layer
// Connects to backend API (http://localhost:5000/api) with MongoDB Atlas persistence,
// and seamless local fallback so the application works offline or online.

const API_BASE = '/api';
const STORAGE_KEY = 'nilkanth_clinic_data_v2';
const AUTH_KEY = 'nilkanth_clinic_auth_v1';

const getTodayIso = () => new Date().toISOString().slice(0, 10);
const TODAY = getTodayIso();

function getAuthToken() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw).token : null;
  } catch {
    return null;
  }
}

const INITIAL_PATIENTS = [
  {
    id: 'NK-2026-101',
    token: 1,
    name: 'Rameshchandra Patel',
    age: 62,
    gender: 'Male',
    phone: '9825012345',
    weight: '68',
    bp: '138/86',
    pulse: '74',
    temp: '98.4',
    complaints: 'Routine follow up for diabetes and blood pressure',
    diagnosis: 'Hypertension, T2DM',
    address: '14 Shrinath Society, Navrangpura, Ahmedabad',
    visitDate: TODAY,
    createdAt: `${TODAY}T08:30:00Z`,
    medicines: [
      { medicine: 'Telmisartan 40 mg', dosage: '1 tablet in morning', days: '30' },
      { medicine: 'Metformin 500 mg', dosage: '1 tablet after dinner', days: '30' },
      { medicine: 'Aspirin 75 mg', dosage: '1 tablet after lunch', days: '30' }
    ],
    opdCharge: 300,
    opdPaid: 300,
    opdRemaining: 0,
    reportName: 'Blood Sugar (Fasting & PP)',
    reportCharge: 250,
    reportPaid: 250,
    reportRemaining: 0,
    payments: [
      { id: 'PAY-101-1', date: TODAY, amount: 300, type: 'opd', note: 'Cash at counter' },
      { id: 'PAY-101-2', date: TODAY, amount: 250, type: 'report', note: 'UPI payment' }
    ]
  },
  {
    id: 'NK-2026-102',
    token: 2,
    name: 'Kavita Desai',
    age: 34,
    gender: 'Female',
    phone: '9898045678',
    weight: '54',
    bp: '118/78',
    pulse: '82',
    temp: '101.2',
    complaints: 'High fever, body ache and severe headache for 2 days',
    diagnosis: 'Acute Viral Fever',
    address: 'B-302 Prerna Apartment, Satellite, Ahmedabad',
    visitDate: TODAY,
    createdAt: `${TODAY}T09:15:00Z`,
    medicines: [
      { medicine: 'Paracetamol 650 mg', dosage: '1 tablet thrice a day after food', days: '3' },
      { medicine: 'Pantoprazole 40 mg', dosage: '1 tablet morning empty stomach', days: '5' }
    ],
    opdCharge: 300,
    opdPaid: 0,
    opdRemaining: 300,
    reportName: 'Complete Blood Count (CBC)',
    reportCharge: 350,
    reportPaid: 0,
    reportRemaining: 350,
    payments: []
  },
  {
    id: 'NK-2026-103',
    token: 3,
    name: 'Hitesh Shah',
    age: 45,
    gender: 'Male',
    phone: '9824098765',
    weight: '74',
    bp: '124/82',
    pulse: '78',
    temp: '99.1',
    complaints: 'Dry cough with throat congestion for 4 days',
    diagnosis: 'Acute Bronchitis',
    address: '42 Vallabh Park, Maninagar, Ahmedabad',
    visitDate: TODAY,
    createdAt: `${TODAY}T09:45:00Z`,
    medicines: [
      { medicine: 'Amoxicillin 500 mg', dosage: '1 capsule twice daily after meals', days: '5' },
      { medicine: 'Cetirizine 10 mg', dosage: '1 tablet at night', days: '5' }
    ],
    opdCharge: 300,
    opdPaid: 300,
    opdRemaining: 0,
    reportName: 'Chest X-Ray',
    reportCharge: 400,
    reportPaid: 200,
    reportRemaining: 200,
    payments: [
      { id: 'PAY-103-1', date: TODAY, amount: 300, type: 'opd', note: 'Cash' },
      { id: 'PAY-103-2', date: TODAY, amount: 200, type: 'report', note: 'Advance paid' }
    ]
  }
];

function getStoredPatients() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
      return [...INITIAL_PATIENTS];
    }
    return JSON.parse(raw);
  } catch {
    return [...INITIAL_PATIENTS];
  }
}

function saveStoredPatients(patients) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  } catch (e) {
    console.error('Failed to write to localStorage', e);
  }
}

const delay = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 1. login
 */
export async function login(email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.ok) {
      const data = await res.json();
      const sessionData = {
        user: {
          id: 'usr-jignesh-1',
          name: data.name || 'Dr. Jignesh Chauhan',
          email: email.toLowerCase().trim(),
          role: 'admin',
          qualification: 'B.A.M.S.'
        },
        token: data.token
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
      return sessionData;
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Email or password is wrong.');
    }
  } catch (err) {
    if (err.message === 'Email or password is wrong.' || (err.message && err.message.includes('Too many attempts'))) {
      throw err;
    }
    // Offline fallback for demo
    await delay(100);
    if (email.toLowerCase().trim() === 'admin@nilkanth.in' && password === 'admin') {
      const sessionData = {
        user: {
          id: 'usr-jignesh-1',
          name: 'Dr. Jignesh Chauhan',
          email: 'admin@nilkanth.in',
          role: 'admin',
          qualification: 'B.A.M.S.'
        },
        token: `nk_local_token_${Date.now()}`
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
      return sessionData;
    }
    throw new Error('Email or password is wrong.');
  }
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session.user;
  } catch {
    return null;
  }
}

export function logout() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {}
}

/**
 * 2. createPatient
 */
export async function createPatient(patientData) {
  const phoneClean = (patientData.phone || '').trim().replace(/\D/g, '');
  if (phoneClean.length !== 10) {
    throw new Error('Phone number must be 10 digits.');
  }

  const opdCharge = Number(patientData.opdCharge) || 0;
  const opdPaid = Number(patientData.opdPaid) || 0;
  const reportCharge = Number(patientData.reportCharge) || 0;
  const reportPaid = Number(patientData.reportPaid) || 0;

  if (opdPaid > opdCharge || reportPaid > reportCharge) {
    throw new Error('Paid amount cannot be more than the charge.');
  }

  const token = getAuthToken();
  if (token) {
    try {
      const payload = {
        name: patientData.name,
        age: Number(patientData.age) || null,
        phone: phoneClean,
        weight: patientData.weight,
        address: patientData.address,
        medicines: (patientData.medicines || [])
          .filter(m => (m.medicine || m.name || '').trim() !== '')
          .map(m => ({
            name: m.medicine || m.name,
            dosage: m.dosage || '',
            days: m.days || ''
          })),
        opdCharge,
        opdPaid,
        reportName: patientData.reportName || '',
        reportCharge,
        reportPaid,
        visitDate: patientData.visitDate || new Date().toISOString()
      };

      const res = await fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const p = await res.json();
        return {
          ...p,
          id: p.id || p._id,
          token: p.token || Math.floor(Math.random() * 20) + 1,
          medicines: (p.medicines || []).map(m => ({
            medicine: m.name || m.medicine,
            dosage: m.dosage,
            days: m.days
          }))
        };
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Could not save. Check the internet and try again. Your entry is still on the screen.');
      }
    } catch (e) {
      if (e.message && !e.message.includes('fetch')) {
        throw e;
      }
    }
  }

  // Local fallback
  await delay(120);
  const opdRemaining = Math.max(0, opdCharge - opdPaid);
  const reportRemaining = Math.max(0, reportCharge - reportPaid);
  const patients = getStoredPatients();
  const nextNum = 100 + patients.length + 1;
  const year = new Date().getFullYear();
  const id = `NK-${year}-${nextNum}`;
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.slice(0, 10);

  const newPatient = {
    id,
    token: patients.length + 1,
    name: (patientData.name || '').trim(),
    age: Number(patientData.age) || null,
    gender: patientData.gender || 'Male',
    phone: phoneClean,
    weight: (patientData.weight || '').trim(),
    bp: (patientData.bp || '').trim(),
    pulse: (patientData.pulse || '').trim(),
    temp: (patientData.temp || '').trim(),
    complaints: (patientData.complaints || '').trim(),
    diagnosis: (patientData.diagnosis || '').trim(),
    address: (patientData.address || '').trim(),
    visitDate: patientData.visitDate || todayStr,
    createdAt: nowIso,
    medicines: Array.isArray(patientData.medicines)
      ? patientData.medicines.filter(m => (m.medicine || '').trim() !== '')
      : [],
    opdCharge,
    opdPaid,
    opdRemaining,
    reportName: (patientData.reportName || '').trim(),
    reportCharge,
    reportPaid,
    reportRemaining,
    payments: opdPaid > 0 ? [{ id: `PAY-${Date.now()}`, date: todayStr, amount: opdPaid, type: 'opd' }] : []
  };

  patients.unshift(newPatient);
  saveStoredPatients(patients);
  return newPatient;
}

/**
 * 3. listPatients
 */
export async function listPatients(params = {}) {
  const token = getAuthToken();
  if (token) {
    try {
      const q = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/patients?${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = data.patients.map((p, idx) => ({
          ...p,
          id: p.id || p._id || `NK-${idx + 101}`,
          token: p.token || idx + 1,
          visitDate: p.visitDate ? p.visitDate.slice(0, 10) : TODAY,
          medicines: (p.medicines || []).map(m => ({
            medicine: m.name || m.medicine,
            dosage: m.dosage,
            days: m.days
          }))
        }));
        return {
          ...data,
          patients: normalized
        };
      }
    } catch (e) {
      // fallback
    }
  }

  // Local fallback
  await delay(80);
  const { search = '', date = '', page = 1, limit = 12 } = params;
  let list = getStoredPatients();

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.diagnosis && p.diagnosis.toLowerCase().includes(q)) ||
      (p.address && p.address.toLowerCase().includes(q))
    );
  }

  if (date) {
    list = list.filter(p => p.visitDate === date);
  }

  const total = list.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, parseInt(limit, 10) || 12);
  const totalPages = Math.ceil(total / pageSize) || 1;
  const startIndex = (pageNum - 1) * pageSize;
  const patients = list.slice(startIndex, startIndex + pageSize);

  return { patients, total, page: pageNum, limit: pageSize, totalPages };
}

/**
 * 4. getPatient
 */
export async function getPatient(id) {
  const token = getAuthToken();
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const p = await res.json();
        return {
          ...p,
          id: p.id || p._id,
          token: p.token || 1,
          visitDate: p.visitDate ? p.visitDate.slice(0, 10) : TODAY,
          medicines: (p.medicines || []).map(m => ({
            medicine: m.name || m.medicine,
            dosage: m.dosage,
            days: m.days
          }))
        };
      }
    } catch (e) {}
  }

  await delay(50);
  const patients = getStoredPatients();
  const p = patients.find(p => p.id === id || p._id === id);
  if (!p) throw new Error('Patient record not found.');
  return { ...p };
}

/**
 * 5. addPayment
 */
export async function addPayment(patientId, paymentData) {
  const token = getAuthToken();
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/patients/${patientId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });
      if (res.ok) {
        return await res.json();
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Payment recording failed');
      }
    } catch (e) {
      if (e.message && !e.message.includes('fetch')) throw e;
    }
  }

  await delay(80);
  const patients = getStoredPatients();
  const index = patients.findIndex(p => p.id === patientId || p._id === patientId);
  if (index === -1) throw new Error('Patient not found.');

  const patient = { ...patients[index] };
  const amount = Number(paymentData.amount) || 0;
  const type = paymentData.type === 'report' ? 'report' : 'opd';

  if (amount <= 0) throw new Error('Enter a valid payment amount.');

  if (type === 'opd') {
    if (amount > patient.opdRemaining) throw new Error('Paid amount cannot be more than the charge.');
    patient.opdPaid += amount;
    patient.opdRemaining = Math.max(0, patient.opdCharge - patient.opdPaid);
  } else {
    if (amount > patient.reportRemaining) throw new Error('Paid amount cannot be more than the charge.');
    patient.reportPaid += amount;
    patient.reportRemaining = Math.max(0, patient.reportCharge - patient.reportPaid);
  }

  const newPayment = {
    id: `PAY-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    amount,
    type,
    note: paymentData.note || 'Payment recorded'
  };

  patient.payments = [...(patient.payments || []), newPayment];
  patients[index] = patient;
  saveStoredPatients(patients);

  return { patient, payment: newPayment };
}

/**
 * 6. reportOpd
 */
export async function reportOpd(params = {}) {
  const token = getAuthToken();
  if (token) {
    try {
      const q = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/reports/opd?${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
  }

  await delay(50);
  const list = getStoredPatients();
  const items = list.map(p => ({
    patientId: p.id,
    token: p.token,
    patientName: p.name,
    phone: p.phone,
    date: p.visitDate,
    charge: p.opdCharge,
    paid: p.opdPaid,
    remaining: p.opdRemaining,
    status: p.opdRemaining === 0 ? 'Settled' : (p.opdPaid > 0 ? 'Partial' : 'Pending')
  }));
  const totals = items.reduce((acc, c) => ({
    charge: acc.charge + c.charge,
    paid: acc.paid + c.paid,
    remaining: acc.remaining + c.remaining
  }), { charge: 0, paid: 0, remaining: 0 });
  return { date: params.date || 'All records', items, totals };
}

/**
 * 7. reportCharge
 */
export async function reportCharge(params = {}) {
  const token = getAuthToken();
  if (token) {
    try {
      const q = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/reports/charge?${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
  }

  await delay(50);
  const list = getStoredPatients();
  const items = list.filter(p => p.reportCharge > 0 || p.reportName).map(p => ({
    patientId: p.id,
    token: p.token,
    patientName: p.name,
    reportName: p.reportName || 'Diagnostic Report',
    phone: p.phone,
    date: p.visitDate,
    charge: p.reportCharge,
    paid: p.reportPaid,
    remaining: p.reportRemaining,
    status: p.reportRemaining === 0 ? 'Settled' : (p.reportPaid > 0 ? 'Partial' : 'Pending')
  }));
  const totals = items.reduce((acc, c) => ({
    charge: acc.charge + c.charge,
    paid: acc.paid + c.paid,
    remaining: acc.remaining + c.remaining
  }), { charge: 0, paid: 0, remaining: 0 });
  return { date: params.date || 'All records', items, totals };
}

/**
 * 8. reportCombined
 */
export async function reportCombined(params = {}) {
  const token = getAuthToken();
  if (token) {
    try {
      const q = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE}/reports/combined?${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (e) {}
  }

  await delay(50);
  const list = getStoredPatients();
  const items = list.map(p => {
    const totalCharge = p.opdCharge + p.reportCharge;
    const totalPaid = p.opdPaid + p.reportPaid;
    const totalRemaining = p.opdRemaining + p.reportRemaining;
    return {
      patientId: p.id,
      token: p.token,
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
  const totals = items.reduce((acc, c) => ({
    opdCharge: acc.opdCharge + c.opdCharge,
    opdPaid: acc.opdPaid + c.opdPaid,
    opdRemaining: acc.opdRemaining + c.opdRemaining,
    reportCharge: acc.reportCharge + c.reportCharge,
    reportPaid: acc.reportPaid + c.reportPaid,
    reportRemaining: acc.reportRemaining + c.reportRemaining,
    charge: acc.charge + c.totalCharge,
    paid: acc.paid + c.totalPaid,
    remaining: acc.remaining + c.totalRemaining
  }), {
    opdCharge: 0, opdPaid: 0, opdRemaining: 0,
    reportCharge: 0, reportPaid: 0, reportRemaining: 0,
    charge: 0, paid: 0, remaining: 0
  });
  return { date: params.date || 'All records', items, totals };
}

export function resetMockData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
}
