import { Router } from 'express';
import { z } from 'zod';
import { ScenarioStatus } from '@prisma/client';
import { prisma } from '../prisma';
import { auth, requireRole } from '../middleware/auth';
import { fail, ok, parseJson } from '../utils/http';

export const scenariosRouter = Router();
scenariosRouter.use(auth());

scenariosRouter.get('/', async (req, res) => {
  const { status, industry, mode } = req.query;
  const where: any = { tenantId: req.user!.tenantId };
  if (status) where.status = String(status).toUpperCase();
  if (!status && req.user!.role === 'LEARNER') where.status = 'PUBLISHED';
  if (industry) where.industry = String(industry);
  const items = await prisma.scenario.findMany({ where, include: { persona: true, rubric: true }, orderBy: { createdAt: 'desc' } });
  const data = items
    .map(s => ({ ...s, modes: parseJson<string[]>(s.modes, []), languages: parseJson<string[]>(s.languages, []), knowledge: parseJson(s.knowledge, []) }))
    .filter(s => !mode || s.modes.includes(String(mode)));
  ok(res, data);
});

scenariosRouter.get('/:id', async (req, res) => {
  const s = await prisma.scenario.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId }, include: { persona: true, rubric: true } });
  if (!s) return fail(res, 404, 'SCENARIO_NOT_FOUND', '场景不存在');
  ok(res, { ...s, modes: parseJson(s.modes, []), languages: parseJson(s.languages, []), knowledge: parseJson(s.knowledge, []), rubric: s.rubric ? { ...s.rubric, dimensions: parseJson(s.rubric.dimensions, []) } : null });
});

const scenarioSchema = z.object({
  title: z.string().min(2), industry: z.string().min(1), jobFamily: z.string().min(1), description: z.string().default(''),
  difficulty: z.number().min(1).max(5).default(3), estMinutes: z.number().min(1).default(10),
  modes: z.array(z.string()).min(1), languages: z.array(z.string()).min(1), personaId: z.string().optional().nullable(), rubricId: z.string().optional().nullable(), knowledge: z.array(z.any()).optional()
});

scenariosRouter.post('/', requireRole(['SUPER_ADMIN','TENANT_ADMIN','LEARNING_ADMIN']), async (req, res) => {
  const parsed = scenarioSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_FAILED', '参数不合法', parsed.error.flatten());
  const s = await prisma.scenario.create({ data: { tenantId: req.user!.tenantId, ...parsed.data, modes: JSON.stringify(parsed.data.modes), languages: JSON.stringify(parsed.data.languages), knowledge: JSON.stringify(parsed.data.knowledge || []) } as any });
  ok(res, s);
});

scenariosRouter.patch('/:id', requireRole(['SUPER_ADMIN','TENANT_ADMIN','LEARNING_ADMIN']), async (req, res) => {
  const parsed = scenarioSchema.partial().safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_FAILED', '参数不合法', parsed.error.flatten());
  const data: any = { ...parsed.data };
  if (parsed.data.modes) data.modes = JSON.stringify(parsed.data.modes);
  if (parsed.data.languages) data.languages = JSON.stringify(parsed.data.languages);
  if (parsed.data.knowledge) data.knowledge = JSON.stringify(parsed.data.knowledge);
  const s = await prisma.scenario.update({ where: { id: req.params.id }, data });
  ok(res, s);
});

scenariosRouter.post('/:id/publish', requireRole(['SUPER_ADMIN','TENANT_ADMIN','LEARNING_ADMIN']), async (req, res) => {
  const s = await prisma.scenario.update({ where: { id: req.params.id }, data: { status: ScenarioStatus.PUBLISHED } });
  ok(res, s);
});

scenariosRouter.post('/:id/archive', requireRole(['SUPER_ADMIN','TENANT_ADMIN','LEARNING_ADMIN']), async (req, res) => {
  const s = await prisma.scenario.update({ where: { id: req.params.id }, data: { status: ScenarioStatus.ARCHIVED } });
  ok(res, s);
});
