import '../config/env.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, Patient } from '../models/index.js';

process.env.NODE_ENV = 'test';

// Format date to YYYY-MM-DD in Asia/Kolkata
function toKolkataDateString(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function makeRequest(server, path, token) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              body: JSON.parse(data)
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              body: data
            });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('   Nilkanth Clinic — Reports API Verification Suite     ');
  console.log('========================================================\n');

  let server;

  try {
    await connectDB();
    const { default: app } = await import('../server.js');

    // 1. Authenticate user
    const adminEmail = process.env.ADMIN_EMAIL.toLowerCase().trim();
    const user = await User.findOne({ email: adminEmail });
    if (!user) {
      throw new Error(`Admin user not found for email: ${adminEmail}`);
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    // 2. Start temporary in-memory HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    console.log(`Test server running on port ${port}\n`);

    // 3. Load all active patients from DB directly
    const rawPatients = await Patient.find({ isDeleted: false }).lean();
    console.log(`Loaded ${rawPatients.length} active patients from MongoDB.`);

    // --- HAND CALCULATIONS ---
    // A. OPD Hand Totals
    let handOpdCharge = 0;
    let handOpdPaid = 0;
    let handOpdRemaining = 0;
    const handOpdPatients = [];
    const handOpdPendingPatients = [];

    for (const p of rawPatients) {
      const charge = p.opdCharge || 0;
      const paid = p.opdPaid || 0;
      const remaining = Math.max(0, charge - paid);

      handOpdCharge += charge;
      handOpdPaid += paid;
      handOpdRemaining += remaining;

      const item = {
        name: p.name,
        phone: p.phone,
        visitDate: p.visitDate,
        opdCharge: charge,
        opdPaid: paid,
        opdRemaining: remaining
      };
      handOpdPatients.push(item);
      if (remaining > 0) {
        handOpdPendingPatients.push(item);
      }
    }

    // Sort hand list by largest remaining first
    handOpdPatients.sort((a, b) => b.opdRemaining - a.opdRemaining);
    handOpdPendingPatients.sort((a, b) => b.opdRemaining - a.opdRemaining);

    // B. Report Charge Hand Totals
    let handReportCharge = 0;
    let handReportPaid = 0;
    let handReportRemaining = 0;
    const handReportPatients = [];
    const handReportPendingPatients = [];

    for (const p of rawPatients) {
      const charge = p.reportCharge || 0;
      if (charge > 0) {
        const paid = p.reportPaid || 0;
        const remaining = Math.max(0, charge - paid);

        handReportCharge += charge;
        handReportPaid += paid;
        handReportRemaining += remaining;

        const item = {
          name: p.name,
          phone: p.phone,
          reportName: p.reportName,
          visitDate: p.visitDate,
          reportCharge: charge,
          reportPaid: paid,
          reportRemaining: remaining
        };
        handReportPatients.push(item);
        if (remaining > 0) {
          handReportPendingPatients.push(item);
        }
      }
    }

    handReportPatients.sort((a, b) => b.reportRemaining - a.reportRemaining);
    handReportPendingPatients.sort((a, b) => b.reportRemaining - a.reportRemaining);

    // C. Combined Hand Totals by Date (Asia/Kolkata)
    const handDateGroups = {};
    let handCombinedGrandPatientCount = 0;
    let handCombinedGrandOpd = 0;
    let handCombinedGrandReport = 0;
    let handCombinedGrandPaid = 0;
    let handCombinedGrandRemaining = 0;

    for (const p of rawPatients) {
      const dateStr = toKolkataDateString(p.visitDate);
      const opdCharge = p.opdCharge || 0;
      const opdPaid = p.opdPaid || 0;
      const opdRem = Math.max(0, opdCharge - opdPaid);

      const reportCharge = p.reportCharge || 0;
      const reportPaid = p.reportPaid || 0;
      const reportRem = Math.max(0, reportCharge - reportPaid);

      const totalPaid = opdPaid + reportPaid;
      const totalRemaining = opdRem + reportRem;

      if (!handDateGroups[dateStr]) {
        handDateGroups[dateStr] = {
          date: dateStr,
          patientCount: 0,
          opdCharge: 0,
          reportCharge: 0,
          totalPaid: 0,
          totalRemaining: 0
        };
      }

      handDateGroups[dateStr].patientCount += 1;
      handDateGroups[dateStr].opdCharge += opdCharge;
      handDateGroups[dateStr].reportCharge += reportCharge;
      handDateGroups[dateStr].totalPaid += totalPaid;
      handDateGroups[dateStr].totalRemaining += totalRemaining;

      handCombinedGrandPatientCount += 1;
      handCombinedGrandOpd += opdCharge;
      handCombinedGrandReport += reportCharge;
      handCombinedGrandPaid += totalPaid;
      handCombinedGrandRemaining += totalRemaining;
    }

    // --- API CALLS & COMPARISONS ---
    let allPassed = true;

    // Test 1: GET /api/reports/opd
    console.log('--- TEST 1: GET /api/reports/opd ---');
    const resOpd = await makeRequest(server, '/api/reports/opd', token);
    const apiOpdTotals = resOpd.body.totals;
    const apiOpdPatients = resOpd.body.patients || [];

    const opdMatch =
      resOpd.statusCode === 200 &&
      apiOpdTotals.opdCharge === handOpdCharge &&
      apiOpdTotals.opdPaid === handOpdPaid &&
      apiOpdTotals.opdRemaining === handOpdRemaining &&
      apiOpdPatients.length === handOpdPatients.length;

    console.log(`API OPD Charge:    ₹${apiOpdTotals?.opdCharge} | Hand: ₹${handOpdCharge} -> ${apiOpdTotals?.opdCharge === handOpdCharge ? 'MATCH' : 'MISMATCH'}`);
    console.log(`API OPD Paid:      ₹${apiOpdTotals?.opdPaid} | Hand: ₹${handOpdPaid} -> ${apiOpdTotals?.opdPaid === handOpdPaid ? 'MATCH' : 'MISMATCH'}`);
    console.log(`API OPD Remaining: ₹${apiOpdTotals?.opdRemaining} | Hand: ₹${handOpdRemaining} -> ${apiOpdTotals?.opdRemaining === handOpdRemaining ? 'MATCH' : 'MISMATCH'}`);
    console.log(`API Patient Count: ${apiOpdPatients.length} | Hand: ${handOpdPatients.length} -> ${apiOpdPatients.length === handOpdPatients.length ? 'MATCH' : 'MISMATCH'}`);

    // Verify sorted descending by opdRemaining
    let opdSorted = true;
    for (let i = 0; i < apiOpdPatients.length - 1; i++) {
      if (apiOpdPatients[i].opdRemaining < apiOpdPatients[i + 1].opdRemaining) {
        opdSorted = false;
        break;
      }
    }
    console.log(`Sorted largest remaining first: ${opdSorted ? 'YES' : 'NO'}`);

    if (opdMatch && opdSorted) {
      console.log('👉 RESULT: PASSED (All OPD totals and sorting matched by hand)\n');
    } else {
      console.log('👉 RESULT: FAILED\n');
      allPassed = false;
    }

    // Test 2: GET /api/reports/opd?pending=true
    console.log('--- TEST 2: GET /api/reports/opd?pending=true ---');
    const resOpdPending = await makeRequest(server, '/api/reports/opd?pending=true', token);
    const apiOpdPendingList = resOpdPending.body.patients || [];
    const pendingMatch =
      resOpdPending.statusCode === 200 &&
      apiOpdPendingList.length === handOpdPendingPatients.length &&
      apiOpdPendingList.every(p => p.opdRemaining > 0);

    console.log(`API Pending Patients: ${apiOpdPendingList.length} | Hand: ${handOpdPendingPatients.length} -> ${pendingMatch ? 'MATCH' : 'MISMATCH'}`);
    if (pendingMatch) {
      console.log('👉 RESULT: PASSED (Only patients with remaining OPD charge returned)\n');
    } else {
      console.log('👉 RESULT: FAILED\n');
      allPassed = false;
    }

    // Test 3: GET /api/reports/report-charge
    console.log('--- TEST 3: GET /api/reports/report-charge ---');
    const resReport = await makeRequest(server, '/api/reports/report-charge', token);
    const apiReportTotals = resReport.body.totals;
    const apiReportPatients = resReport.body.patients || [];

    const reportMatch =
      resReport.statusCode === 200 &&
      apiReportTotals.reportCharge === handReportCharge &&
      apiReportTotals.reportPaid === handReportPaid &&
      apiReportTotals.reportRemaining === handReportRemaining &&
      apiReportPatients.length === handReportPatients.length &&
      apiReportPatients.every(p => p.reportCharge > 0);

    console.log(`API Report Charge:    ₹${apiReportTotals?.reportCharge} | Hand: ₹${handReportCharge} -> ${apiReportTotals?.reportCharge === handReportCharge ? 'MATCH' : 'MISMATCH'}`);
    console.log(`API Report Paid:      ₹${apiReportTotals?.reportPaid} | Hand: ₹${handReportPaid} -> ${apiReportTotals?.reportPaid === handReportPaid ? 'MATCH' : 'MISMATCH'}`);
    console.log(`API Report Remaining: ₹${apiReportTotals?.reportRemaining} | Hand: ₹${handReportRemaining} -> ${apiReportTotals?.reportRemaining === handReportRemaining ? 'MATCH' : 'MISMATCH'}`);
    console.log(`API Patient Count:    ${apiReportPatients.length} | Hand: ${handReportPatients.length} -> ${apiReportPatients.length === handReportPatients.length ? 'MATCH' : 'MISMATCH'}`);

    let reportSorted = true;
    for (let i = 0; i < apiReportPatients.length - 1; i++) {
      if (apiReportPatients[i].reportRemaining < apiReportPatients[i + 1].reportRemaining) {
        reportSorted = false;
        break;
      }
    }
    console.log(`Sorted largest remaining first: ${reportSorted ? 'YES' : 'NO'}`);

    if (reportMatch && reportSorted) {
      console.log('👉 RESULT: PASSED (All report charge totals and sorting matched by hand)\n');
    } else {
      console.log('👉 RESULT: FAILED\n');
      allPassed = false;
    }

    // Test 4: GET /api/reports/report-charge?pending=true
    console.log('--- TEST 4: GET /api/reports/report-charge?pending=true ---');
    const resReportPending = await makeRequest(server, '/api/reports/report-charge?pending=true', token);
    const apiReportPendingList = resReportPending.body.patients || [];
    const reportPendingMatch =
      resReportPending.statusCode === 200 &&
      apiReportPendingList.length === handReportPendingPatients.length &&
      apiReportPendingList.every(p => p.reportRemaining > 0);

    console.log(`API Pending Report Patients: ${apiReportPendingList.length} | Hand: ${handReportPendingPatients.length} -> ${reportPendingMatch ? 'MATCH' : 'MISMATCH'}`);
    if (reportPendingMatch) {
      console.log('👉 RESULT: PASSED (Only patients with remaining report charge returned)\n');
    } else {
      console.log('👉 RESULT: FAILED\n');
      allPassed = false;
    }

    // Test 5: GET /api/reports/combined
    console.log('--- TEST 5: GET /api/reports/combined ---');
    const resCombined = await makeRequest(server, '/api/reports/combined', token);
    const apiGrandTotal = resCombined.body.grandTotal;
    const apiDates = resCombined.body.dates || [];

    const grandTotalMatch =
      resCombined.statusCode === 200 &&
      apiGrandTotal.patientCount === handCombinedGrandPatientCount &&
      apiGrandTotal.opdCharge === handCombinedGrandOpd &&
      apiGrandTotal.reportCharge === handCombinedGrandReport &&
      apiGrandTotal.totalPaid === handCombinedGrandPaid &&
      apiGrandTotal.totalRemaining === handCombinedGrandRemaining;

    console.log(`Grand Total Patient Count: ${apiGrandTotal?.patientCount} | Hand: ${handCombinedGrandPatientCount} -> ${apiGrandTotal?.patientCount === handCombinedGrandPatientCount ? 'MATCH' : 'MISMATCH'}`);
    console.log(`Grand Total OPD Charge:    ₹${apiGrandTotal?.opdCharge} | Hand: ₹${handCombinedGrandOpd} -> ${apiGrandTotal?.opdCharge === handCombinedGrandOpd ? 'MATCH' : 'MISMATCH'}`);
    console.log(`Grand Total Report Charge: ₹${apiGrandTotal?.reportCharge} | Hand: ₹${handCombinedGrandReport} -> ${apiGrandTotal?.reportCharge === handCombinedGrandReport ? 'MATCH' : 'MISMATCH'}`);
    console.log(`Grand Total Total Paid:    ₹${apiGrandTotal?.totalPaid} | Hand: ₹${handCombinedGrandPaid} -> ${apiGrandTotal?.totalPaid === handCombinedGrandPaid ? 'MATCH' : 'MISMATCH'}`);
    console.log(`Grand Total Remaining:     ₹${apiGrandTotal?.totalRemaining} | Hand: ₹${handCombinedGrandRemaining} -> ${apiGrandTotal?.totalRemaining === handCombinedGrandRemaining ? 'MATCH' : 'MISMATCH'}`);

    // Check each date group
    let allDatesMatch = true;
    for (const d of apiDates) {
      const handGroup = handDateGroups[d.date];
      if (!handGroup) {
        allDatesMatch = false;
        console.error(`Unexpected date group in API: ${d.date}`);
        break;
      }
      if (
        d.patientCount !== handGroup.patientCount ||
        d.opdCharge !== handGroup.opdCharge ||
        d.reportCharge !== handGroup.reportCharge ||
        d.totalPaid !== handGroup.totalPaid ||
        d.totalRemaining !== handGroup.totalRemaining
      ) {
        allDatesMatch = false;
        console.error(`Date mismatch for ${d.date}`);
        break;
      }
    }

    console.log(`Per-date groupings match hand calculation: ${allDatesMatch ? 'YES' : 'NO'}`);

    if (grandTotalMatch && allDatesMatch) {
      console.log('👉 RESULT: PASSED (Combined report dates & grand total row matched by hand)\n');
    } else {
      console.log('👉 RESULT: FAILED\n');
      allPassed = false;
    }

    // Test 6: Asia/Kolkata 11:00 PM Timezone Edge Case Verification
    console.log('--- TEST 6: Asia/Kolkata 11:00 PM Timezone Test ---');
    // Create a temporary patient record with visitDate at 11:00 PM (23:00) IST
    // 2026-05-15 23:00:00+05:30 -> UTC is 2026-05-15 17:30:00Z
    const testLatePatient = await Patient.create({
      name: 'Late Night Test Patient',
      phone: '9000011111',
      opdCharge: 350,
      opdPaid: 350,
      reportCharge: 0,
      reportPaid: 0,
      visitDate: new Date('2026-05-15T23:00:00.000+05:30'),
      isDeleted: false,
      isSample: true,
      createdBy: user._id
    });

    try {
      // Query specifically for from=2026-05-15&to=2026-05-15 in Asia/Kolkata
      const resTz = await makeRequest(server, '/api/reports/combined?from=2026-05-15&to=2026-05-15', token);
      const lateDateGroup = (resTz.body.dates || []).find(d => d.date === '2026-05-15');

      const lateMatched =
        lateDateGroup &&
        lateDateGroup.date === '2026-05-15' &&
        lateDateGroup.opdCharge === 350 &&
        lateDateGroup.patientCount === 1;

      console.log(`Patient saved at 11:00 PM IST grouped on correct date (2026-05-15): ${lateMatched ? 'YES' : 'NO'}`);

      // Query next day from=2026-05-16&to=2026-05-16 to ensure no leak into the next day
      const resNextDay = await makeRequest(server, '/api/reports/combined?from=2026-05-16&to=2026-05-16', token);
      const nextDayCount = resNextDay.body.dates?.length || 0;
      console.log(`Did not spill into next day: ${nextDayCount === 0 ? 'YES' : 'NO'}`);

      if (lateMatched && nextDayCount === 0) {
        console.log('👉 RESULT: PASSED (Asia/Kolkata timezone grouping & boundaries verified)\n');
      } else {
        console.log('👉 RESULT: FAILED (Timezone grouping error)\n');
        allPassed = false;
      }
    } finally {
      await Patient.deleteOne({ _id: testLatePatient._id });
    }

    // --- SUMMARY ---
    console.log('========================================================');
    if (allPassed) {
      console.log('✅ FINAL VERDICT: ALL REPORT TOTALS MATCH HAND CALCULATIONS (100% PASS)');
    } else {
      console.log('❌ FINAL VERDICT: SOME CHECKS FAILED');
    }
    console.log('========================================================\n');

    server.close();
    await disconnectDB();
    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    if (server) server.close();
    await disconnectDB();
    process.exit(1);
  }
}

runTests();
