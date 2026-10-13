import { Router, Request, Response } from 'express';
import { mockStore, mockData } from './mockStore';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export const mockRouter = Router();

// Middleware to extract auth token if present
mockRouter.use((req: any, _res: Response, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
    } catch {
      // Ignored
    }
  }
  next();
});

// ── Auth ─────────────────────────────────────────────────────────────────────
mockRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  const result = mockStore.login(email || 'coordinator@department.edu');
  res.json({ success: true, data: result });
});

mockRouter.get('/auth/me', (req: any, res: Response) => {
  const userId = req.user?.id || 'usr_coord_1';
  const user = mockData.users.find((u) => u._id === userId) || mockData.users[0];
  res.json({ success: true, data: user });
});

mockRouter.post('/auth/logout', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// ── Inventory ────────────────────────────────────────────────────────────────
mockRouter.get('/inventory', (req: Request, res: Response) => {
  const { search, category, lowStock } = req.query as any;
  const result = mockStore.getInventory({
    search,
    category,
    lowStock: lowStock === 'true',
  });
  res.json(result);
});

mockRouter.get('/inventory/:id', (req: Request, res: Response) => {
  const item = mockData.inventory.find((i) => i._id === req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
  res.json({ success: true, data: item });
});

mockRouter.post('/inventory', (req: Request, res: Response) => {
  try {
    const item = mockStore.createItem(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

mockRouter.post('/inventory/:id/stock', (req: Request, res: Response) => {
  try {
    const { quantity, reason } = req.body;
    const item = mockStore.addStock(req.params.id, Number(quantity) || 1, reason);
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Students ─────────────────────────────────────────────────────────────────
mockRouter.get('/students', (req: Request, res: Response) => {
  const { search, department } = req.query as any;
  let list = [...mockData.students];
  if (department && department !== 'all') {
    list = list.filter((s) => s.department === department);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }
  res.json({
    success: true,
    data: list,
    pagination: { page: 1, limit: 100, total: list.length, totalPages: 1 },
  });
});

mockRouter.post('/students', (req: Request, res: Response) => {
  const newStudent = {
    _id: `stu_${Date.now()}`,
    studentId: req.body.studentId,
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone || '',
    department: req.body.department,
    semester: Number(req.body.semester) || 1,
    currentBorrowedCount: 0,
    maxBorrowLimit: Number(req.body.maxBorrowLimit) || 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockData.students.unshift(newStudent);
  res.status(201).json({ success: true, data: newStudent });
});

// ── Issues ───────────────────────────────────────────────────────────────────
mockRouter.get('/issues', (_req: Request, res: Response) => {
  const populated = mockData.issues.map((iss) => {
    const studentObj =
      typeof iss.studentId === 'object'
        ? iss.studentId
        : mockData.students.find((s) => s._id === iss.studentId);
    return { ...iss, studentId: studentObj };
  });
  res.json({
    success: true,
    data: populated,
    pagination: { page: 1, limit: 100, total: populated.length, totalPages: 1 },
  });
});

mockRouter.get('/issues/my', (_req: any, res: Response) => {
  // Returns student's active and past issues
  const myIssues = mockData.issues.map((iss) => {
    const studentObj =
      typeof iss.studentId === 'object'
        ? iss.studentId
        : mockData.students.find((s) => s._id === iss.studentId);
    return { ...iss, studentId: studentObj };
  });
  res.json({ success: true, data: myIssues });
});

mockRouter.get('/issues/overdue', (_req: Request, res: Response) => {
  const overdue = mockData.issues
    .filter((i) => i.status === 'overdue')
    .map((iss) => {
      const studentObj =
        typeof iss.studentId === 'object'
          ? iss.studentId
          : mockData.students.find((s) => s._id === iss.studentId);
      return { ...iss, studentId: studentObj };
    });
  res.json({ success: true, data: overdue });
});

mockRouter.post('/issues', (req: any, res: Response) => {
  try {
    const issue = mockStore.createIssue(req.body, req.user?.id || 'usr_coord_1');
    res.status(201).json({ success: true, data: issue });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Returns ──────────────────────────────────────────────────────────────────
mockRouter.post('/returns', (req: any, res: Response) => {
  try {
    const ret = mockStore.processReturn(req.body, req.user?.id || 'usr_coord_1');
    res.status(201).json({ success: true, data: ret });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

mockRouter.get('/returns', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockData.returns,
    pagination: { page: 1, limit: 100, total: mockData.returns.length, totalPages: 1 },
  });
});

// ── Renewals ─────────────────────────────────────────────────────────────────
mockRouter.get('/renewals', (req: Request, res: Response) => {
  const { status } = req.query as any;
  let list = mockData.renewals.map((r) => {
    const studentObj =
      typeof r.studentId === 'object'
        ? r.studentId
        : mockData.students.find((s) => s._id === r.studentId);
    return { ...r, studentId: studentObj };
  });
  if (status && status !== 'all') {
    list = list.filter((r) => r.status === status);
  }
  res.json({
    success: true,
    data: list,
    pagination: { page: 1, limit: 100, total: list.length, totalPages: 1 },
  });
});

mockRouter.post('/renewals/request', (req: any, res: Response) => {
  try {
    const ren = mockStore.requestRenewal(req.body, req.user?.id || 'usr_student_1');
    res.status(201).json({ success: true, data: ren });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

mockRouter.patch('/renewals/:id/approve', (req: any, res: Response) => {
  try {
    const ren = mockStore.approveRenewal(req.params.id, req.body.reviewNotes);
    res.json({ success: true, data: ren });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

mockRouter.patch('/renewals/:id/reject', (req: any, res: Response) => {
  try {
    const ren = mockStore.rejectRenewal(req.params.id, req.body.reviewNotes);
    res.json({ success: true, data: ren });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── Reports ──────────────────────────────────────────────────────────────────
mockRouter.get('/reports/summary', (_req: Request, res: Response) => {
  res.json({ success: true, data: mockStore.getDashboardSummary() });
});

mockRouter.get('/reports/overdue', (_req: Request, res: Response) => {
  res.json({ success: true, data: mockData.issues.filter((i) => i.status === 'overdue') });
});

// ── Assets ───────────────────────────────────────────────────────────────────
mockRouter.get('/assets', (req: Request, res: Response) => {
  const { itemId, condition, status, search } = req.query as any;
  let list = mockData.assets.map((ast) => {
    const itemObj =
      typeof ast.itemId === 'object'
        ? ast.itemId
        : mockData.inventory.find((i) => i._id === ast.itemId);
    return { ...ast, itemId: itemObj };
  });

  if (itemId) {
    list = list.filter((a) => {
      const id = typeof a.itemId === 'object' ? a.itemId?._id : a.itemId;
      return id === itemId;
    });
  }
  if (condition && condition !== 'all') {
    list = list.filter((a) => a.condition === condition);
  }
  if (status && status !== 'all') {
    list = list.filter((a) => a.status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (a) =>
        a.assetTag.toLowerCase().includes(q) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(q))
    );
  }

  res.json({
    success: true,
    data: list,
    pagination: { page: 1, limit: 100, total: list.length, totalPages: 1 },
  });
});

mockRouter.patch('/assets/:id/condition', (req: Request, res: Response) => {
  const ast = mockData.assets.find((a) => a._id === req.params.id);
  if (!ast) return res.status(404).json({ success: false, message: 'Asset not found' });
  ast.condition = req.body.condition;
  if (req.body.condition === 'maintenance') ast.status = 'maintenance';
  else if (req.body.condition === 'retired') ast.status = 'retired';
  else ast.status = 'available';
  res.json({ success: true, data: ast });
});

// ── Locations, Stock, Audit, Notifications ───────────────────────────────────
mockRouter.get('/locations', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockData.locations,
    pagination: { page: 1, limit: 100, total: mockData.locations.length, totalPages: 1 },
  });
});

mockRouter.get('/stock-adjustments', (_req: Request, res: Response) => {
  const list = mockData.stockTransactions.map((tx) => {
    const itemObj =
      typeof tx.itemId === 'object'
        ? tx.itemId
        : mockData.inventory.find((i) => i._id === tx.itemId);
    return { ...tx, itemId: itemObj };
  });
  res.json({
    success: true,
    data: list,
    pagination: { page: 1, limit: 100, total: list.length, totalPages: 1 },
  });
});

mockRouter.get('/audit-logs', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: mockData.auditLogs,
    pagination: { page: 1, limit: 100, total: mockData.auditLogs.length, totalPages: 1 },
  });
});

mockRouter.get('/notifications', (_req: Request, res: Response) => {
  res.json({ success: true, data: mockData.notifications });
});

mockRouter.patch('/notifications/:id/read', (req: Request, res: Response) => {
  const notif = mockData.notifications.find((n) => n._id === req.params.id);
  if (notif) notif.isRead = true;
  res.json({ success: true, message: 'Marked as read' });
});

mockRouter.patch('/notifications/read-all', (_req: Request, res: Response) => {
  mockData.notifications.forEach((n) => (n.isRead = true));
  res.json({ success: true, message: 'All marked as read' });
});
