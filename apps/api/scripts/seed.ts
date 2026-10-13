/**
 * Seed Script — Department Inventory Management System
 * Run: npm run seed (from apps/api)
 * This script is idempotent — safe to run multiple times.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

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
import { addCalendarDays } from '../src/utils/dateUtils';

const HASH_ROUNDS = 12;

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(config.mongoUri);
  console.log('✅ Connected');

  // ── 1. COORDINATOR ──────────────────────────────────────────────────────────
  let coordinator = await User.findOne({ email: config.seed.coordinatorEmail });
  if (!coordinator) {
    coordinator = await User.create({
      email: config.seed.coordinatorEmail,
      passwordHash: await bcrypt.hash(config.seed.coordinatorPassword, HASH_ROUNDS),
      role: 'coordinator',
      fullName: 'Dr. Priya Sharma',
      isActive: true,
    });
    console.log('✅ Coordinator created:', config.seed.coordinatorEmail);
  } else {
    console.log('⏭  Coordinator already exists');
  }

  // ── 2. STORAGE LOCATIONS ────────────────────────────────────────────────────
  const loc1 = await upsertLocation({
    locationCode: 'LAB-A-C1',
    department: 'Computer Science & IT',
    building: 'A Block',
    room: 'Lab 101',
    cupboard: 'Cupboard 1',
    description: 'Main embedded systems lab',
  });
  const loc2 = await upsertLocation({
    locationCode: 'LAB-B-C2',
    department: 'Computer Science & IT',
    building: 'B Block',
    room: 'Lab 202',
    cupboard: 'Cupboard 2',
    description: 'Network & hardware accessories lab',
  });

  // ── 3. INVENTORY ITEMS ──────────────────────────────────────────────────────
  const devBoardItem = await upsertInventoryItem({
    itemCode: 'INV-001',
    name: 'Raspberry Pi 4 Development Board',
    category: 'Development Board',
    description: '4GB RAM, quad-core ARM Cortex-A72 SoC',
    make: 'Raspberry Pi Foundation',
    model: 'Pi 4 Model B',
    trackingMode: 'individual',
    location: loc1._id,
    createdBy: coordinator._id,
  });

  const usbCableItem = await upsertInventoryItem({
    itemCode: 'INV-002',
    name: 'USB Type-C Cable (1m)',
    category: 'Cable',
    description: 'USB 3.1 Gen 1, 1 metre, braided',
    make: 'Generic',
    model: 'USB-C 1M',
    trackingMode: 'quantity',
    location: loc2._id,
    createdBy: coordinator._id,
    totalStock: 20,
    availableQty: 17,   // 3 currently issued
    issuedQty: 3,
  });

  // Seed initial stock transaction for USB cables
  const existingStockTx = await StockTransaction.findOne({ inventoryItem: usbCableItem._id });
  if (!existingStockTx) {
    await StockTransaction.create({
      inventoryItem: usbCableItem._id,
      transactionType: 'addition',
      quantityChange: 20,
      fieldAffected: 'availableQty',
      previousValue: 0,
      newValue: 20,
      reason: 'Initial stock addition',
      performedBy: coordinator._id,
    });
    console.log('✅ Initial USB cable stock transaction recorded');
  }

  // ── 4. INDIVIDUAL ASSETS (10 dev boards) ────────────────────────────────────
  const assetDefs = [
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

  const assets: any[] = [];
  for (const def of assetDefs) {
    const existing = await IndividualAsset.findOne({ assetId: def.assetId });
    if (!existing) {
      const asset = await IndividualAsset.create({
        assetId: def.assetId,
        serialNumber: def.serialNumber,
        inventoryItem: devBoardItem._id,
        location: loc1._id,
        condition: def.condition,
        status: def.status,
        addedBy: coordinator._id,
      });
      assets.push(asset);
    } else {
      assets.push(existing);
    }
  }

  // Update parent item asset counts
  const totalAssets = 10;
  const availableAssets = assetDefs.filter((a) => a.status === 'available').length;
  await InventoryItem.findByIdAndUpdate(devBoardItem._id, { totalAssets, availableAssets });
  console.log('✅ Individual assets seeded (DB-001 to DB-010)');

  // ── 5. STUDENTS ─────────────────────────────────────────────────────────────
  const studentDefs = [
    { enrolment: 'DFIS2601', name: 'Arjun Mehta', email: 'student1@demo.edu' },
    { enrolment: 'DFIS2602', name: 'Sneha Patel', email: 'student2@demo.edu' },
    { enrolment: 'DFIS2603', name: 'Rohan Kumar', email: 'student3@demo.edu' },
    { enrolment: 'DFIS2604', name: 'Priyanka Singh', email: 'student4@demo.edu' },
    { enrolment: 'DFIS2605', name: 'Vikram Nair', email: 'student5@demo.edu' },
  ];

  const students: any[] = [];
  for (const def of studentDefs) {
    let studentUser = await User.findOne({ email: def.email });
    if (!studentUser) {
      studentUser = await User.create({
        email: def.email,
        passwordHash: await bcrypt.hash(config.seed.studentPassword, HASH_ROUNDS),
        role: 'student',
        fullName: def.name,
        isActive: true,
      });
    }
    let student = await Student.findOne({ enrolmentNumber: def.enrolment });
    if (!student) {
      student = await Student.create({
        enrolmentNumber: def.enrolment,
        fullName: def.name,
        programme: 'M.Sc. DFIS',
        semester: 1,
        email: def.email,
        phone: `+91 98${Math.floor(10000000 + Math.random() * 89999999)}`,
        user: studentUser._id,
      });
      await User.findByIdAndUpdate(studentUser._id, { studentProfile: student._id });
    }
    students.push(student);
  }
  console.log('✅ Students seeded (DFIS2601–DFIS2605)');

  // ── 6. ISSUE RECORDS ────────────────────────────────────────────────────────

  // Issue 1: Arjun — 2 USB cables (active, not overdue) - issued 5 Oct 2026, due 20 Oct
  const issue1Exists = await IssueRecord.findOne({ student: students[0]._id, status: 'active' });
  if (!issue1Exists) {
    const issueDate1 = new Date('2026-10-05T10:00:00.000Z');
    const dueDate1 = addCalendarDays(issueDate1, 15); // 20 Oct

    const issueRec1 = await IssueRecord.create({
      student: students[0]._id,
      issuedBy: coordinator._id,
      issueDate: issueDate1,
      purpose: 'Digital forensics lab experiment',
      status: 'active',
      lines: [],
    });

    const line1 = await IssueLine.create({
      issueRecord: issueRec1._id,
      inventoryItem: usbCableItem._id,
      individualAsset: null,
      issuedQty: 2,
      returnedQty: 0,
      outstandingQty: 2,
      issueDate: issueDate1,
      dueDate: dueDate1,
      renewalCount: 0,
      maxRenewals: 3,
      status: 'active',
    });

    await IssueRecord.findByIdAndUpdate(issueRec1._id, { lines: [line1._id] });
    console.log('✅ Issue 1 seeded (Arjun — 2 USB cables, due 20 Oct)');
  }

  // Issue 2: Sneha — DB-003 dev board (OVERDUE — issued 25 Sep, due 10 Oct)
  const issue2Exists = await IssueRecord.findOne({ student: students[1]._id });
  if (!issue2Exists) {
    const issueDate2 = new Date('2026-09-25T09:00:00.000Z');
    const dueDate2 = addCalendarDays(issueDate2, 15); // 10 Oct — OVERDUE (today is 13 Oct)

    const asset3 = assets.find((a) => a.assetId === 'DB-003');

    const issueRec2 = await IssueRecord.create({
      student: students[1]._id,
      issuedBy: coordinator._id,
      issueDate: issueDate2,
      purpose: 'Network packet analysis project',
      status: 'overdue',
      lines: [],
    });

    const line2 = await IssueLine.create({
      issueRecord: issueRec2._id,
      inventoryItem: devBoardItem._id,
      individualAsset: asset3._id,
      issuedQty: 1,
      returnedQty: 0,
      outstandingQty: 1,
      issueDate: issueDate2,
      dueDate: dueDate2,
      renewalCount: 0,
      maxRenewals: 3,
      status: 'overdue',
    });

    await IssueRecord.findByIdAndUpdate(issueRec2._id, { lines: [line2._id] });
    await IndividualAsset.findByIdAndUpdate(asset3._id, {
      status: 'issued',
      currentIssue: line2._id,
    });

    // Add pending renewal request for this overdue issue
    // Note: Renewal was requested BEFORE the due date (on 9 Oct, before 10 Oct due)
    await RenewalRequest.create({
      issueLine: line2._id,
      issueRecord: issueRec2._id,
      student: students[1]._id,
      requestedBy: (await User.findOne({ studentProfile: students[1]._id }))?._id,
      requestDate: new Date('2026-10-09T08:00:00.000Z'),
      previousDueDate: dueDate2,
      proposedDueDate: addCalendarDays(dueDate2, 15),
      status: 'pending',
    });

    console.log('✅ Issue 2 seeded (Sneha — DB-003, OVERDUE 3 days) + pending renewal');
  }

  // Issue 3: Rohan — 1 USB cable partially returned
  const issue3Exists = await IssueRecord.findOne({ student: students[2]._id });
  if (!issue3Exists) {
    const issueDate3 = new Date('2026-10-01T11:00:00.000Z');
    const dueDate3 = addCalendarDays(issueDate3, 15); // 16 Oct

    const issueRec3 = await IssueRecord.create({
      student: students[2]._id,
      issuedBy: coordinator._id,
      issueDate: issueDate3,
      purpose: 'Forensics tool connectivity testing',
      status: 'partially_returned',
      lines: [],
    });

    const line3 = await IssueLine.create({
      issueRecord: issueRec3._id,
      inventoryItem: usbCableItem._id,
      individualAsset: null,
      issuedQty: 5,
      returnedQty: 2,
      outstandingQty: 3,
      issueDate: issueDate3,
      dueDate: dueDate3,
      renewalCount: 0,
      maxRenewals: 3,
      status: 'active',
    });

    await IssueRecord.findByIdAndUpdate(issueRec3._id, { lines: [line3._id] });

    // Return transaction for 2 returned cables
    await ReturnTransaction.create({
      issueLine: line3._id,
      issueRecord: issueRec3._id,
      student: students[2]._id,
      inventoryItem: usbCableItem._id,
      individualAsset: null,
      returnDate: new Date('2026-10-08T10:00:00.000Z'),
      quantityReturned: 2,
      conditionOnReturn: 'good',
      receivedBy: coordinator._id,
      remarks: 'Partial return — 3 cables still in use',
      restoredToAvailable: 2,
      markedDamaged: 0,
      markedLost: 0,
    });

    // Adjust USB cable stock for partial return — availableQty was 17 above (accounts for 3 outstanding)
    // The issued=3 in usbCableItem reflects: 2 from issue1 + 1 from issue4 (DB-004 is individual)
    // Actually: Rohan has 5 issued - 2 returned = 3 outstanding. Arjun has 2. Total issued = 5.
    // We already set availableQty=17, issuedQty=3 above; let's correct to match real data:
    // total=20, issued=5 (2 arjun + 3 rohan outstanding), available=15
    await InventoryItem.findByIdAndUpdate(usbCableItem._id, {
      availableQty: 15,
      issuedQty: 5,
    });

    console.log('✅ Issue 3 seeded (Rohan — 5 USB cables, 2 returned, 3 outstanding)');
  }

  // Issue 4: Priyanka — DB-004 issued and RETURNED (completed)
  const issue4Exists = await IssueRecord.findOne({ student: students[3]._id });
  if (!issue4Exists) {
    const issueDate4 = new Date('2026-09-15T09:00:00.000Z');
    const dueDate4 = addCalendarDays(issueDate4, 15); // 30 Sep

    const asset4 = assets.find((a) => a.assetId === 'DB-004');

    const issueRec4 = await IssueRecord.create({
      student: students[3]._id,
      issuedBy: coordinator._id,
      issueDate: issueDate4,
      purpose: 'Completed lab session',
      status: 'returned',
      lines: [],
    });

    const line4 = await IssueLine.create({
      issueRecord: issueRec4._id,
      inventoryItem: devBoardItem._id,
      individualAsset: asset4._id,
      issuedQty: 1,
      returnedQty: 1,
      outstandingQty: 0,
      issueDate: issueDate4,
      dueDate: dueDate4,
      renewalCount: 1,
      maxRenewals: 3,
      status: 'returned',
    });

    await IssueRecord.findByIdAndUpdate(issueRec4._id, { lines: [line4._id] });

    // Return transaction
    await ReturnTransaction.create({
      issueLine: line4._id,
      issueRecord: issueRec4._id,
      student: students[3]._id,
      inventoryItem: devBoardItem._id,
      individualAsset: asset4._id,
      returnDate: new Date('2026-09-28T14:00:00.000Z'),
      quantityReturned: 1,
      conditionOnReturn: 'good',
      receivedBy: coordinator._id,
      remarks: 'Returned in perfect condition',
      restoredToAvailable: 1,
      markedDamaged: 0,
      markedLost: 0,
    });

    // Approved renewal record
    await RenewalRequest.create({
      issueLine: line4._id,
      issueRecord: issueRec4._id,
      student: students[3]._id,
      requestedBy: (await User.findOne({ studentProfile: students[3]._id }))?._id,
      requestDate: new Date('2026-09-28T08:00:00.000Z'),
      previousDueDate: dueDate4,
      proposedDueDate: addCalendarDays(dueDate4, 15),
      status: 'approved',
      decidedBy: coordinator._id,
      decidedAt: new Date('2026-09-28T09:00:00.000Z'),
      remarks: 'Approved — student requested 1 day before due',
    });

    // DB-004 is "issued" in seed — but was returned. Mark it available
    await IndividualAsset.findByIdAndUpdate(asset4._id, {
      status: 'available',
      condition: 'good',
      currentIssue: null,
    });

    console.log('✅ Issue 4 seeded (Priyanka — DB-004, returned + approved renewal)');
  }

  // ── 7. DAMAGED ASSET (DB-006) ────────────────────────────────────────────────
  const db6 = await IndividualAsset.findOne({ assetId: 'DB-006' });
  if (db6 && db6.conditionHistory.length === 0) {
    await IndividualAsset.findByIdAndUpdate(db6._id, {
      $push: {
        conditionHistory: {
          condition: 'damaged',
          changedBy: coordinator._id,
          changedAt: new Date('2026-10-10T11:00:00.000Z'),
          reason: 'Burnt during power surge incident',
        },
      },
    });
    console.log('✅ DB-006 damaged condition history added');
  }

  console.log('\n🎉 Seed complete! Demo accounts:');
  console.log(`   Coordinator : ${config.seed.coordinatorEmail} / ${config.seed.coordinatorPassword}`);
  studentDefs.forEach((s) => {
    console.log(`   Student     : ${s.email} / ${config.seed.studentPassword} (${s.enrolment})`);
  });

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
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
