// Nilkanth Clinic — Production Axios API Client
// Connects directly to backend API (/api) backed by MongoDB Atlas.
// Stores JWT in localStorage, sends Bearer token on every request,
// and redirects to /login on 401 Unauthorized responses.

import axios from 'axios';
import { formatDateTime } from '../components/DateText';

const API_BASE = typeof window !== 'undefined' ? '/api' : (process.env.API_URL || 'http://127.0.0.1:5000/api');
const AUTH_KEY = 'nilkanth_clinic_auth_v1';

// Create configured axios instance
export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper to get stored auth token
export function getAuthToken() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw).token : null;
  } catch {
    return null;
  }
}

// 1. Request Interceptor: Attach JWT Bearer token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Catch 401 Unauthorized, clear storage, and redirect to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      try {
        localStorage.removeItem(AUTH_KEY);
      } catch {}

      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Normalization helper for patient documents
function normalizePatient(p, idx = 0) {
  if (!p) return null;
  const id = p.id || p._id;
  const visitDateStr = p.visitDate
    ? (typeof p.visitDate === 'string' ? p.visitDate.slice(0, 10) : new Date(p.visitDate).toISOString().slice(0, 10))
    : new Date().toISOString().slice(0, 10);

  const opdCharge = Number(p.opdCharge) || 0;
  const opdPaid = Number(p.opdPaid) || 0;
  const opdRemaining = p.opdRemaining !== undefined
    ? Number(p.opdRemaining)
    : Math.max(0, opdCharge - opdPaid);

  const reportCharge = Number(p.reportCharge) || 0;
  const reportPaid = Number(p.reportPaid) || 0;
  const reportRemaining = p.reportRemaining !== undefined
    ? Number(p.reportRemaining)
    : Math.max(0, reportCharge - reportPaid);

  const lastPaymentAt = p.lastPaymentAt ? (typeof p.lastPaymentAt === 'string' ? p.lastPaymentAt : new Date(p.lastPaymentAt).toISOString()) : null;
  const lastPaymentAtLabel = p.lastPaymentAtLabel || (lastPaymentAt ? formatDateTime(lastPaymentAt) : '');

  return {
    ...p,
    id: String(id),
    _id: String(id),
    token: p.token || idx + 1,
    visitDate: visitDateStr,
    opdCharge,
    opdPaid,
    opdRemaining,
    reportName: p.reportName || '',
    reportCharge,
    reportPaid,
    reportRemaining,
    totalRemaining: opdRemaining + reportRemaining,
    lastPaymentAt,
    lastPaymentAtLabel,
    medicines: (p.medicines || []).map(m => ({
      name: m.name || m.medicine || '',
      medicine: m.medicine || m.name || '',
      dosage: m.dosage || '',
      days: m.days || ''
    }))
  };
}

/**
 * 1. login
 */
export async function login(email, password) {
  try {
    const res = await api.post('/auth/login', { email, password });
    const data = res.data;
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
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Email or password is wrong.';
    throw new Error(msg);
  }
}

/**
 * getCurrentUser
 */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session.user || null;
  } catch {
    return null;
  }
}

/**
 * logout
 */
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

  const payload = {
    name: patientData.name,
    age: Number(patientData.age) || null,
    phone: phoneClean,
    weight: patientData.weight || '',
    address: patientData.address || '',
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
    visitDate: patientData.visitDate || new Date().toISOString(),
    paymentMode: patientData.paymentMode || patientData.mode || 'cash'
  };

  try {
    const res = await api.post('/patients', payload);
    return normalizePatient(res.data);
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Could not save. Check the internet and try again. Your entry is still on the screen.';
    throw new Error(msg);
  }
}

/**
 * 3. listPatients
 */
export async function listPatients(params = {}) {
  try {
    const res = await api.get('/patients', { params });
    const data = res.data;
    const normalized = (data.patients || []).map((p, idx) => normalizePatient(p, idx));

    return {
      patients: normalized,
      total: data.total || normalized.length,
      page: data.page || 1,
      limit: data.limit || 12,
      totalPages: data.totalPages || 1
    };
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Could not load patient list.';
    throw new Error(msg);
  }
}

/**
 * 4. getPatient
 * Returns patient with payments sorted newest first, with paidAt & paidAtLabel
 */
export async function getPatient(id) {
  try {
    const res = await api.get(`/patients/${id}`);
    const normalized = normalizePatient(res.data);
    const payments = (res.data.payments || []).map(pm => {
      const pDate = pm.paidAt || pm.date || pm.createdAt;
      return {
        ...pm,
        id: pm.id || pm._id,
        _id: pm._id || pm.id,
        amount: Number(pm.amount) || 0,
        type: pm.type || 'opd',
        mode: pm.mode || 'cash',
        note: pm.note || '',
        paidAt: pDate ? new Date(pDate).toISOString() : '',
        paidAtLabel: pm.paidAtLabel || (pDate ? formatDateTime(pDate) : '—')
      };
    });

    return {
      ...normalized,
      payments
    };
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Patient record not found.';
    throw new Error(msg);
  }
}

/**
 * 5. addPayment
 * Accepts amount, type, mode, note, optional paidAt
 */
export async function addPayment(patientId, paymentData) {
  try {
    const res = await api.post(`/patients/${patientId}/payments`, paymentData);
    const data = res.data;
    const pm = data.payment || {};
    const pDate = pm.paidAt || pm.date || pm.createdAt;

    return {
      patient: normalizePatient(data.patient),
      payment: {
        ...pm,
        id: pm.id || pm._id,
        _id: pm._id || pm.id,
        amount: Number(pm.amount) || 0,
        type: pm.type || 'opd',
        mode: pm.mode || 'cash',
        note: pm.note || '',
        paidAt: pDate ? new Date(pDate).toISOString() : '',
        paidAtLabel: pm.paidAtLabel || (pDate ? formatDateTime(pDate) : '—')
      }
    };
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Payment recording failed.';
    throw new Error(msg);
  }
}

/**
 * 6. reportOpd
 */
export async function reportOpd(params = {}) {
  try {
    const res = await api.get('/reports/opd', { params });
    const data = res.data;
    const normalizedItems = (data.patients || data.items || []).map((p, idx) => ({
      patientId: p.patientId || p.id || p._id,
      id: p.id || p._id,
      token: p.token || idx + 1,
      patientName: p.patientName || p.name,
      name: p.name || p.patientName,
      phone: p.phone,
      date: p.visitDate ? (typeof p.visitDate === 'string' ? p.visitDate.slice(0, 10) : new Date(p.visitDate).toISOString().slice(0, 10)) : '',
      charge: p.opdCharge !== undefined ? p.opdCharge : (p.charge || 0),
      paid: p.opdPaid !== undefined ? p.opdPaid : (p.paid || 0),
      remaining: p.opdRemaining !== undefined ? p.opdRemaining : (p.remaining || 0),
      opdCharge: p.opdCharge !== undefined ? p.opdCharge : (p.charge || 0),
      opdPaid: p.opdPaid !== undefined ? p.opdPaid : (p.paid || 0),
      opdRemaining: p.opdRemaining !== undefined ? p.opdRemaining : (p.remaining || 0),
      daysPending: p.daysPending !== undefined ? p.daysPending : 0,
      status: p.status || ((p.opdRemaining || p.remaining) === 0 ? 'Settled' : ((p.opdPaid || p.paid) > 0 ? 'Partial' : 'Pending'))
    }));

    const totals = {
      charge: data.totals?.charge !== undefined ? data.totals.charge : (data.totals?.opdCharge || 0),
      paid: data.totals?.paid !== undefined ? data.totals.paid : (data.totals?.opdPaid || 0),
      remaining: data.totals?.remaining !== undefined ? data.totals.remaining : (data.totals?.opdRemaining || 0),
      opdCharge: data.totals?.opdCharge || data.totals?.charge || 0,
      opdPaid: data.totals?.opdPaid || data.totals?.paid || 0,
      opdRemaining: data.totals?.opdRemaining || data.totals?.remaining || 0
    };

    return {
      date: params.date || params.from || 'All records',
      items: normalizedItems,
      patients: normalizedItems,
      totals
    };
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Could not load report data.';
    throw new Error(msg);
  }
}

/**
 * 7. reportCharge
 */
export async function reportCharge(params = {}) {
  try {
    const res = await api.get('/reports/report-charge', { params });
    const data = res.data;
    const normalizedItems = (data.patients || data.items || []).map((p, idx) => ({
      patientId: p.patientId || p.id || p._id,
      id: p.id || p._id,
      token: p.token || idx + 1,
      patientName: p.patientName || p.name,
      name: p.name || p.patientName,
      reportName: p.reportName || 'Diagnostic Report',
      phone: p.phone,
      date: p.visitDate ? (typeof p.visitDate === 'string' ? p.visitDate.slice(0, 10) : new Date(p.visitDate).toISOString().slice(0, 10)) : '',
      charge: p.reportCharge !== undefined ? p.reportCharge : (p.charge || 0),
      paid: p.reportPaid !== undefined ? p.reportPaid : (p.paid || 0),
      remaining: p.reportRemaining !== undefined ? p.reportRemaining : (p.remaining || 0),
      reportCharge: p.reportCharge !== undefined ? p.reportCharge : (p.charge || 0),
      reportPaid: p.reportPaid !== undefined ? p.reportPaid : (p.paid || 0),
      reportRemaining: p.reportRemaining !== undefined ? p.reportRemaining : (p.remaining || 0),
      daysPending: p.daysPending !== undefined ? p.daysPending : 0,
      status: p.status || ((p.reportRemaining || p.remaining) === 0 ? 'Settled' : ((p.reportPaid || p.paid) > 0 ? 'Partial' : 'Pending'))
    }));

    const totals = {
      charge: data.totals?.charge !== undefined ? data.totals.charge : (data.totals?.reportCharge || 0),
      paid: data.totals?.paid !== undefined ? data.totals.paid : (data.totals?.reportPaid || 0),
      remaining: data.totals?.remaining !== undefined ? data.totals.remaining : (data.totals?.reportRemaining || 0),
      reportCharge: data.totals?.reportCharge || data.totals?.charge || 0,
      reportPaid: data.totals?.reportPaid || data.totals?.paid || 0,
      reportRemaining: data.totals?.reportRemaining || data.totals?.remaining || 0
    };

    return {
      date: params.date || params.from || 'All records',
      items: normalizedItems,
      patients: normalizedItems,
      totals
    };
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Could not load report data.';
    throw new Error(msg);
  }
}

/**
 * 8. reportCombined
 */
export async function reportCombined(params = {}) {
  try {
    const res = await api.get('/reports/combined', { params });
    const data = res.data;
    const dates = data.dates || [];
    const grandTotal = data.grandTotal || data.totals || {
      patientCount: 0,
      opdCharge: 0,
      reportCharge: 0,
      totalPaid: 0,
      totalRemaining: 0,
      totalCharge: 0
    };

    const items = dates.map((d, idx) => ({
      ...d,
      token: idx + 1,
      patientName: d.date ? `${d.patientCount} patients on ${d.date}` : '',
      date: d.date,
      charge: d.totalCharge || ((d.opdCharge || 0) + (d.reportCharge || 0)),
      paid: d.totalPaid || 0,
      remaining: d.totalRemaining || 0,
      status: (d.totalRemaining || 0) === 0 ? 'Settled' : ((d.totalPaid || 0) > 0 ? 'Partial' : 'Pending')
    }));

    return {
      date: params.date || params.from || 'All records',
      items,
      dates,
      grandTotal,
      totals: {
        ...grandTotal,
        charge: grandTotal.totalCharge || ((grandTotal.opdCharge || 0) + (grandTotal.reportCharge || 0)),
        paid: grandTotal.totalPaid || 0,
        remaining: grandTotal.totalRemaining || 0
      },
      rows: data.rows || items
    };
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Could not load report data.';
    throw new Error(msg);
  }
}

/**
 * 9. reportPayments
 * Payments received report with totals by day, by mode and grand total
 */
export async function reportPayments(params = {}) {
  try {
    const res = await api.get('/reports/payments', { params });
    const data = res.data;
    const payments = (data.payments || data.items || []).map(p => ({
      ...p,
      id: p.id || p._id,
      paidAtLabel: p.paidAtLabel || (p.paidAt ? formatDateTime(p.paidAt) : '—')
    }));

    return {
      payments,
      items: payments,
      totals: data.totals || {
        byDay: [],
        byType: { opd: 0, report: 0 },
        byMode: { cash: 0, upi: 0, card: 0, other: 0 },
        grandTotal: { totalAmount: 0, totalCount: 0 }
      },
      grandTotal: data.grandTotal || { totalAmount: 0, totalCount: 0 }
    };
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Could not load payments report.';
    throw new Error(msg);
  }
}

export function resetMockData() {
  // Production real API active
}

export default {
  api,
  login,
  getCurrentUser,
  logout,
  createPatient,
  listPatients,
  getPatient,
  addPayment,
  reportOpd,
  reportCharge,
  reportCombined,
  reportPayments,
  resetMockData
};
