/**
 * Seed Script — Department Inventory Management System
 * Run: npm run seed (from apps/api or project root)
 * This script is idempotent — safe to run multiple times.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPaths = [
  process.env.DOTENV_CONFIG_PATH,
  path.resolve(process.cwd(), '.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env'),
].filter(Boolean) as string[];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from '../src/config';
import { User } from '../src/modules/users/user.model';
import { Student } from '../src/modules/students/student.model';
import { StorageLocation } from '../src/modules/locations/location.model';
import { InventoryItem } from '../src/modules/inventory/inventory.model';
import { IndividualAsset } from '../src/modules/assets/asset.model';
import { IssueRecord, IssueLine } from '../src/modules/issues/issue.model';
import { ReturnTransaction } from '../src/modules/returns/return.model';
import { RenewalRequest } from '../src/modules/renewals/renewal.model';
import { StockTransaction } from '../src/modules/stock-adjustments/stockTransaction.model';
import { calculateDueDate, calculateRenewalDueDate } from '../src/utils/dateUtils';

const HASH_ROUNDS = 10;
const UNIVERSAL_PASSWORD = 'demo1234';

async function seed() {
  const maskedUri = config.mongoUri.replace(/:([^:@]+)@/, ':****@');
  console.log('🌱 Connecting to MongoDB at:', maskedUri);
  await mongoose.connect(config.mongoUri, {
    dbName: config.mongoDbName || 'dept_inventory',
  });
  console.log(`✅ Connected to MongoDB database "${mongoose.connection.name}"`);

  const passwordHash = await bcrypt.hash(UNIVERSAL_PASSWORD, HASH_ROUNDS);

  // ── 1. ADMINISTRATOR ────────────────────────────────────────────────────────
  let admin = await User.findOne({ email: 'admin@department.edu' });
  if (!admin) {
    admin = await User.create({
      email: 'admin@department.edu',
      passwordHash,
      role: 'admin',
      fullName: 'Prof. Sarah Jenkins',
      isActive: true,
    });
    console.log('✅ Administrator created: admin@department.edu');
  } else {
    console.log('⏭  Administrator already exists');
  }

  // ── 2. COORDINATOR ACCOUNTS ──────────────────────────────────────────────────
  const coordinatorEmails = [
    { email: 'coordinator@department.edu', name: 'Dr. Robert Vance' },
    { email: config.seed.coordinatorEmail, name: 'Dr. Robert Vance' },
  ];

  let primaryCoordinator: any = null;
  for (const c of coordinatorEmails) {
    let coord = await User.findOne({ email: c.email });
    if (!coord) {
      coord = await User.create({
        email: c.email,
        passwordHash,
        role: 'coordinator',
        fullName: c.name,
        isActive: true,
      });
      console.log(`✅ Coordinator created: ${c.email}`);
    } else {
      console.log(`⏭  Coordinator already exists: ${c.email}`);
    }
    if (!primaryCoordinator) primaryCoordinator = coord;
  }

  // ── 3. STORAGE LOCATIONS ────────────────────────────────────────────────────
  const loc1 = await upsertLocation({
    locationCode: 'LAB-A-C1',
    department: 'Computer Science & Engineering',
    building: 'A Block',
    room: 'Lab 101',
    cupboard: 'Cupboard 1',
    description: 'Main embedded systems and IoT hardware lab',
  });

  const loc2 = await upsertLocation({
    locationCode: 'LAB-B-C2',
    department: 'Electronics & Communication',
    building: 'B Block',
    room: 'Lab 202',
    cupboard: 'Cupboard 2',
    description: 'Networking and testing accessories lab',
  });

  const loc3 = await upsertLocation({
    locationCode: 'LOCKER-SEC',
    department: 'Computer Science & Engineering',
    building: 'A Block',
    room: 'Lab 101',
    cupboard: 'Security Locker',
    description: 'High-value instruments and microcontrollers locker',
  });

  // ── 4. INVENTORY ITEMS ──────────────────────────────────────────────────────
  // Mode A: Raspberry Pi 4 Development Boards
  const devBoardItem = await upsertInventoryItem({
    itemCode: 'INV-001',
    name: 'Raspberry Pi 4 Model B (4GB)',
    category: 'Development Board',
    description: 'Quad-core Cortex-A72, 4GB LPDDR4, dual micro-HDMI',
    make: 'Raspberry Pi Foundation',
    model: 'Pi 4 Model B',
    trackingMode: 'individual',
    location: loc1._id,
    createdBy: primaryCoordinator._id,
    totalAssets: 10,
    availableAssets: 7,
  });

  // Mode B: USB Type-C Reusable Cables
  const usbCableItem = await upsertInventoryItem({
    itemCode: 'INV-002',
    name: 'USB Type-C Fast-Charging Cable (1m)',
    category: 'Cable',
    description: 'USB 3.1 braided reusable data cable',
    make: 'Generic',
    model: 'USB-C 1M Braided',
    trackingMode: 'quantity',
    location: loc2._id,
    createdBy: primaryCoordinator._id,
    totalStock: 20,
    availableQty: 15,
    issuedQty: 5,
    damagedQty: 0,
    lostQty: 0,
    maintenanceQty: 0,
  });

  // Mode A: Arduino Uno R3 Boards
  const arduinoItem = await upsertInventoryItem({
    itemCode: 'INV-003',
    name: 'Arduino Uno R3 Microcontroller Board',
    category: 'Microcontroller',
    description: 'ATmega328P microcontroller with USB interface',
    make: 'Arduino Official',
    model: 'Uno R3',
    trackingMode: 'individual',
    location: loc3._id,
    createdBy: primaryCoordinator._id,
    totalAssets: 5,
    availableAssets: 4,
  });

  // Mode B: Digital Multimeters
  const multimeterItem = await upsertInventoryItem({
    itemCode: 'INV-004',
    name: 'Digital Multimeter with Test Probes',
    category: 'Testing Instrument',
    description: 'True RMS digital multimeter with continuity buzzer',
    make: 'Fluke / Mastech',
    model: 'MAS830L',
    trackingMode: 'quantity',
    location: loc2._id,
    createdBy: primaryCoordinator._id,
    totalStock: 10,
    availableQty: 7,
    issuedQty: 2,
    damagedQty: 1,
    lostQty: 0,
    maintenanceQty: 0,
  });

  // Initial stock transactions
  const existingStockTx = await StockTransaction.findOne({ inventoryItem: usbCableItem._id });
  if (!existingStockTx) {
    await StockTransaction.create({
      inventoryItem: usbCableItem._id,
      transactionType: 'addition',
      quantityChange: 20,
      fieldAffected: 'availableQty',
      previousValue: 0,
      newValue: 20,
      reason: 'Initial departmental stock intake',
      performedBy: primaryCoordinator._id,
    });
    console.log('✅ USB cable initial stock transaction logged');
  }

  // ── 5. INDIVIDUAL ASSETS ────────────────────────────────────────────────────
  // 10 Raspberry Pi Assets (DB-001 to DB-010)
  const devBoardAssets: any[] = [];
  const piAssetDefs = [
    { assetId: 'DB-001', serialNumber: 'RP4B-001-2024', condition: 'good', status: 'available' },
    { assetId: 'DB-002', serialNumber: 'RP4B-002-2024', condition: 'good', status: 'available' },
    { assetId: 'DB-003', serialNumber: 'RP4B-003-2024', condition: 'good', status: 'issued' },
    { assetId: 'DB-004', serialNumber: 'RP4B-004-2024', condition: 'good', status: 'issued' },
    { assetId: 'DB-005', serialNumber: 'RP4B-005-2024', condition: 'good', status: 'available' },
    { assetId: 'DB-006', serialNumber: 'RP4B-006-2024', condition: 'damaged', status: 'maintenance' },
    { assetId: 'DB-007', serialNumber: 'RP4B-007-2024', condition: 'good', status: 'available' },
    { assetId: 'DB-008', serialNumber: 'RP4B-008-2024', condition: 'good', status: 'available' },
    { assetId: 'DB-009', serialNumber: 'RP4B-009-2024', condition: 'good', status: 'available' },
    { assetId: 'DB-010', serialNumber: 'RP4B-010-2024', condition: 'good', status: 'available' },
  ];

  for (const def of piAssetDefs) {
    let asset = await IndividualAsset.findOne({ assetId: def.assetId });
    if (!asset) {
      asset = await IndividualAsset.create({
        assetId: def.assetId,
        serialNumber: def.serialNumber,
        inventoryItem: devBoardItem._id,
        location: loc1._id,
        condition: def.condition,
        status: def.status,
        addedBy: primaryCoordinator._id,
        conditionHistory: [
          {
            condition: def.condition,
            changedBy: primaryCoordinator._id,
            changedAt: new Date('2026-10-01'),
            reason: def.condition === 'damaged' ? 'Power surge damage in lab test' : 'Asset verified good',
          },
        ],
      });
    }
    devBoardAssets.push(asset);
  }

  // 5 Arduino Assets (AST-ARD-001 to AST-ARD-005)
  for (let i = 1; i <= 5; i++) {
    const assetId = `AST-ARD-00${i}`;
    const exists = await IndividualAsset.findOne({ assetId });
    if (!exists) {
      await IndividualAsset.create({
        assetId,
        serialNumber: `ARD-UNO-2024-${i}`,
        inventoryItem: arduinoItem._id,
        location: loc3._id,
        condition: 'good',
        status: i === 1 ? 'issued' : 'available',
        addedBy: primaryCoordinator._id,
      });
    }
  }

  console.log('✅ Individual assets registered (DB-001..DB-010, AST-ARD-001..AST-ARD-005)');

  // ── 6. STUDENTS ─────────────────────────────────────────────────────────────
  const studentDefs = [
    {
      enrolment: 'CS-2024-001',
      name: 'Jane Doe',
      email: 'student1@department.edu',
      programme: 'Computer Engineering',
      semester: 1,
    },
    {
      enrolment: 'CS-2024-015',
      name: 'Alex Johnson',
      email: 'alex@department.edu',
      programme: 'Computer Engineering',
      semester: 1,
    },
    {
      enrolment: 'EC-2024-009',
      name: 'Priya Sharma',
      email: 'priya@department.edu',
      programme: 'Electronics & Comm',
      semester: 1,
    },
    {
      enrolment: 'ME-2024-032',
      name: 'Carlos Mendez',
      email: 'carlos@department.edu',
      programme: 'Mechanical Engineering',
      semester: 3,
    },
    {
      enrolment: 'DFIS2601',
      name: 'Arjun Mehta',
      email: 'student1@demo.edu',
      programme: 'M.Sc. DFIS',
      semester: 1,
    },
  ];

  const studentMap = new Map<string, any>();
  for (const def of studentDefs) {
    let user = await User.findOne({ email: def.email });
    if (!user) {
      user = await User.create({
        email: def.email,
        passwordHash,
        role: 'student',
        fullName: def.name,
        isActive: true,
      });
      console.log(`✅ Student user created: ${def.email}`);
    }

    let student = await Student.findOne({ enrolmentNumber: def.enrolment });
    if (!student) {
      student = await Student.create({
        enrolmentNumber: def.enrolment,
        fullName: def.name,
        programme: def.programme,
        semester: def.semester,
        email: def.email,
        phone: '+91 9876543210',
        address: 'Campus Hostel Block B',
        user: user._id,
        isActive: true,
      });
      await User.findByIdAndUpdate(user._id, { studentProfile: student._id });
      console.log(`✅ Student profile linked: ${def.enrolment}`);
    }
    studentMap.set(def.enrolment, student);
  }

  // ── 7. SEED REALISTIC LOAN SCENARIOS ─────────────────────────────────────────
  const jane = studentMap.get('CS-2024-001');
  const alex = studentMap.get('CS-2024-015');

  // Scenario 1: Jane Doe (Active loan: 1 Dev Board + 1 USB cable, with 1 pending renewal)
  if (jane) {
    const existingJaneIssue = await IssueRecord.findOne({ student: jane._id });
    if (!existingJaneIssue) {
      const issueDate = new Date('2026-10-01');
      const dueDate = calculateDueDate(issueDate);

      const db3Asset = await IndividualAsset.findOne({ assetId: 'DB-003' });

      const issue = await IssueRecord.create({
        student: jane._id,
        issuedBy: primaryCoordinator._id,
        issueDate,
        purpose: 'Embedded Systems Lab Mini Project',
        status: 'active',
        lines: [],
      });

      const line1 = await IssueLine.create({
        issueRecord: issue._id,
        inventoryItem: devBoardItem._id,
        individualAsset: db3Asset?._id,
        issuedQty: 1,
        returnedQty: 0,
        outstandingQty: 1,
        issueDate,
        dueDate,
        renewalCount: 0,
        maxRenewals: 3,
        status: 'active',
      });

      if (db3Asset) {
        await IndividualAsset.findByIdAndUpdate(db3Asset._id, { currentIssue: line1._id });
      }

      const line2 = await IssueLine.create({
        issueRecord: issue._id,
        inventoryItem: usbCableItem._id,
        individualAsset: null,
        issuedQty: 1,
        returnedQty: 0,
        outstandingQty: 1,
        issueDate,
        dueDate,
        renewalCount: 0,
        maxRenewals: 3,
        status: 'active',
      });

      await IssueRecord.findByIdAndUpdate(issue._id, { lines: [line1._id, line2._id] });

      // Create a pending renewal request for Line 1
      await RenewalRequest.create({
        issueLine: line1._id,
        issueRecord: issue._id,
        student: jane._id,
        requestedBy: jane.user,
        requestDate: new Date('2026-10-12'),
        previousDueDate: dueDate,
        proposedDueDate: calculateRenewalDueDate(dueDate),
        status: 'pending',
        remarks: 'Require 15 extra days for sensor calibration tests',
      });

      console.log('✅ Scenario 1 seeded: Jane Doe active loan with pending renewal request');
    }
  }

  // Scenario 2: Alex Johnson (Overdue loan: DB-004 past due date by 7 days)
  if (alex) {
    const existingAlexIssue = await IssueRecord.findOne({ student: alex._id });
    if (!existingAlexIssue) {
      const pastIssueDate = new Date('2026-09-20');
      const pastDueDate = calculateDueDate(pastIssueDate); // Oct 5 (overdue)

      const db4Asset = await IndividualAsset.findOne({ assetId: 'DB-004' });

      const issue = await IssueRecord.create({
        student: alex._id,
        issuedBy: primaryCoordinator._id,
        issueDate: pastIssueDate,
        purpose: 'IoT Gateway Capstone Work',
        status: 'overdue',
        lines: [],
      });

      const line1 = await IssueLine.create({
        issueRecord: issue._id,
        inventoryItem: devBoardItem._id,
        individualAsset: db4Asset?._id,
        issuedQty: 1,
        returnedQty: 0,
        outstandingQty: 1,
        issueDate: pastIssueDate,
        dueDate: pastDueDate,
        renewalCount: 0,
        maxRenewals: 3,
        status: 'overdue',
      });

      if (db4Asset) {
        await IndividualAsset.findByIdAndUpdate(db4Asset._id, { currentIssue: line1._id });
      }

      await IssueRecord.findByIdAndUpdate(issue._id, { lines: [line1._id] });
      console.log('✅ Scenario 2 seeded: Alex Johnson overdue loan (blocks new borrowing)');
    }
  }

  console.log('\n======================================================');
  console.log('🎉 REAL MONGODB DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('All accounts password: demo1234');
  console.log('  • Admin       : admin@department.edu');
  console.log('  • Coordinator : coordinator@department.edu');
  console.log('  • Student 1   : student1@department.edu  (Roll: CS-2024-001)');
  console.log('  • Student 2   : alex@department.edu      (Roll: CS-2024-015 - Overdue)');
  console.log('  • Student 3   : priya@department.edu     (Roll: EC-2024-009)');
  console.log('  • Student 4   : carlos@department.edu    (Roll: ME-2024-032)');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

async function upsertLocation(data: any) {
  const existing = await StorageLocation.findOne({ locationCode: data.locationCode });
  if (existing) return existing;
  const loc = await StorageLocation.create(data);
  console.log(`✅ Location created: ${data.locationCode}`);
  return loc;
}

async function upsertInventoryItem(data: any) {
  const existing = await InventoryItem.findOne({ itemCode: data.itemCode });
  if (existing) return existing;
  const item = await InventoryItem.create({
    ...data,
    policy: { maxRenewals: 3, borrowingDays: 15 },
  });
  console.log(`✅ Inventory item created: ${data.itemCode}`);
  return item;
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
