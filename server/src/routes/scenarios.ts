import { Router } from 'express';
import { z } from 'zod';
import { ScenarioStatus } from '@prisma/client';
import { prisma } from '../prisma';
import { auth, requireRole } from '../middleware/auth';
import { fail, ok, parseJson } from '../utils/http';

export const scenariosRouter = Router();
scenariosRouter.use(auth());

const managerRoles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'LEARNING_ADMIN'] as const;

function serializeScenario(s: any) {
  return {
    ...s,
    modes: parseJson<string[]>(s.modes, []),
    languages: parseJson<string[]>(s.languages, []),
    knowledge: parseJson(s.knowledge, []),
    categories: s.categories?.map((c: any) => ({ ...c, scripts: parseJson(c.scripts, []) })) || undefined,
    rubric: s.rubric ? { ...s.rubric, dimensions: parseJson(s.rubric.dimensions, []) } : s.rubric
  };
}

function serializeCategory(item: any) {
  return { ...item, scripts: parseJson(item.scripts, []) };
}

scenariosRouter.get('/', async (req, res) => {
  const { status, industry, mode } = req.query;
  const where: any = { tenantId: req.user!.tenantId };
  if (status) where.status = String(status).toUpperCase();
  if (!status && req.user!.role === 'LEARNER') where.status = 'PUBLISHED';
  if (industry) where.industry = String(industry);

  const items = await prisma.scenario.findMany({
    where,
    include: {
      persona: true,
      rubric: true,
      categories: {
        where: req.user!.role === 'LEARNER' ? { status: 'PUBLISHED' } : {},
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const data = items.map(serializeScenario).filter(s => !mode || s.modes.includes(String(mode)));
  ok(res, data);
});

scenariosRouter.get('/:id', async (req, res) => {
  const s = await prisma.scenario.findFirst({
    where: { id: req.params.id, tenantId: req.user!.tenantId },
    include: {
      persona: true,
      rubric: true,
      categories: {
        where: req.user!.role === 'LEARNER' ? { status: 'PUBLISHED' } : {},
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      }
    }
  });
  if (!s) return fail(res, 404, 'SCENARIO_NOT_FOUND', '场景不存在');
  ok(res, serializeScenario(s));
});

const scenarioSchema = z.object({
  title: z.string().min(2),
  industry: z.string().min(1),
  jobFamily: z.string().min(1),
  description: z.string().default(''),
  difficulty: z.number().min(1).max(5).default(3),
  estMinutes: z.number().min(1).default(10),
  modes: z.array(z.string()).min(1),
  languages: z.array(z.string()).min(1),
  personaId: z.string().optional().nullable(),
  rubricId: z.string().optional().nullable(),
  status: z.nativeEnum(ScenarioStatus).optional(),
  knowledge: z.array(z.any()).optional()
});

scenariosRouter.post('/', requireRole([...managerRoles]), async (req, res) => {
  const parsed = scenarioSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_FAILED', '参数不合法', parsed.error.flatten());
  const s = await prisma.scenario.create({
    data: {
      tenantId: req.user!.tenantId,
      ...parsed.data,
      modes: JSON.stringify(parsed.data.modes),
      languages: JSON.stringify(parsed.data.languages),
      knowledge: JSON.stringify(parsed.data.knowledge || [])
    } as any
  });
  ok(res, serializeScenario(s));
});

scenariosRouter.patch('/:id', requireRole([...managerRoles]), async (req, res) => {
  const id = String(req.params.id);
  const parsed = scenarioSchema.partial().safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_FAILED', '参数不合法', parsed.error.flatten());
  const data: any = { ...parsed.data };
  if (parsed.data.modes) data.modes = JSON.stringify(parsed.data.modes);
  if (parsed.data.languages) data.languages = JSON.stringify(parsed.data.languages);
  if (parsed.data.knowledge) data.knowledge = JSON.stringify(parsed.data.knowledge);
  const s = await prisma.scenario.update({ where: { id, tenantId: req.user!.tenantId }, data });
  ok(res, serializeScenario(s));
});

scenariosRouter.post('/:id/publish', requireRole([...managerRoles]), async (req, res) => {
  const id = String(req.params.id);
  const s = await prisma.scenario.update({ where: { id, tenantId: req.user!.tenantId }, data: { status: ScenarioStatus.PUBLISHED } });
  ok(res, serializeScenario(s));
});

scenariosRouter.post('/:id/archive', requireRole([...managerRoles]), async (req, res) => {
  const id = String(req.params.id);
  const s = await prisma.scenario.update({ where: { id, tenantId: req.user!.tenantId }, data: { status: ScenarioStatus.ARCHIVED } });
  ok(res, serializeScenario(s));
});

scenariosRouter.delete('/:id', requireRole([...managerRoles]), async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.scenario.findFirst({
    where: { id, tenantId: req.user!.tenantId }
  });
  if (!existing) return fail(res, 404, 'SCENARIO_NOT_FOUND', '场景不存在');
  const sessionCount = await prisma.practiceSession.count({ where: { scenarioId: id } });
  if (sessionCount > 0) return fail(res, 409, 'SCENARIO_IN_USE', '该场景已有练习记录，不能删除，请改为归档');
  await prisma.scenario.delete({ where: { id } });
  ok(res, { deleted: true });
});

const categorySchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  prompt: z.string().default(''),
  sortOrder: z.number().int().default(0),
  status: z.string().default('PUBLISHED'),
  scripts: z.array(z.object({
    title: z.string().default(''),
    tips: z.string().default(''),
    script: z.string().default('')
  })).default([])
});

scenariosRouter.get('/:scenarioId/categories', async (req, res) => {
  const where: any = { tenantId: req.user!.tenantId, scenarioId: req.params.scenarioId };
  if (req.user!.role === 'LEARNER') where.status = 'PUBLISHED';
  const items = await prisma.practiceCategory.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  ok(res, items.map(serializeCategory));
});

scenariosRouter.post('/:scenarioId/categories', requireRole([...managerRoles]), async (req, res) => {
  const scenarioId = String(req.params.scenarioId);
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_FAILED', '参数不合法', parsed.error.flatten());
  const scenario = await prisma.scenario.findFirst({ where: { id: scenarioId, tenantId: req.user!.tenantId } });
  if (!scenario) return fail(res, 404, 'SCENARIO_NOT_FOUND', '场景不存在');
  const item = await prisma.practiceCategory.create({
    data: { ...parsed.data, scenarioId, tenantId: req.user!.tenantId, scripts: JSON.stringify(parsed.data.scripts) }
  });
  ok(res, serializeCategory(item));
});

scenariosRouter.patch('/categories/:id', requireRole([...managerRoles]), async (req, res) => {
  const id = String(req.params.id);
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_FAILED', '参数不合法', parsed.error.flatten());
  const existing = await prisma.practiceCategory.findFirst({ where: { id, tenantId: req.user!.tenantId } });
  if (!existing) return fail(res, 404, 'CATEGORY_NOT_FOUND', '练习类目不存在');
  const data: any = { ...parsed.data };
  if (parsed.data.scripts) data.scripts = JSON.stringify(parsed.data.scripts);
  const item = await prisma.practiceCategory.update({ where: { id }, data });
  ok(res, serializeCategory(item));
});

scenariosRouter.delete('/categories/:id', requireRole([...managerRoles]), async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.practiceCategory.findFirst({
    where: { id, tenantId: req.user!.tenantId }
  });
  if (!existing) return fail(res, 404, 'CATEGORY_NOT_FOUND', '练习类目不存在');
  const sessionCount = await prisma.practiceSession.count({ where: { categoryId: id } });
  if (sessionCount > 0) return fail(res, 409, 'CATEGORY_IN_USE', '该类目已有练习记录，不能删除，请改为停用');
  await prisma.practiceCategory.delete({ where: { id } });
  ok(res, { deleted: true });
});
