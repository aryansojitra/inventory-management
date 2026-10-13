import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import {
  getAllStudents, getStudentById, createStudent, updateStudent
} from './student.controller';
import { z } from 'zod';

const router = Router();

const createStudentSchema = z.object({
  enrolmentNumber: z.string().min(1),
  fullName: z.string().min(2),
  programme: z.string().min(1),
  semester: z.number().int().min(1).max(12),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(6),
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
