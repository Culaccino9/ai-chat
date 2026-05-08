import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { auth, requireRole } from '../middleware/auth';
import { fail, ok } from '../utils/http';

export const assignmentsRouter = Router();
assignmentsRouter.use(auth());

assignmentsRouter.get('/', async (req, res) => {
  if (req.user!.role === 'LEARNER') {
    const items = await prisma.assignmentUser.findMany({ where: { userId: req.user!.id }, include: { assignment: { include: { scenarios: { include: { scenario: true } } } } }, orderBy: { id: 'desc' } });
    return ok(res, items.map(i => ({ ...i.assignment, userStatus: i.status })));
  }
  ok(res, await prisma.assignment.findMany({ include: { users: { include: { user: true } }, scenarios: { include: { scenario: true } } }, orderBy: { createdAt: 'desc' } }));
});

const schema = z.object({ title: z.string().min(2), description: z.string().default(''), dueAt: z.string().optional().nullable(), passScore: z.number().default(70), userIds: z.array(z.string()).default([]), scenarioIds: z.array(z.string()).min(1) });
assignmentsRouter.post('/', requireRole(['SUPER_ADMIN','TENANT_ADMIN','LEARNING_ADMIN','TEAM_MANAGER']), async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_FAILED', '参数不合法', parsed.error.flatten());
  const assignment = await prisma.assignment.create({ data: { title: parsed.data.title, description: parsed.data.description, dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null, passScore: parsed.data.passScore, status: 'PUBLISHED', users: { create: parsed.data.userIds.map(userId => ({ userId })) }, scenarios: { create: parsed.data.scenarioIds.map(scenarioId => ({ scenarioId })) } }, include: { users: true, scenarios: true } });
  ok(res, assignment);
});
