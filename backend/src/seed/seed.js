const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Student = require('../models/Student');
const Allocation = require('../models/Allocation');
const AuditLog = require('../models/AuditLog');

// Helper function to extract JS array from file text using bracket matching
function extractArrayFromFile(fileText, varName) {
  const startIdx = fileText.indexOf(varName);
  if (startIdx === -1) {
    throw new Error(`Variable '${varName}' not found in source file.`);
  }

  const bracketStart = fileText.indexOf('[', startIdx);
  if (bracketStart === -1) {
    throw new Error(`Opening bracket '[' not found after variable '${varName}'.`);
  }

  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escapeNext = false;
  let bracketEnd = -1;

  for (let i = bracketStart; i < fileText.length; i++) {
    const char = fileText[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (inString) {
      if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
      if (depth === 0) {
        bracketEnd = i;
        break;
      }
    }
  }

  if (bracketEnd === -1) {
    throw new Error(`Closing bracket ']' not found for variable '${varName}'.`);
  }

  return fileText.substring(bracketStart, bracketEnd + 1);
}

function loadPrototypeData() {
  const promoPath = path.join(__dirname, '../../../prototype/promotions.js');
  const studentDataPath = path.join(__dirname, '../../../prototype/students-data.js');

  if (!fs.existsSync(promoPath)) {
    throw new Error(`Prototype file not found at path: ${promoPath}`);
  }
  if (!fs.existsSync(studentDataPath)) {
    throw new Error(`Prototype file not found at path: ${studentDataPath}`);
  }

  // 1. Read and parse 100 generated students from prototype/students-data.js
  const studentDataText = fs.readFileSync(studentDataPath, 'utf8');
  const generatedCode = extractArrayFromFile(studentDataText, 'generatedStudents');
  const generatedStudents = vm.runInNewContext(generatedCode);

  // 2. Read and parse 3 original students from prototype/promotions.js
  const promoText = fs.readFileSync(promoPath, 'utf8');
  const promoCode = extractArrayFromFile(promoText, 'academicStudents');
  const allAcademicStudents = vm.runInNewContext(promoCode, { generatedStudents });

  const original3Students = allAcademicStudents.filter(s =>
    ['STU-2026-001', 'STU-2026-002', 'STU-2026-003'].includes(s.id)
  );

  console.log(`Loaded ${original3Students.length} original students from promotions.js`);
  console.log(`Loaded ${generatedStudents.length} generated students from students-data.js`);

  if (original3Students.length === 0) {
    throw new Error('Failed to load original students: 0 loaded from promotions.js.');
  }
  if (generatedStudents.length === 0) {
    throw new Error('Failed to load generated students: 0 loaded from students-data.js.');
  }

  return { original3Students, generatedStudents, allAcademicStudents };
}

async function seed() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is missing in server/.env.');
    }

    await connectDB();

    console.log('Clearing existing database collections...');
    await Promise.all([
      User.deleteMany({}),
      Hostel.deleteMany({}),
      Room.deleteMany({}),
      Student.deleteMany({}),
      Allocation.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    const { original3Students, generatedStudents, allAcademicStudents } = loadPrototypeData();

    // 1. Seed Hostels
    const hostelConfigs = [
      { name: 'Maple House', totalBeds: 280, maintenanceBeds: 8, otherOccupied: 223 },
      { name: 'Cedar House', totalBeds: 240, maintenanceBeds: 4, otherOccupied: 185 },
      { name: 'Oak House',   totalBeds: 200, maintenanceBeds: 2, otherOccupied: 136 }
    ];

    const hostelDocs = await Hostel.insertMany(hostelConfigs);
    const hostelMap = new Map(hostelDocs.map(h => [h.name, h]));

    // 2. Collect & Seed Rooms
    const roomSet = new Map();

    // Standard 25 rooms per hostel
    const standardHostels = [
      { name: 'Maple House', prefix: 'A', rooms: 25 },
      { name: 'Cedar House', prefix: 'B', rooms: 25 },
      { name: 'Oak House',   prefix: 'C', rooms: 25 }
    ];
    standardHostels.forEach(h => {
      for (let i = 0; i < h.rooms; i++) {
        const roomNo = `${h.prefix}-${100 * (1 + Math.floor(i / 9)) + 1 + (i % 9) + 10}`;
        roomSet.set(h.name + '|' + roomNo, { hostelName: h.name, roomNo });
      }
    });

    // Plus any room allocated to a student
    allAcademicStudents.forEach(s => {
      if (s.allocation && s.allocation.hostel && s.allocation.room) {
        const key = s.allocation.hostel + '|' + s.allocation.room;
        if (!roomSet.has(key)) {
          roomSet.set(key, { hostelName: s.allocation.hostel, roomNo: s.allocation.room });
        }
      }
    });

    const roomDocsToInsert = [];
    roomSet.forEach(({ hostelName, roomNo }) => {
      const hostelDoc = hostelMap.get(hostelName);
      if (hostelDoc) {
        const num = parseInt(roomNo.replace(/[^0-9]/g, ''), 10);
        const floor = Math.floor(num / 100);
        roomDocsToInsert.push({
          hostel: hostelDoc._id,
          roomNo,
          floor,
          capacity: 2
        });
      }
    });

    const roomDocs = await Room.insertMany(roomDocsToInsert);
    const roomMap = new Map(roomDocs.map(r => {
      const hDoc = hostelDocs.find(h => h._id.equals(r.hostel));
      return [hDoc.name + '|' + r.roomNo, r];
    }));

    // 3. Seed Students & Allocations
    const studentDocsToInsert = allAcademicStudents.map(s => ({
      studentId: s.id,
      name: s.name,
      course: s.course,
      studyYear: s.studyYear,
      duration: s.duration,
      academicYear: s.academicYear,
      email: s.email,
      phone: s.phone,
      guardian: s.guardian,
      mess: s.mess,
      status: 'active'
    }));

    const studentDocs = await Student.insertMany(studentDocsToInsert);
    const studentMap = new Map(studentDocs.map(s => [s.studentId, s]));

    const allocationDocsToInsert = [];
    allAcademicStudents.forEach(s => {
      if (s.allocation && s.allocation.hostel && s.allocation.room && s.allocation.bed) {
        const studentDoc = studentMap.get(s.id);
        const roomDoc = roomMap.get(s.allocation.hostel + '|' + s.allocation.room);
        if (studentDoc && roomDoc) {
          allocationDocsToInsert.push({
            student: studentDoc._id,
            room: roomDoc._id,
            bedNo: s.allocation.bed,
            academicYear: s.academicYear,
            startDate: new Date(),
            status: 'active'
          });
        }
      }
    });

    const allocationDocs = await Allocation.insertMany(allocationDocsToInsert);

    // 4. Seed User Accounts (Admin, Demo Students, Warden, Mentor)
    const userDocsToInsert = [];

    // Admin user
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword && !adminPassword.includes('<')) {
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(adminPassword, salt);
      userDocsToInsert.push({
        name: 'System Admin',
        email: adminEmail.toLowerCase().trim(),
        passwordHash,
        role: 'admin',
        isActive: true
      });
    }

    // Demo users using SEED_USER_PASSWORD
    const seedUserPassword = process.env.SEED_USER_PASSWORD;
    if (seedUserPassword && !seedUserPassword.includes('<')) {
      const demoSalt = await bcrypt.genSalt(12);
      const demoPasswordHash = await bcrypt.hash(seedUserPassword, demoSalt);

      // User accounts for the first 3 demo students
      original3Students.forEach(s => {
        const studentDoc = studentMap.get(s.id);
        if (studentDoc) {
          userDocsToInsert.push({
            name: s.name,
            email: s.email.toLowerCase().trim(),
            passwordHash: demoPasswordHash,
            role: 'student',
            student: studentDoc._id,
            isActive: true
          });
        }
      });

      // Warden account
      userDocsToInsert.push({
        name: 'R. Krishnan',
        email: 'warden@example.edu',
        passwordHash: demoPasswordHash,
        role: 'warden',
        isActive: true
      });

      // Mentor account
      userDocsToInsert.push({
        name: 'Dr. Meera Nair',
        email: 'mentor@example.edu',
        passwordHash: demoPasswordHash,
        role: 'mentor',
        isActive: true
      });
    }

    const createdUsers = await User.insertMany(userDocsToInsert);

    console.log('\n--- Database Seeding Complete ---');
    console.log(`Hostels created:     ${hostelDocs.length}`);
    console.log(`Rooms created:       ${roomDocs.length}`);
    console.log(`Students created:    ${studentDocs.length}`);
    console.log(`Allocations created: ${allocationDocs.length}`);
    console.log(`User accounts:       ${createdUsers.length}`);

    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
}

seed();
