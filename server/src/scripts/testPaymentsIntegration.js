import '../config/env.js';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, Patient, Payment } from '../models/index.js';
import jwt from 'jsonwebtoken';
import http from 'http';

async function runTests() {
  console.log('--- Starting Nilkanth Clinic Payment Integration Tests ---');
  await connectDB();

  process.env.NODE_ENV = 'test';
  const { default: app } = await import('../server.js');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Ephemeral test server running at ${baseUrl}`);

  try {
    // 1. Get admin user and generate auth token
    const user = await User.findOne({ email: 'dr.jignesh@nilkanth.clinic' }) || await User.findOne({});
    if (!user) throw new Error('No user found');
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Test: Save a patient with part payment
    console.log('\n1. Testing patient creation with part payment...');
    const patientPayload = {
      name: 'Kavita Desai Test',
      phone: '9876543210',
      age: 38,
      gender: 'female',
      opdCharge: 500,
      opdPaid: 300,
      reportName: 'Hemogram Test',
      reportCharge: 200,
      reportPaid: 100,
      paymentMode: 'upi',
      visitDate: new Date().toISOString()
    };

    const createRes = await fetch(`${baseUrl}/api/patients`, {
      method: 'POST',
      headers,
      body: JSON.stringify(patientPayload)
    });
    const createdPatient = await createRes.json();

    if (createRes.status !== 201) {
      throw new Error(`Failed to create patient: ${createRes.status} ${JSON.stringify(createdPatient)}`);
    }

    console.log(`✓ Patient created: ${createdPatient.name} (ID: ${createdPatient._id})`);
    console.log(`  OPD: ${createdPatient.opdPaid}/${createdPatient.opdCharge} (rem: ${createdPatient.opdRemaining})`);
    console.log(`  Report: ${createdPatient.reportPaid}/${createdPatient.reportCharge} (rem: ${createdPatient.reportRemaining})`);

    // Verify initial Payment records were created
    const initialPayments = await Payment.find({ patientId: createdPatient._id }).sort({ paidAt: -1 });
    if (initialPayments.length !== 2) {
      throw new Error(`Expected 2 initial payment records, found ${initialPayments.length}`);
    }
    console.log(`✓ Initial payment records automatically created (count: ${initialPayments.length})`);
    console.log(`  Initial Payment 1: ₹${initialPayments[0].amount} (${initialPayments[0].type}) via ${initialPayments[0].mode} at ${initialPayments[0].paidAt}`);
    console.log(`  Initial Payment 2: ₹${initialPayments[1].amount} (${initialPayments[1].type}) via ${initialPayments[1].mode} at ${initialPayments[1].paidAt}`);

    // Small delay to ensure timestamp difference
    await new Promise(r => setTimeout(r, 1200));

    // 3. Test: Receive remaining payment later
    console.log('\n2. Testing receiving the remaining payment later...');
    const payRes = await fetch(`${baseUrl}/api/patients/${createdPatient._id}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 200,
        type: 'opd',
        mode: 'cash',
        note: 'Settled remaining at evening'
      })
    });
    const payData = await payRes.json();

    if (payRes.status !== 200) {
      throw new Error(`Failed to add payment: ${payRes.status} ${JSON.stringify(payData)}`);
    }
    console.log(`✓ Remaining payment received: ₹${payData.payment.amount} via ${payData.payment.mode} on ${payData.payment.paidAtLabel}`);

    // Verify GET /api/patients/:id returns payments newest first with distinct times
    const detailRes = await fetch(`${baseUrl}/api/patients/${createdPatient._id}`, { headers });
    const detailData = await detailRes.json();
    const paymentsList = detailData.payments;

    console.log(`✓ GET /api/patients/:id returned ${paymentsList.length} payments:`);
    for (const p of paymentsList) {
      console.log(`   - ₹${p.amount} (${p.type}) | Mode: ${p.mode} | Time: ${p.paidAtLabel} (${p.paidAt})`);
    }

    if (paymentsList.length !== 3) {
      throw new Error(`Expected 3 total payments, got ${paymentsList.length}`);
    }

    // Assert different timestamps
    const time1 = new Date(paymentsList[0].paidAt).getTime();
    const time2 = new Date(paymentsList[1].paidAt).getTime();
    if (time1 === time2) {
      throw new Error('Expected different timestamps for subsequent payment');
    }
    console.log('✓ Distinct timestamps verified between initial and later payments');

    // 4. Test: Try future date and amount above remaining (both must be refused)
    console.log('\n3. Testing validation & refusal rules...');
    
    // 4a. Future date check
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const futureRes = await fetch(`${baseUrl}/api/patients/${createdPatient._id}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 50,
        type: 'report',
        mode: 'upi',
        paidAt: futureDate
      })
    });
    const futureData = await futureRes.json();

    if (futureRes.status === 400 && futureData.error?.includes('future')) {
      console.log(`✓ Future date refused as expected: 400 "${futureData.error}"`);
    } else {
      throw new Error(`Future date should have been refused with 400, got: ${futureRes.status} ${JSON.stringify(futureData)}`);
    }

    // 4b. Amount above remaining check
    // OPD remaining is now 0 (500 - 300 - 200 = 0)
    const exceedRes = await fetch(`${baseUrl}/api/patients/${createdPatient._id}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 50,
        type: 'opd',
        mode: 'cash'
      })
    });
    const exceedData = await exceedRes.json();

    if (exceedRes.status === 400 && exceedData.error?.includes('remaining')) {
      console.log(`✓ Amount exceeding remaining refused as expected: 400 "${exceedData.error}"`);
    } else {
      throw new Error(`Exceeding amount should have been refused with 400, got: ${exceedRes.status} ${JSON.stringify(exceedData)}`);
    }

    // 4c. Date before visit date check
    const pastDate = new Date('2020-01-01T00:00:00.000Z').toISOString();
    const pastRes = await fetch(`${baseUrl}/api/patients/${createdPatient._id}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 50,
        type: 'report',
        mode: 'cash',
        paidAt: pastDate
      })
    });
    const pastData = await pastRes.json();

    if (pastRes.status === 400 && pastData.error?.includes('visit date')) {
      console.log(`✓ Date before visit date refused as expected: 400 "${pastData.error}"`);
    } else {
      throw new Error(`Date before visit date should have been refused with 400, got: ${pastRes.status} ${JSON.stringify(pastData)}`);
    }

    // 5. Test: Check that totals in "Payments received" report match individual payments sum
    console.log('\n4. Testing GET /api/reports/payments consistency...');
    const reportRes = await fetch(`${baseUrl}/api/reports/payments`, { headers });
    const reportData = await reportRes.json();

    if (reportRes.status !== 200) {
      throw new Error(`Failed to get payments report: ${reportRes.status}`);
    }

    const { payments, totals, grandTotal } = reportData;
    console.log(`✓ Payments report returned ${payments.length} payments.`);
    
    // Sum individual payments manually
    const manualSum = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const reportSum = grandTotal.totalAmount;
    console.log(`  Manual sum of individual payment rows: ₹${manualSum}`);
    console.log(`  Report grandTotal.totalAmount:         ₹${reportSum}`);
    
    if (manualSum !== reportSum) {
      throw new Error(`Report grand total mismatch! Manual: ${manualSum}, Reported: ${reportSum}`);
    }
    console.log('✓ Grand total EXACTLY MATCHES sum of individual payment records!');

    // Check by-mode sums match
    const modeSum = (totals.byMode.cash || 0) + (totals.byMode.upi || 0) + (totals.byMode.card || 0) + (totals.byMode.other || 0);
    console.log(`  Sum of totals by mode (Cash: ${totals.byMode.cash}, UPI: ${totals.byMode.upi}, Card: ${totals.byMode.card}, Other: ${totals.byMode.other}): ₹${modeSum}`);
    if (modeSum !== reportSum) {
      throw new Error(`Mode totals sum mismatch! Mode sum: ${modeSum}, Reported: ${reportSum}`);
    }
    console.log('✓ Mode breakdown sum EXACTLY MATCHES grand total!');

    // 6. Test: Check daysPending in OPD and Report charge reports
    console.log('\n5. Testing daysPending in pending lists...');
    const opdRes = await fetch(`${baseUrl}/api/reports/opd?pending=true`, { headers });
    const opdData = await opdRes.json();
    const opdPending = opdData.patients || [];
    if (opdPending.length > 0) {
      console.log(`✓ OPD pending patients count: ${opdPending.length}, sample patient daysPending: ${opdPending[0].daysPending}`);
      if (opdPending[0].daysPending === undefined) {
        throw new Error('daysPending missing from OPD pending patient');
      }
    }

    // 7. Cleanup test records
    await Payment.deleteMany({ patientId: createdPatient._id });
    await Patient.findByIdAndDelete(createdPatient._id);
    console.log('\n✓ Test records cleaned up successfully.');

    console.log('\n======================================================');
    console.log('ALL INTEGRATION AND VALIDATION TESTS PASSED CLEANLY!');
    console.log('======================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
}

runTests().catch(err => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
