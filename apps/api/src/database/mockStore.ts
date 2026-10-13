import jwt from 'jsonwebtoken';
import { config } from '../config';

// ── In-Memory State Containers ──────────────────────────────────────────────
export const mockData: Record<string, any[]> = {
  users: [
    {
      _id: 'usr_coord_1',
      id: 'usr_coord_1',
      name: 'Dr. Robert Vance',
      email: 'coordinator@department.edu',
      role: 'coordinator',
      department: 'Computer Engineering',
    },
    {
      _id: 'usr_student_1',
      id: 'usr_student_1',
      name: 'Jane Doe',
      email: 'student1@department.edu',
      role: 'student',
      studentId: 'CS-2024-001',
      department: 'Computer Engineering',
    },
    {
      _id: 'usr_admin_1',
      id: 'usr_admin_1',
      name: 'Prof. Sarah Jenkins',
      email: 'admin@department.edu',
      role: 'admin',
      department: 'Computer Engineering',
    },
  ],

  students: [
    {
      _id: 'stu_1',
      studentId: 'CS-2024-001',
      name: 'Jane Doe',
      email: 'student1@department.edu',
      phone: '+91 9876543210',
      department: 'Computer Engineering',
      semester: 4,
      currentBorrowedCount: 2,
      maxBorrowLimit: 5,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'stu_2',
      studentId: 'CS-2024-015',
      name: 'Alex Johnson',
      email: 'alex@department.edu',
      phone: '+91 9876543211',
      department: 'Computer Engineering',
      semester: 6,
      currentBorrowedCount: 1,
      maxBorrowLimit: 5,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'stu_3',
      studentId: 'EC-2024-009',
      name: 'Priya Sharma',
      email: 'priya@department.edu',
      phone: '+91 9876543212',
      department: 'Electronics & Comm',
      semester: 4,
      currentBorrowedCount: 3,
      maxBorrowLimit: 5,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'stu_4',
      studentId: 'ME-2024-032',
      name: 'Carlos Mendez',
      email: 'carlos@department.edu',
      phone: '+91 9876543213',
      department: 'Mechanical',
      semester: 2,
      currentBorrowedCount: 5,
      maxBorrowLimit: 5,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],

  locations: [
    { _id: 'loc_1', code: 'LAB-201-A', name: 'Microprocessor Lab Shelf A', building: 'Tech Block 1', room: '201', isActive: true },
    { _id: 'loc_2', code: 'LAB-202-B', name: 'Robotics Lab Locker 4', building: 'Tech Block 2', room: '202', isActive: true },
    { _id: 'loc_3', code: 'STORE-01', name: 'Central Department Store', building: 'Main Admin', room: '105', isActive: true },
  ],

  inventory: [
    {
      _id: 'inv_1',
      sku: 'ARD-UNO-01',
      name: 'Arduino Uno R3 Dev Board',
      category: 'Electronics',
      trackingMode: 'individual' as const,
      totalQuantity: 15,
      availableQuantity: 10,
      issuedQuantity: 3,
      damagedQuantity: 1,
      maintenanceQuantity: 1,
      lostQuantity: 0,
      lowStockThreshold: 4,
      unit: 'pieces',
      isConsumable: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'inv_2',
      sku: 'RPI-4B-4GB',
      name: 'Raspberry Pi 4 Model B (4GB RAM)',
      category: 'Computing',
      trackingMode: 'individual' as const,
      totalQuantity: 8,
      availableQuantity: 4,
      issuedQuantity: 3,
      damagedQuantity: 0,
      maintenanceQuantity: 1,
      lostQuantity: 0,
      lowStockThreshold: 3,
      unit: 'pieces',
      isConsumable: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'inv_3',
      sku: 'DMM-FLUKE-101',
      name: 'Fluke 101 Digital Multimeter',
      category: 'Laboratory',
      trackingMode: 'individual' as const,
      totalQuantity: 10,
      availableQuantity: 7,
      issuedQuantity: 2,
      damagedQuantity: 1,
      maintenanceQuantity: 0,
      lostQuantity: 0,
      lowStockThreshold: 2,
      unit: 'units',
      isConsumable: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'inv_4',
      sku: 'SENS-HCSR04',
      name: 'HC-SR04 Ultrasonic Distance Sensor',
      category: 'Sensors',
      trackingMode: 'quantity' as const,
      totalQuantity: 45,
      availableQuantity: 32,
      issuedQuantity: 10,
      damagedQuantity: 3,
      maintenanceQuantity: 0,
      lostQuantity: 0,
      lowStockThreshold: 10,
      unit: 'pieces',
      isConsumable: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'inv_5',
      sku: 'DRV-L298N',
      name: 'L298N Dual H-Bridge Motor Driver',
      category: 'Robotics',
      trackingMode: 'quantity' as const,
      totalQuantity: 25,
      availableQuantity: 18,
      issuedQuantity: 5,
      damagedQuantity: 2,
      maintenanceQuantity: 0,
      lostQuantity: 0,
      lowStockThreshold: 8,
      unit: 'pieces',
      isConsumable: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'inv_6',
      sku: 'WIR-JUMP-100',
      name: 'Breadboard Jumper Wires (65 Pcs Pack)',
      category: 'General',
      trackingMode: 'quantity' as const,
      totalQuantity: 60,
      availableQuantity: 42,
      issuedQuantity: 18,
      damagedQuantity: 0,
      maintenanceQuantity: 0,
      lostQuantity: 0,
      lowStockThreshold: 15,
      unit: 'packs',
      isConsumable: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],

  assets: [
    { _id: 'ast_1', itemId: 'inv_1', assetTag: 'AST-ARD-001', serialNumber: 'SN-ARD-8810', condition: 'good', status: 'available', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'ast_2', itemId: 'inv_1', assetTag: 'AST-ARD-002', serialNumber: 'SN-ARD-8811', condition: 'good', status: 'issued', currentIssueId: 'iss_1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'ast_3', itemId: 'inv_1', assetTag: 'AST-ARD-003', serialNumber: 'SN-ARD-8812', condition: 'good', status: 'available', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'ast_4', itemId: 'inv_1', assetTag: 'AST-ARD-004', serialNumber: 'SN-ARD-8813', condition: 'damaged', status: 'maintenance', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'ast_5', itemId: 'inv_2', assetTag: 'AST-RPI-001', serialNumber: 'SN-RPI-4001', condition: 'good', status: 'issued', currentIssueId: 'iss_1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'ast_6', itemId: 'inv_2', assetTag: 'AST-RPI-002', serialNumber: 'SN-RPI-4002', condition: 'good', status: 'available', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'ast_7', itemId: 'inv_3', assetTag: 'AST-DMM-001', serialNumber: 'SN-FLUKE-901', condition: 'good', status: 'available', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],

  issues: [
    {
      _id: 'iss_1',
      issueNumber: 'ISS-20261013-0001',
      studentId: 'stu_1',
      issuedBy: 'usr_coord_1',
      issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      expectedReturnDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      purpose: 'Robotics obstacle-avoidance lab assignment',
      lines: [
        {
          _id: 'line_1_1',
          issueId: 'iss_1',
          itemId: 'inv_1',
          assetId: 'ast_2',
          quantity: 1,
          returnedQuantity: 0,
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          renewalCount: 0,
          maxRenewals: 3,
          status: 'active',
        },
        {
          _id: 'line_1_2',
          issueId: 'iss_1',
          itemId: 'inv_2',
          assetId: 'ast_5',
          quantity: 1,
          returnedQuantity: 0,
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          renewalCount: 1,
          maxRenewals: 3,
          status: 'active',
        },
      ],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'iss_2',
      issueNumber: 'ISS-20260920-0012',
      studentId: 'stu_2',
      issuedBy: 'usr_coord_1',
      issueDate: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
      expectedReturnDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'overdue',
      purpose: 'Embedded systems final project',
      lines: [
        {
          _id: 'line_2_1',
          issueId: 'iss_2',
          itemId: 'inv_3',
          assetId: 'ast_7',
          quantity: 1,
          returnedQuantity: 0,
          dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          renewalCount: 0,
          maxRenewals: 3,
          status: 'overdue',
        },
      ],
      createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],

  renewals: [
    {
      _id: 'ren_1',
      requestNumber: 'REN-20261013-0001',
      issueId: 'iss_1',
      lineId: 'line_1_1',
      studentId: 'stu_1',
      requestedBy: 'usr_student_1',
      currentDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      proposedDueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      daysRequested: 15,
      reason: 'Need extra time to complete sensor calibration testing for competition.',
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ],

  returns: [
    {
      _id: 'ret_1',
      returnNumber: 'RET-20261010-0001',
      issueId: 'iss_old_1',
      studentId: 'stu_3',
      receivedBy: 'usr_coord_1',
      returnDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        { lineId: 'line_old_1', itemId: 'inv_1', quantityReturned: 1, condition: 'good' },
      ],
      notes: 'Returned in perfect working condition',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],

  stockTransactions: [
    {
      _id: 'stk_1',
      transactionNumber: 'TXN-20261001-0001',
      itemId: 'inv_1',
      type: 'addition',
      quantityDelta: 15,
      previousQuantity: 0,
      newQuantity: 15,
      previousBucket: 'initial',
      newBucket: 'available',
      performedBy: 'usr_coord_1',
      reason: 'Initial departmental inventory acquisition',
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      _id: 'stk_2',
      transactionNumber: 'TXN-20261008-0004',
      itemId: 'inv_1',
      type: 'issuance',
      quantityDelta: -3,
      previousQuantity: 13,
      newQuantity: 10,
      previousBucket: 'available',
      newBucket: 'issued',
      performedBy: 'usr_coord_1',
      reason: 'Issued to student loan ISS-20261013-0001',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],

  auditLogs: [
    {
      _id: 'aud_1',
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: 'usr_coord_1',
      userId: 'usr_coord_1',
      ipAddress: '127.0.0.1',
      metadata: { role: 'coordinator', client: 'Web App' },
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      _id: 'aud_2',
      action: 'ITEM_ISSUED',
      entityType: 'IssueRecord',
      entityId: 'iss_1',
      userId: 'usr_coord_1',
      metadata: { issueNumber: 'ISS-20261013-0001', linesCount: 2 },
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],

  notifications: [
    {
      _id: 'notif_1',
      userId: 'usr_coord_1',
      type: 'renewal_requested',
      title: 'New Renewal Request',
      message: 'Jane Doe requested a 15-day extension on Arduino Uno R3.',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'notif_2',
      userId: 'usr_coord_1',
      type: 'overdue',
      title: 'Overdue Loan Alert',
      message: 'Loan ISS-20260920-0012 for Alex Johnson is 7 days overdue.',
      isRead: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

// ── Mock Controller Helpers ──────────────────────────────────────────────────
export const mockStore = {
  // Auth
  login(email: string) {
    const user =
      mockData.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ||
      mockData.users[0]; // Fallback to coordinator

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    return { token, user };
  },

  // Inventory
  getInventory(query?: { search?: string; category?: string; lowStock?: boolean }) {
    let result = [...mockData.inventory];
    if (query?.category && query.category !== 'all') {
      result = result.filter((i) => i.category.toLowerCase() === query.category?.toLowerCase());
    }
    if (query?.search) {
      const q = query.search.toLowerCase();
      result = result.filter(
        (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
      );
    }
    if (query?.lowStock) {
      result = result.filter((i) => i.availableQuantity <= i.lowStockThreshold);
    }
    return {
      success: true,
      data: result,
      pagination: { page: 1, limit: 100, total: result.length, totalPages: 1 },
    };
  },

  createItem(data: any) {
    const newItem = {
      _id: `inv_${Date.now()}`,
      sku: data.sku,
      name: data.name,
      category: data.category || 'General',
      trackingMode: data.trackingMode || 'quantity',
      totalQuantity: Number(data.totalQuantity) || 0,
      availableQuantity: Number(data.availableQuantity || data.totalQuantity) || 0,
      issuedQuantity: 0,
      damagedQuantity: 0,
      maintenanceQuantity: 0,
      lostQuantity: 0,
      lowStockThreshold: Number(data.lowStockThreshold) || 5,
      unit: data.unit || 'pieces',
      isConsumable: !!data.isConsumable,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockData.inventory.unshift(newItem);

    // Record stock transaction
    mockData.stockTransactions.unshift({
      _id: `stk_${Date.now()}`,
      transactionNumber: `TXN-${Date.now()}`,
      itemId: newItem._id,
      type: 'addition',
      quantityDelta: newItem.totalQuantity,
      previousQuantity: 0,
      newQuantity: newItem.totalQuantity,
      previousBucket: 'initial',
      newBucket: 'available',
      performedBy: 'usr_coord_1',
      reason: 'New item catalog addition',
      createdAt: new Date().toISOString(),
    });

    return newItem;
  },

  addStock(itemId: string, quantity: number, reason: string) {
    const item = mockData.inventory.find((i) => i._id === itemId);
    if (!item) throw new Error('Item not found');

    item.totalQuantity += quantity;
    item.availableQuantity += quantity;
    item.updatedAt = new Date().toISOString();

    mockData.stockTransactions.unshift({
      _id: `stk_${Date.now()}`,
      transactionNumber: `TXN-${Date.now()}`,
      itemId: item._id,
      type: 'addition',
      quantityDelta: quantity,
      previousQuantity: item.availableQuantity - quantity,
      newQuantity: item.availableQuantity,
      previousBucket: 'available',
      newBucket: 'available',
      performedBy: 'usr_coord_1',
      reason: reason || 'Stock replenishment',
      createdAt: new Date().toISOString(),
    });

    return item;
  },

  // Issues
  createIssue(payload: any, userId = 'usr_coord_1') {
    const student = mockData.students.find((s) => s._id === payload.studentId);
    if (!student) throw new Error('Student not found');

    const totalQtyRequested = payload.lines.reduce((acc: number, l: any) => acc + (l.quantity || 1), 0);
    if (student.currentBorrowedCount + totalQtyRequested > student.maxBorrowLimit) {
      throw new Error(`Student quota exceeded! Maximum allowed: ${student.maxBorrowLimit}`);
    }

    const issueNumber = `ISS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const lines = payload.lines.map((l: any, idx: number) => {
      const item = mockData.inventory.find((i) => i._id === l.itemId);
      if (item) {
        if (item.availableQuantity < l.quantity) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }
        item.availableQuantity -= l.quantity;
        item.issuedQuantity += l.quantity;
      }

      if (l.assetId) {
        const asset = mockData.assets.find((a) => a._id === l.assetId);
        if (asset) {
          asset.status = 'issued';
        }
      }

      return {
        _id: `line_${Date.now()}_${idx}`,
        issueId: '',
        itemId: item || l.itemId,
        assetId: l.assetId ? mockData.assets.find((a) => a._id === l.assetId) : undefined,
        quantity: l.quantity,
        returnedQuantity: 0,
        dueDate: l.dueDate || payload.expectedReturnDate,
        renewalCount: 0,
        maxRenewals: 3,
        status: 'active',
      };
    });

    student.currentBorrowedCount += totalQtyRequested;

    const newIssue = {
      _id: `iss_${Date.now()}`,
      issueNumber,
      studentId: student,
      issuedBy: userId,
      issueDate: new Date().toISOString(),
      expectedReturnDate: payload.expectedReturnDate,
      status: 'active' as const,
      purpose: payload.purpose || 'Lab course project',
      notes: payload.notes,
      lines,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockData.issues.unshift(newIssue);

    mockData.auditLogs.unshift({
      _id: `aud_${Date.now()}`,
      action: 'ITEM_ISSUED',
      entityType: 'IssueRecord',
      entityId: newIssue._id,
      userId,
      metadata: { issueNumber, linesCount: lines.length },
      createdAt: new Date().toISOString(),
    });

    return newIssue;
  },

  // Returns
  processReturn(payload: any, receivedBy = 'usr_coord_1') {
    const issue = mockData.issues.find((i) => i._id === payload.issueId);
    if (!issue) throw new Error('Issue not found');

    const returnNumber = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const student = typeof issue.studentId === 'object' ? issue.studentId : mockData.students.find((s) => s._id === issue.studentId);

    payload.items.forEach((retItem: any) => {
      const line = issue.lines.find((l) => l._id === retItem.lineId);
      if (!line) return;

      line.returnedQuantity = (line.returnedQuantity || 0) + retItem.quantityReturned;
      if (line.returnedQuantity >= line.quantity) {
        line.status = 'returned';
      }

      const item = typeof line.itemId === 'object' ? line.itemId : mockData.inventory.find((i) => i._id === line.itemId);
      if (item) {
        item.issuedQuantity = Math.max(0, item.issuedQuantity - retItem.quantityReturned);
        if (retItem.condition === 'good') {
          item.availableQuantity += retItem.quantityReturned;
        } else if (retItem.condition === 'damaged') {
          item.damagedQuantity += retItem.quantityReturned;
        } else if (retItem.condition === 'lost') {
          item.lostQuantity += retItem.quantityReturned;
        }
      }

      if (student) {
        student.currentBorrowedCount = Math.max(0, student.currentBorrowedCount - retItem.quantityReturned);
      }
    });

    const allReturned = issue.lines.every((l) => (l.returnedQuantity || 0) >= l.quantity);
    issue.status = allReturned ? 'returned' : 'partially_returned';

    const newReturn = {
      _id: `ret_${Date.now()}`,
      returnNumber,
      issueId: issue._id,
      studentId: student?._id,
      receivedBy,
      returnDate: new Date().toISOString(),
      items: payload.items,
      notes: payload.notes,
      createdAt: new Date().toISOString(),
    };

    mockData.returns.unshift(newReturn);

    mockData.auditLogs.unshift({
      _id: `aud_${Date.now()}`,
      action: 'ITEM_RETURNED',
      entityType: 'ReturnTransaction',
      entityId: newReturn._id,
      userId: receivedBy,
      metadata: { returnNumber, issueNumber: issue.issueNumber },
      createdAt: new Date().toISOString(),
    });

    return newReturn;
  },

  // Renewals
  requestRenewal(payload: any, userId = 'usr_student_1') {
    const issue = mockData.issues.find((i) => i._id === payload.issueId);
    if (!issue) throw new Error('Issue not found');

    const line = issue.lines.find((l) => l._id === payload.lineId);
    if (!line) throw new Error('Line not found');

    if ((line.renewalCount || 0) >= (line.maxRenewals || 3)) {
      throw new Error('Maximum renewals reached (3 extensions max)!');
    }

    const currentDue = new Date(line.dueDate);
    const newDue = new Date(currentDue);
    newDue.setDate(newDue.getDate() + 15);

    const newRenewal = {
      _id: `ren_${Date.now()}`,
      requestNumber: `REN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      issueId: issue._id,
      lineId: line._id,
      studentId: issue.studentId,
      requestedBy: userId,
      currentDueDate: currentDue.toISOString(),
      proposedDueDate: newDue.toISOString(),
      daysRequested: 15,
      reason: payload.reason,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    mockData.renewals.unshift(newRenewal);
    return newRenewal;
  },

  approveRenewal(id: string, notes = 'Approved') {
    const ren = mockData.renewals.find((r) => r._id === id);
    if (!ren) throw new Error('Renewal not found');

    ren.status = 'approved';

    const issue = mockData.issues.find((i) => i._id === ren.issueId);
    if (issue) {
      const line = issue.lines.find((l) => l._id === ren.lineId);
      if (line) {
        line.dueDate = ren.proposedDueDate;
        line.renewalCount = (line.renewalCount || 0) + 1;
      }
    }

    return ren;
  },

  rejectRenewal(id: string, notes = 'Rejected') {
    const ren = mockData.renewals.find((r) => r._id === id);
    if (!ren) throw new Error('Renewal not found');
    ren.status = 'rejected';
    return ren;
  },

  // Reports
  getDashboardSummary() {
    const totalItems = mockData.inventory.length;
    const totalAssets = mockData.inventory.reduce((acc, curr) => acc + curr.totalQuantity, 0);
    const activeIssues = mockData.issues.filter((i) => i.status === 'active' || i.status === 'partially_returned').length;
    const overdueLines = mockData.issues.filter((i) => i.status === 'overdue').length;
    const lowStockItems = mockData.inventory.filter((i) => i.availableQuantity <= i.lowStockThreshold).length;
    const pendingRenewals = mockData.renewals.filter((r) => r.status === 'pending').length;

    // Categories
    const catMap: Record<string, { count: number; totalQty: number }> = {};
    mockData.inventory.forEach((i) => {
      if (!catMap[i.category]) catMap[i.category] = { count: 0, totalQty: 0 };
      catMap[i.category].count += 1;
      catMap[i.category].totalQty += i.totalQuantity;
    });

    const categoryBreakdown = Object.entries(catMap).map(([cat, data]) => ({
      _id: cat,
      count: data.count,
      totalQty: data.totalQty,
    }));

    // Populate issues for return
    const populatedRecent = mockData.issues.slice(0, 5).map((iss) => {
      const studentObj = typeof iss.studentId === 'object' ? iss.studentId : mockData.students.find((s) => s._id === iss.studentId);
      return { ...iss, studentId: studentObj };
    });

    return {
      totalItems,
      totalAssets,
      activeIssues,
      overdueLines,
      lowStockItems,
      pendingRenewals,
      categoryBreakdown,
      conditionBreakdown: [],
      recentIssues: populatedRecent,
      overdueIssues: populatedRecent.filter((i) => i.status === 'overdue'),
    };
  },
};
