import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  getAllStudents, getStudentById, createStudent, updateStudent
} from './student.controller';
import { z } from 'zod';

const router = Router();

const createStudentSchema = z.object({
  enrolmentNumber: z.string().optional(),
  studentId: z.string().optional(),
  fullName: z.string().optional(),
  name: z.string().optional(),
  programme: z.string().optional(),
  department: z.string().optional(),
  semester: z.number().int().min(1).max(12).optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(4).optional(),
}).refine((d) => d.enrolmentNumber || d.studentId, {
  message: 'Enrolment number or student ID is required',
}).refine((d) => d.fullName || d.name, {
  message: 'Full name or name is required',
});

const updateStudentSchema = z.object({
  fullName: z.string().min(2).optional(),
  programme: z.string().optional(),
  semester: z.number().int().min(1).max(12).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.use(authenticate);
router.get('/', authorize('coordinator', 'admin'), getAllStudents);
router.post('/', authorize('coordinator', 'admin'), validateBody(createStudentSchema), createStudent);
router.get('/:id', getStudentById);
router.put('/:id', authorize('coordinator', 'admin'), validateBody(updateStudentSchema), updateStudent);

export default router;
