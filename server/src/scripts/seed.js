import '../config/env.js';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, Patient } from '../models/index.js';

// Refuse to run if NODE_ENV is "production"
if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run seed script in production environment.');
  process.exit(1);
}

const SAMPLE_PATIENTS = [
  {
    name: 'Rameshchandra Patel',
    age: 62,
    phone: '9825012345',
    weight: '68',
    address: '14 Shrinath Society, Navrangpura, Ahmedabad',
    medicines: [
      { name: 'Telmisartan 40 mg', dosage: '1 tablet in morning', days: '30' },
      { name: 'Metformin 500 mg', dosage: '1 tablet after dinner', days: '30' },
      { name: 'Aspirin 75 mg', dosage: '1 tablet after lunch', days: '30' }
    ],
    opdCharge: 300,
    opdPaid: 300,
    reportName: 'Blood Sugar (Fasting & PP)',
    reportCharge: 250,
    reportPaid: 250
  },
  {
    name: 'Kavita Desai',
    age: 34,
    phone: '9898045678',
    weight: '54',
    address: 'B-302 Prerna Apartment, Satellite, Ahmedabad',
    medicines: [
      { name: 'Paracetamol 650 mg', dosage: '1 tablet thrice a day after food', days: '3' },
      { name: 'Pantoprazole 40 mg', dosage: '1 tablet morning empty stomach', days: '5' }
    ],
    opdCharge: 300,
    opdPaid: 0,
    reportName: 'Complete Blood Count (CBC)',
    reportCharge: 350,
    reportPaid: 0
  },
  {
    name: 'Hitesh Shah',
    age: 45,
    phone: '9824098765',
    weight: '74',
    address: '42 Vallabh Park, Maninagar, Ahmedabad',
    medicines: [
      { name: 'Amoxicillin 500 mg', dosage: '1 capsule twice daily after meals', days: '5' },
      { name: 'Cetirizine 10 mg', dosage: '1 tablet at night', days: '5' }
    ],
    opdCharge: 300,
    opdPaid: 300,
    reportName: 'Chest X-Ray',
    reportCharge: 400,
    reportPaid: 200
  },
  {
    name: 'Meenaben Prajapati',
    age: 58,
    phone: '9712034567',
    weight: '62',
    address: 'Plot 18, Sun City, Bopal, Ahmedabad',
    medicines: [
      { name: 'Calcium 500 mg + Vit D3', dosage: '1 tablet after lunch', days: '30' },
      { name: 'Aceclofenac 100 mg', dosage: '1 tablet as needed for knee pain', days: '5' }
    ],
    opdCharge: 300,
    opdPaid: 300,
    reportName: '',
    reportCharge: 0,
    reportPaid: 0
  },
  {
    name: 'Rajeshbhai Soni',
    age: 51,
    phone: '9825123489',
    weight: '70',
    address: '8 Shanti Nagar, Paldi, Ahmedabad',
    medicines: [
      { name: 'Atorvastatin 10 mg', dosage: '1 tablet at bedtime', days: '30' },
      { name: 'Telmisartan 40 mg', dosage: '1 tablet morning', days: '30' }
    ],
    opdCharge: 300,
    opdPaid: 300,
    reportName: 'Lipid Profile',
    reportCharge: 550,
    reportPaid: 550
  },
  {
    name: 'Bhavik Panchal',
    age: 28,
    phone: '9909087654',
    weight: '65',
    address: '112 Galaxy Avenue, Naroda, Ahmedabad',
    medicines: [
      { name: 'Azithromycin 500 mg', dosage: '1 tablet once daily before lunch', days: '3' },
      { name: 'Levocetirizine + Montelukast', dosage: '1 tablet night', days: '5' }
    ],
    opdCharge: 300,
    opdPaid: 300,
    reportName: '',
    reportCharge: 0,
    reportPaid: 0
  },
  {
    name: 'Chetna Trivedi',
    age: 41,
    phone: '9879012345',
    weight: '58',
    address: 'C-12 Nilamber Flat, Vastrapur, Ahmedabad',
    medicines: [
      { name: 'Thyroxine 50 mcg', dosage: '1 tablet morning empty stomach', days: '60' },
      { name: 'Vitamin B12 1500 mcg', dosage: '1 tablet daily after food', days: '30' }
    ],
    opdCharge: 300,
    opdPaid: 300,
    reportName: 'Thyroid Profile (T3 T4 TSH)',
    reportCharge: 450,
    reportPaid: 450
  },
  {
    name: 'Jagdish Parmar',
    age: 67,
    phone: '9824156789',
    weight: '66',
    address: '23 Anand Vihar, Chandkheda, Ahmedabad',
    medicines: [
      { name: 'Tamsulosin 0.4 mg', dosage: '1 capsule 30 min after dinner', days: '30' },
      { name: 'Ciprofloxacin 500 mg', dosage: '1 tablet twice daily', days: '7' }
    ],
    opdCharge: 300,
    opdPaid: 200,
    reportName: 'Urine Routine & Micro',
    reportCharge: 200,
    reportPaid: 0
  },
  {
    name: 'Shilpa Solanki',
    age: 31,
    phone: '9974054321',
    weight: '52',
    address: '77 Suryam Elegance, Ghatlodiya, Ahmedabad',
    medicines: [
      { name: 'Iron Folic Acid', dosage: '1 tablet after dinner', days: '30' },
      { name: 'Calcium Carbonate 500 mg', dosage: '1 tablet after breakfast', days: '30' }
    ],
    opdCharge: 300,
    opdPaid: 300,
    reportName: 'Hemoglobin (Hb)',
    reportCharge: 120,
    reportPaid: 120
  },
  {
    name: 'Arvind Vaghela',
    age: 49,
    phone: '9898123098',
    weight: '77',
    address: '5 Govind Wadi, Isanpur, Ahmedabad',
    medicines: [
      { name: 'Omeprazole 20 mg', dosage: '1 capsule morning empty stomach', days: '14' },
      { name: 'Domperidone 10 mg', dosage: '1 tablet before lunch and dinner', days: '7' }
    ],
    opdCharge: 300,
    opdPaid: 300,
    reportName: 'Ultrasound Abdomen',
    reportCharge: 800,
    reportPaid: 500
  }
];

async function run() {
  const isClearOnly = process.argv.includes('--clear');

  try {
    await connectDB();

    if (isClearOnly) {
      const deleteResult = await Patient.deleteMany({ isSample: true });
      console.log(`Sample patients deleted: ${deleteResult.deletedCount}.`);
      await disconnectDB();
      process.exit(0);
    }

    let usersCreated = 0;
    let patientsCreated = 0;

    const adminEmail = process.env.ADMIN_EMAIL.toLowerCase().trim();

    // Ensure exactly one user exists: delete any legacy/extraneous user accounts
    await User.deleteMany({ email: { $ne: adminEmail } });

    // Find or create the single doctor user
    let user = await User.findOne({ email: adminEmail });

    if (!user) {
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      user = await User.create({
        name: 'Dr. Jignesh Chauhan',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        isActive: true
      });
      usersCreated = 1;
    } else {
      // If user already exists, update only the name
      if (user.name !== 'Dr. Jignesh Chauhan') {
        user.name = 'Dr. Jignesh Chauhan';
        await user.save();
      }
    }

    // Clear previous sample patients first
    await Patient.deleteMany({ isSample: true });

    // Create 10 sample patients
    const docs = SAMPLE_PATIENTS.map(p => ({
      ...p,
      isSample: true,
      createdBy: user._id,
      visitDate: new Date()
    }));

    const createdPatients = await Patient.insertMany(docs);
    patientsCreated = createdPatients.length;

    console.log(`Users created: ${usersCreated}. Patients created: ${patientsCreated}.`);

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Seed operation failed:', err.message);
    await disconnectDB();
    process.exit(1);
  }
}

run();
