import '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Patient, Payment } from '../models/index.js';

async function backfill() {
  try {
    await connectDB();

    // Find patients that have a paid amount
    const patients = await Patient.find({
      isDeleted: false,
      $or: [{ opdPaid: { $gt: 0 } }, { reportPaid: { $gt: 0 } }]
    });

    let patientsBackfilled = 0;
    let paymentsCreated = 0;

    for (const patient of patients) {
      // Check if patient already has payment records
      const count = await Payment.countDocuments({ patientId: patient._id });
      if (count > 0) {
        // Run only once per patient: skip if records already exist
        if (!patient.lastPaymentAt) {
          const latest = await Payment.findOne({ patientId: patient._id }).sort({ paidAt: -1, date: -1 });
          patient.lastPaymentAt = latest?.paidAt || patient.visitDate;
          await patient.save();
        }
        continue;
      }

      let createdForPatient = 0;
      const paymentDate = patient.visitDate || new Date();

      if (patient.opdPaid > 0) {
        await Payment.create({
          patientId: patient._id,
          type: 'opd',
          amount: patient.opdPaid,
          mode: 'cash',
          paidAt: paymentDate,
          date: paymentDate,
          backfilled: true,
          receivedBy: patient.createdBy,
          note: 'Backfilled initial OPD payment'
        });
        createdForPatient++;
        paymentsCreated++;
      }

      if (patient.reportPaid > 0) {
        await Payment.create({
          patientId: patient._id,
          type: 'report',
          amount: patient.reportPaid,
          mode: 'cash',
          paidAt: paymentDate,
          date: paymentDate,
          backfilled: true,
          receivedBy: patient.createdBy,
          note: 'Backfilled initial report payment'
        });
        createdForPatient++;
        paymentsCreated++;
      }

      if (createdForPatient > 0) {
        patient.lastPaymentAt = paymentDate;
        await patient.save();
        patientsBackfilled++;
      }
    }

    // Print only counts as requested
    console.log(`Patients checked: ${patients.length}. Patients backfilled: ${patientsBackfilled}. Payments created: ${paymentsCreated}.`);

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Backfill error:', err.message);
    await disconnectDB();
    process.exit(1);
  }
}

backfill();

