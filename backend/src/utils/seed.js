/**
 * SPIT Hostel Ops — Database Seed Script
 * Seeds realistic data for Bharatiya Vidya Bhavan's Sardar Patel Institute of Technology (SPIT)
 * Run with: npm run seed
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../backend/.env') });
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User.model');
const Room = require('../models/Room.model');
const Student = require('../models/Student.model');
const Allocation = require('../models/Allocation.model');
const PassRequest = require('../models/PassRequest.model');
const GateEvent = require('../models/GateEvent.model');
const Complaint = require('../models/Complaint.model');
const MentorSession = require('../models/MentorSession.model');
const Announcement = require('../models/Announcement.model');
const InstitutionSetting = require('../models/InstitutionSetting.model');
const AuditLog = require('../models/AuditLog.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_db';

// 4 Application Roles (Admin, Warden, Mentor, Student) — Exactly as specified, no staff!
const seedUsers = [
  {
    name: 'SPIT Chief Admin',
    email: 'admin@spit.ac.in',
    password: 'Admin@123',
    role: 'admin',
  },
  {
    name: 'Ramesh Kulkarni',
    email: 'warden@spit.ac.in',
    password: 'Warden@123',
    role: 'warden',
  },
  {
    name: 'Aryan Shah (Senior Student Mentor - B.Tech Final Year CSE)',
    email: 'mentor@spit.ac.in',
    password: 'Mentor@123',
    role: 'mentor',
  },
  {
    name: 'Sakshi Patil (Resident Student)',
    email: 'student@spit.ac.in',
    password: 'Student@123',
    role: 'student',
  },
];

// SPIT Hostel Blocks
const generateRooms = () => {
  const blocks = ['A', 'B', 'C', 'D'];
  const rooms = [];
  blocks.forEach((block) => {
    for (let floor = 1; floor <= 3; floor++) {
      for (let num = 1; num <= 8; num++) {
        const roomNumber = `${block}${floor}${String(num).padStart(2, '0')}`;
        // Capacity: 1, 2, or 3
        const capacity = num <= 3 ? 2 : num <= 6 ? 3 : 1;
        const roomType = capacity === 1 ? 'single' : capacity === 2 ? 'double' : 'triple';
        rooms.push({
          roomNumber,
          block,
          floor,
          capacity,
          roomType,
          monthlyRent: capacity === 1 ? 5500 : capacity === 2 ? 4200 : 3600,
          amenities: ['High-speed WiFi', 'Study Table & Chair', 'Attached Washroom', ...(block === 'A' ? ['Solar Water Heater'] : [])],
          occupiedBeds: 0,
        });
      }
    }
  });
  return rooms;
};

const branches = [
  'Computer Engineering',
  'Artificial Intelligence & Data Science',
  'Computer Science & Engineering',
  'Electronics & Telecommunication Engineering',
];

const studentNames = [
  'Sakshi Patil', 'Rashi Sharma', 'Aishwarya Joshi', 'Aditya Deshmukh',
  'Rohan Kulkarni', 'Tanvi Mehta', 'Siddharth More', 'Neha Chawla',
  'Varun Nair', 'Pooja Iyer', 'Arjun Shinde', 'Sneha Varma',
  'Omkar Sawant', 'Ananya Hegde', 'Kunal Jadhav', 'Isha Kadam',
  'Manish Gawade', 'Bhavika Shah', 'Prathamesh Rane', 'Divya Kamble',
  'Yash Salvi', 'Shruti Tendulkar', 'Gaurav Kunte', 'Mugdha Bhat',
  'Tejas Mane', 'Aniket Gokhale', 'Kalyani Sane', 'Harshwardhan Patil',
  'Sanika Phadke', 'Sanket Date', 'Ruturaj Pawar', 'Vedika Bapat',
];

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅  Connected to MongoDB');

    // Clear existing collections
    await Promise.all([
      User.deleteMany(),
      Room.deleteMany(),
      Student.deleteMany(),
      Allocation.deleteMany(),
      PassRequest.deleteMany(),
      GateEvent.deleteMany(),
      Complaint.deleteMany(),
      MentorSession.deleteMany(),
      Announcement.deleteMany(),
      InstitutionSetting.deleteMany(),
      AuditLog.deleteMany(),
    ]);
    console.log('🗑️   Cleared existing database collections');

    // 1. Create Users
    const createdUsers = [];
    for (const u of seedUsers) {
      const user = await User.create(u);
      createdUsers.push(user);
    }
    const adminUser = createdUsers.find((u) => u.role === 'admin');
    const wardenUser = createdUsers.find((u) => u.role === 'warden');
    const mentorUser = createdUsers.find((u) => u.role === 'mentor');
    const studentUser = createdUsers.find((u) => u.role === 'student');
    console.log(`👤  Created 4 authentic role users (Admin, Warden, Mentor, Student)`);

    // 2. Create Rooms
    const roomDocs = await Room.insertMany(generateRooms());
    console.log(`🏠  Created ${roomDocs.length} SPIT hostel rooms across Blocks A, B, C, D`);

    // 3. Create Students
    const studentDocs = [];
    for (let i = 0; i < studentNames.length; i++) {
      const name = studentNames[i];
      const isFirstStudent = i === 0;
      const regNo = `2024${String(1001 + i)}`;
      const branch = branches[i % branches.length];
      const yearNum = (i % 4) + 1;
      const yearLabel = `${yearNum}${yearNum === 1 ? 'st' : yearNum === 2 ? 'nd' : yearNum === 3 ? 'rd' : 'th'} Year`;

      const studentDoc = await Student.create({
        studentId: regNo,
        collegeRegistrationNumber: regNo,
        name,
        email: isFirstStudent ? 'student@spit.ac.in' : `${name.toLowerCase().replace(/\s+/g, '.')}@spit.ac.in`,
        phone: `98${String(20000000 + i * 31415).slice(0, 8)}`,
        course: 'B.Tech',
        branch,
        department: branch,
        year: yearNum,
        academicYear: yearLabel,
        admissionYear: 2024 - (yearNum - 1),
        institution: "Bharatiya Vidya Bhavan's Sardar Patel Institute of Technology (SPIT)",
        gender: i % 2 === 0 ? 'female' : 'male',
        guardianName: `Mr./Mrs. ${name.split(' ')[1]}`,
        guardianPhone: `99${String(10000000 + i * 27182).slice(0, 8)}`,
        guardianRelation: 'Parent',
        hostelRequired: true,
        messPreference: i % 2 === 0 ? 'Regular Vegetarian Mess' : 'Special Mess (Veg + Non-Veg Days)',
        feeReceipt: {
          fileName: `SPIT_Hostel_FeeReceipt_${regNo}.pdf`,
          fileData: 'verified_stored_document_reference',
          uploadDate: new Date(Date.now() - (i + 1) * 86400000 * 3),
          verificationStatus: i < 22 ? 'Verified' : 'Pending Review',
          verifiedBy: i < 22 ? adminUser._id : null,
          verifiedAt: i < 22 ? new Date() : null,
          remarks: i < 22 ? 'Hostel fee confirmed via Accounts' : '',
        },
        registrationStatus: i < 24 ? 'Approved' : 'Pending Review',
        assignedMentor: mentorUser._id,
        userId: isFirstStudent ? studentUser._id : null,
      });

      if (isFirstStudent) {
        studentUser.studentRef = studentDoc._id;
        await studentUser.save();
      }

      studentDocs.push(studentDoc);
    }
    console.log(`🎓  Created ${studentDocs.length} SPIT students with verified registrations`);

    // 4. Create Allocations (producing a realistic mix: Green = full, Yellow = partial, Red = empty)
    // Allocate beds in the first 12 rooms of Block A and B
    let studentIndex = 0;
    const allocationDocs = [];

    // Group 1: 8 rooms fully occupied (🟢 Green)
    for (let r = 0; r < 8; r++) {
      const room = roomDocs[r];
      for (let bed = 1; bed <= room.capacity; bed++) {
        if (studentIndex < studentDocs.length) {
          const student = studentDocs[studentIndex++];
          const alloc = await Allocation.create({
            room: room._id,
            student: student._id,
            bedNumber: bed,
            academicYear: '2024-25',
            checkInDate: new Date('2024-08-01'),
            status: 'active',
            allocatedBy: adminUser._id,
          });
          allocationDocs.push(alloc);

          student.allocatedRoom = room._id;
          student.allocatedBed = bed;
          await student.save();
        }
      }
      room.occupiedBeds = room.capacity;
      await room.save();
    }

    // Group 2: 4 rooms partially filled (🟡 Yellow)
    for (let r = 8; r < 12; r++) {
      const room = roomDocs[r];
      const partialBeds = Math.max(1, room.capacity - 1);
      for (let bed = 1; bed <= partialBeds; bed++) {
        if (studentIndex < studentDocs.length) {
          const student = studentDocs[studentIndex++];
          const alloc = await Allocation.create({
            room: room._id,
            student: student._id,
            bedNumber: bed,
            academicYear: '2024-25',
            checkInDate: new Date('2024-08-01'),
            status: 'active',
            allocatedBy: adminUser._id,
          });
          allocationDocs.push(alloc);

          student.allocatedRoom = room._id;
          student.allocatedBed = bed;
          await student.save();
        }
      }
      room.occupiedBeds = partialBeds;
      await room.save();
    }

    // The remaining rooms in Blocks A, B, C, D remain 0 occupied -> (🔴 Red Empty)
    console.log(`📋  Created ${allocationDocs.length} active room allocations (balanced red, yellow, green distribution)`);

    // 5. Seed Pass Requests
    const pass1 = await PassRequest.create({
      studentId: studentDocs[0]._id, // Sakshi Patil
      passType: 'Day Outing',
      requestedDeparture: new Date(Date.now() + 86400000),
      expectedReturn: new Date(Date.now() + 86400000 + 18000000),
      reason: 'Visit British Council Library & Academic Reference Work',
      destination: 'Fort, South Mumbai',
      approvalStatus: 'Approved',
      currentStatus: 'Approved',
      approvedBy: wardenUser._id,
      actionDate: new Date(),
      remarks: 'Approved. Adhere to 10:00 PM curfew.',
    });

    const pass2 = await PassRequest.create({
      studentId: studentDocs[1]._id,
      passType: 'Night Out',
      requestedDeparture: new Date(Date.now() - 3600000 * 4),
      expectedReturn: new Date(Date.now() + 86400000),
      reason: 'Home visit for family function',
      destination: 'Pune',
      approvalStatus: 'Approved',
      currentStatus: 'Out on Pass',
      actualDeparture: new Date(Date.now() - 3600000 * 4),
      approvedBy: wardenUser._id,
      actionDate: new Date(),
    });

    const pass3 = await PassRequest.create({
      studentId: studentDocs[2]._id,
      passType: 'Home Visit',
      requestedDeparture: new Date(Date.now() + 86400000 * 2),
      expectedReturn: new Date(Date.now() + 86400000 * 5),
      reason: 'Diwali Festival Break Travel',
      destination: 'Nashik',
      approvalStatus: 'Pending',
      currentStatus: 'Pending Approval',
    });

    const pass4 = await PassRequest.create({
      studentId: studentDocs[3]._id,
      passType: 'Day Outing',
      requestedDeparture: new Date(Date.now() - 3600000 * 12),
      expectedReturn: new Date(Date.now() - 3600000 * 2), // Should have returned 2 hrs ago!
      reason: 'Technical Project Supplies Market',
      destination: 'Lamington Road, Grant Road',
      approvalStatus: 'Approved',
      currentStatus: 'Overdue',
      actualDeparture: new Date(Date.now() - 3600000 * 11),
      approvedBy: wardenUser._id,
      remarks: 'Curfew was 09:30 PM. Guardian contacted.',
    });

    console.log(`🎫  Created digital pass requests (Approved, Pending, Out, Overdue)`);

    // 6. Seed Gate Events
    await GateEvent.create([
      {
        studentId: studentDocs[1]._id,
        passId: pass2._id,
        eventType: 'Exit',
        timestamp: new Date(Date.now() - 3600000 * 4),
        recordedBy: wardenUser._id,
        recordedByName: 'Ramesh Kulkarni',
        notes: 'Outward departure via Main Gate verified against QR Pass.',
      },
      {
        studentId: studentDocs[3]._id,
        passId: pass4._id,
        eventType: 'Exit',
        timestamp: new Date(Date.now() - 3600000 * 11),
        recordedBy: wardenUser._id,
        recordedByName: 'Ramesh Kulkarni',
        notes: 'Day pass scan at Gate 1.',
      },
    ]);
    console.log(`🚪  Created gate entry/exit records`);

    // 7. Seed Complaints
    await Complaint.create([
      {
        studentId: studentDocs[0]._id, // Sakshi Patil
        category: 'Internet / WiFi',
        title: 'WiFi Access Point 2nd Floor Block A Intermittent',
        description: 'Frequent disconnection while accessing online IEEE research papers in evening hours.',
        roomNumber: 'A101',
        status: 'In Progress',
        assignedTo: 'SPIT Campus IT Infrastructure Team',
        expectedResolution: new Date(Date.now() + 86400000),
        resolutionRemarks: 'Router reboot scheduled and channel 6 configured.',
      },
      {
        studentId: studentDocs[1]._id,
        category: 'Electrical',
        title: 'Tube light flickering in Room A102',
        description: 'Study desk light flickering continuously since yesterday.',
        roomNumber: 'A102',
        status: 'Resolved',
        assignedTo: 'Estate Electrical Team',
        expectedResolution: new Date(Date.now() - 86400000),
        resolutionRemarks: 'Replaced with 20W LED batten.',
        resolvedAt: new Date(),
      },
      {
        studentId: studentDocs[2]._id,
        category: 'Plumbing',
        title: 'Water tap leaking in washroom',
        description: 'Continuous slow drip from washbasin tap in room.',
        roomNumber: 'A103',
        status: 'Open',
        assignedTo: 'Estate Plumbing Maintenance',
      },
    ]);
    console.log(`🛠️   Created realistic hostel maintenance complaints`);

    // 8. Seed Mentor Sessions
    await MentorSession.create([
      {
        mentorId: mentorUser._id,
        studentId: studentDocs[0]._id,
        topic: 'Semester Academic Progress & Project Orientation',
        scheduledDate: new Date(Date.now() + 86400000 * 3),
        status: 'Scheduled',
        mode: 'In-Person',
        location: 'Hostel Study Hall / Quadrangle',
        notes: 'Discuss BE project domain choices and hostel routine adaptation.',
      },
      {
        mentorId: mentorUser._id,
        studentId: studentDocs[1]._id,
        topic: 'Internship Preparation & Research Papers',
        scheduledDate: new Date(Date.now() - 86400000 * 7),
        status: 'Completed',
        mode: 'In-Person',
        notes: 'Review of resume and conference submissions.',
        guidanceRecommendations: 'Recommended applying for summer research fellowships.',
      },
    ]);
    console.log(`🧭  Created senior mentor sessions`);

    // 9. Seed Announcements
    await Announcement.create([
      {
        title: 'Hostel Gate Curfew & Night Pass Notice for Even Semester',
        content: 'All resident students are reminded that weekday campus gate curfew is strictly 10:00 PM. Night passes must be submitted to the Warden at least 24 hours prior to departure.',
        targetRole: 'All',
        category: 'Pass / Gate',
        isPinned: true,
        postedBy: wardenUser._id,
        postedByName: 'Ramesh Kulkarni',
      },
      {
        title: 'Mess Menu Committee Meeting — Student Representatives',
        content: 'The hostel mess review committee will convene on Friday at 4:30 PM in the Conference Hall. Wing representatives are requested to attend with student feedback.',
        targetRole: 'student',
        category: 'General',
        isPinned: false,
        postedBy: adminUser._id,
        postedByName: 'SPIT Chief Admin',
      },
      {
        title: 'Solar Water Heater Maintenance Scheduled (Block A & B)',
        content: 'Routine descaling of rooftop solar hot water systems will occur on Saturday from 11:00 AM to 02:00 PM. Hot water supply will resume by evening.',
        targetRole: 'student',
        category: 'Maintenance',
        isPinned: false,
        postedBy: adminUser._id,
        postedByName: 'Estate Office, SPIT',
      },
      {
        title: 'First-Year Hostel Orientation & Mentor Meeting',
        content: 'Senior student mentors assigned to junior hostel residents will conduct an orientation and peer study session this Wednesday at 5:00 PM in the Hostel Study Hall.',
        targetRole: 'mentor',
        category: 'Academic / Mentoring',
        isPinned: false,
        postedBy: adminUser._id,
        postedByName: 'Principal Office, S.P.I.T.',
      },
    ]);
    console.log(`📢  Created institutional announcements`);

    // 10. Seed Institution Settings (Editable in MongoDB Compass without changing code!)
    await InstitutionSetting.create({
      institutionName: "Bharatiya Vidya Bhavan's Sardar Patel Institute of Technology (SPIT)",
      campusAddress: "Munshi Nagar, Andheri (West), Mumbai – 400 058",
      contactEmail: "hostel@spit.ac.in",
      contactPhone: "+91 (022) 2670 7440",
      academicYearCurrent: "2024-25",
      academicYearsSupported: ["2024-25", "2025-26", "2026-27"],
      messOptions: [
        {
          name: "Regular Vegetarian Mess",
          monthlyFee: 3800,
          mealCoverage: "Breakfast, Lunch, Dinner",
          description: "Nutritious daily vegetarian meals prepared under institute hygiene standards.",
          isActive: true,
        },
        {
          name: "Special Mess (Veg + Non-Veg Days)",
          monthlyFee: 4600,
          mealCoverage: "Breakfast, Lunch, Dinner with Weekend Specials",
          description: "Vegetarian with approved non-veg specials on designated days.",
          isActive: true,
        },
      ],
      verifiedHostelFacilities: [
        { name: "WiFi Enabled Rooms", description: "Campus fiber broadband connectivity", available: true },
        { name: "Solar Hot Water Systems", description: "24x7 solar water heating for all blocks", available: true },
        { name: "RO Drinking Water", description: "Multi-stage purified water coolers on every floor", available: true },
        { name: "Reading Room & Study Hall", description: "Quiet study zones open till midnight", available: true },
        { name: "24x7 Gated Security", description: "Security personnel, CCTV cameras at entry points", available: true },
        { name: "Indoor Recreation Space", description: "Table tennis, chess, carrom boards", available: true },
      ],
      gateTimings: {
        curfewWeekday: "10:00 PM",
        curfewWeekend: "10:30 PM",
        morningOpening: "06:00 AM",
      },
      hostelNotice: "Hostel capacity, availability and mess plans are managed directly by the SPIT administration.",
    });
    console.log(`⚙️   Created editable SPIT institutional settings (Compass-compatible)`);

    // 11. Initial Audit Log
    await AuditLog.create({
      action: 'Initial System Seed',
      performedBy: adminUser._id,
      performedByName: adminUser.name,
      role: 'admin',
      targetType: 'System',
      details: 'SPIT Hostel Ops database successfully initialized with 4 roles, rooms, students and institutional settings.',
    });

    console.log('\n🎉  SPIT Hostel Ops Database Seed Complete!\n');
    console.log('🔐  Credential Quick-Reference (All 4 Required Roles):');
    console.log('    1. Admin:   admin@spit.ac.in   / Admin@123');
    console.log('    2. Warden:  warden@spit.ac.in  / Warden@123');
    console.log('    3. Mentor:  mentor@spit.ac.in  / Mentor@123');
    console.log('    4. Student: student@spit.ac.in / Student@123');
    console.log('\n(No staff login, exactly as requested!)\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌  Seed Error:', err);
    process.exit(1);
  }
};

seed();
