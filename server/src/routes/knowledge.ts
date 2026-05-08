import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { auth, requireRole } from '../middleware/auth';
import { fail, ok, parseJson } from '../utils/http';

export const knowledgeRouter = Router();
knowledgeRouter.use(auth());

const managerRoles = ['SUPER_ADMIN', 'TENANT_ADMIN', 'LEARNING_ADMIN'] as const;

function serializeCard(card: any) {
  return { ...card, tags: parseJson<string[]>(card.tags, []) };
}

const cardSchema = z.object({
  title: z.string().min(1),
  summary: z.string().default(''),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  status: z.string().default('PUBLISHED'),
  sortOrder: z.number().int().default(0)
});

knowledgeRouter.get('/', async (req, res) => {
  const where: any = { tenantId: req.user!.tenantId };
  if (req.user!.role === 'LEARNER') where.status = 'PUBLISHED';
  const items = await prisma.knowledgeCard.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
  ok(res, items.map(serializeCard));
});

knowledgeRouter.get('/:id', async (req, res) => {
  const id = String(req.params.id);
  const where: any = { id, tenantId: req.user!.tenantId };
  if (req.user!.role === 'LEARNER') where.status = 'PUBLISHED';
  const item = await prisma.knowledgeCard.findFirst({ where });
  if (!item) return fail(res, 404, 'KNOWLEDGE_NOT_FOUND', '知识卡片不存在');
  ok(res, serializeCard(item));
});

knowledgeRouter.post('/', requireRole([...managerRoles]), async (req, res) => {
  const parsed = cardSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_FAILED', '参数不合法', parsed.error.flatten());
  const item = await prisma.knowledgeCard.create({
    data: { ...parsed.data, tenantId: req.user!.tenantId, tags: JSON.stringify(parsed.data.tags) }
  });
  ok(res, serializeCard(item));
});

knowledgeRouter.patch('/:id', requireRole([...managerRoles]), async (req, res) => {
  const id = String(req.params.id);
  const parsed = cardSchema.partial().safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_FAILED', '参数不合法', parsed.error.flatten());
  const existing = await prisma.knowledgeCard.findFirst({ where: { id, tenantId: req.user!.tenantId } });
  if (!existing) return fail(res, 404, 'KNOWLEDGE_NOT_FOUND', '知识卡片不存在');
  const data: any = { ...parsed.data };
  if (parsed.data.tags) data.tags = JSON.stringify(parsed.data.tags);
  const item = await prisma.knowledgeCard.update({ where: { id }, data });
  ok(res, serializeCard(item));
});

knowledgeRouter.delete('/:id', requireRole([...managerRoles]), async (req, res) => {
  const id = String(req.params.id);
  const existing = await prisma.knowledgeCard.findFirst({ where: { id, tenantId: req.user!.tenantId } });
  if (!existing) return fail(res, 404, 'KNOWLEDGE_NOT_FOUND', '知识卡片不存在');
  await prisma.knowledgeCard.delete({ where: { id } });
  ok(res, { deleted: true });
});
