// Automated verification script for client axios API layer
import {
  login,
  getCurrentUser,
  logout,
  createPatient,
  listPatients,
  getPatient,
  addPayment,
  reportOpd,
  reportCharge,
  reportCombined
} from './src/api/mockApi.js';

// Setup mock localStorage for Node.js test environment
const storage = {};
global.localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { storage[key] = String(val); },
  removeItem: (key) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

async function runClientTests() {
  console.log('========================================================');
  console.log('   Nilkanth Clinic — Client Real Axios API Test Suite   ');
  console.log('========================================================\n');

  let passedCount = 0;
  let testCount = 0;

  function assert(condition, message) {
    testCount++;
    if (condition) {
      console.log(`[PASSED] ${testCount}. ${message}`);
      passedCount++;
    } else {
      console.error(`[FAILED] ${testCount}. ${message}`);
    }
  }

  try {
    // Test 1: Login with wrong password
    try {
      await login('admin@nilkanth.in', 'wrong_pass');
      assert(false, 'Login with wrong password should fail');
    } catch (err) {
      assert(err.message === 'Email or password is wrong.', `Wrong password returns exact message: "${err.message}"`);
    }

    // Test 2: Login with correct password
    const session = await login('admin@nilkanth.in', 'admin');
    assert(
      session && session.token && session.user?.name === 'Dr. Jignesh Chauhan',
      `Login successful for: ${session.user?.name} (JWT token stored)`
    );

    // Test 3: getCurrentUser
    const currentUser = getCurrentUser();
    assert(currentUser?.name === 'Dr. Jignesh Chauhan', `getCurrentUser() returns: ${currentUser?.name}`);

    // Test 4: listPatients (/patients screen)
    const list = await listPatients();
    assert(Array.isArray(list.patients) && list.patients.length > 0, `listPatients() returned ${list.patients.length} patients (total: ${list.total})`);

    // Test 5: createPatient (/add screen)
    const newPatientData = {
      name: 'Integration Test Patient',
      age: 42,
      gender: 'Male',
      phone: '9898011223',
      weight: '68',
      address: 'Navrangpura, Ahmedabad',
      opdCharge: 300,
      opdPaid: 200,
      reportName: 'Lipid Profile',
      reportCharge: 400,
      reportPaid: 200,
      medicines: [
        { medicine: 'Telmisartan 40 mg', dosage: '1 tablet morning', days: '30' }
      ]
    };

    const created = await createPatient(newPatientData);
    assert(
      created && created.name === 'Integration Test Patient' && created.opdRemaining === 100 && created.reportRemaining === 200,
      `createPatient() created record in MongoDB Atlas (ID: ${created.id}, OPD Rem: ₹${created.opdRemaining}, Report Rem: ₹${created.reportRemaining})`
    );

    // Test 6: getPatient (Side panel)
    const fetched = await getPatient(created.id);
    assert(fetched && fetched.name === 'Integration Test Patient', `getPatient(${created.id}) fetched details & medicines`);

    // Test 7: addPayment (Inline payment collection)
    const paymentRes = await addPayment(created.id, {
      amount: 100,
      type: 'opd',
      note: 'UPI Payment received'
    });
    assert(
      paymentRes.patient.opdRemaining === 0 && paymentRes.payment.amount === 100,
      `addPayment() recorded ₹100 OPD payment. Remaining balance updated to: ₹${paymentRes.patient.opdRemaining}`
    );

    // Test 8: reportOpd (/reports screen - OPD Tab)
    const opdRep = await reportOpd();
    assert(
      opdRep && opdRep.totals && opdRep.totals.opdCharge > 0 && Array.isArray(opdRep.items),
      `reportOpd() returned OPD charge: ₹${opdRep.totals.opdCharge}, Paid: ₹${opdRep.totals.opdPaid}, Items: ${opdRep.items.length}`
    );

    // Test 9: reportCharge (/reports screen - Report Charge Tab)
    const repCharge = await reportCharge();
    assert(
      repCharge && repCharge.totals && repCharge.totals.reportCharge > 0,
      `reportCharge() returned Report charge: ₹${repCharge.totals.reportCharge}, Paid: ₹${repCharge.totals.reportPaid}, Items: ${repCharge.items.length}`
    );

    // Test 10: reportCombined (/reports screen - Combined Tab)
    const combRep = await reportCombined();
    assert(
      combRep && combRep.grandTotal && combRep.grandTotal.totalPaid > 0 && Array.isArray(combRep.dates),
      `reportCombined() returned grandTotal paid: ₹${combRep.grandTotal.totalPaid}, dates: ${combRep.dates.length}`
    );

    // Test 11: logout
    logout();
    assert(getCurrentUser() === null, 'logout() cleared stored JWT session');

    console.log('\n========================================================');
    if (passedCount === testCount) {
      console.log(`✅ FINAL VERDICT: ALL ${passedCount}/${testCount} CLIENT API TESTS PASSED`);
    } else {
      console.log(`❌ FINAL VERDICT: ${passedCount}/${testCount} PASSED`);
    }
    console.log('========================================================\n');

    process.exit(passedCount === testCount ? 0 : 1);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runClientTests();

