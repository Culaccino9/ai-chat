import { Router } from 'express';
import { prisma } from '../prisma';
import { auth, requireRole } from '../middleware/auth';
import { ok, parseJson } from '../utils/http';

export const adminRouter = Router();
adminRouter.use(auth(), requireRole(['SUPER_ADMIN','TENANT_ADMIN','LEARNING_ADMIN','TEAM_MANAGER']));

adminRouter.get('/dashboard', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const [scenarioCount, learnerCount, sessionCount, reportCount, latestSessions] = await Promise.all([
    prisma.scenario.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, role: 'LEARNER' } }),
    prisma.practiceSession.count({ where: { tenantId } }),
    prisma.sessionReport.count({ where: { session: { tenantId } } }),
    prisma.practiceSession.findMany({ where: { tenantId }, include: { user: true, scenario: true, report: true }, take: 10, orderBy: { createdAt: 'desc' } })
  ]);
  const avg = await prisma.sessionReport.findMany({ where: { session: { tenantId } }, select: { overallScore: true } });
  ok(res, { scenarioCount, learnerCount, sessionCount, reportCount, avgScore: avg.length ? Math.round(avg.reduce((s, r) => s + r.overallScore, 0) / avg.length) : 0, latestSessions });
});

adminRouter.get('/reports', async (req, res) => {
  const items = await prisma.sessionReport.findMany({ where: { session: { tenantId: req.user!.tenantId } }, include: { session: { include: { user: true, scenario: true } } }, orderBy: { createdAt: 'desc' } });
  ok(res, items.map(r => ({ ...r, dimensionScores: parseJson(r.dimensionScores, []), sentenceReviews: parseJson(r.sentenceReviews, []), bestScripts: parseJson(r.bestScripts, []), recommendations: parseJson(r.recommendations, []) })));
});

adminRouter.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({ where: { tenantId: req.user!.tenantId }, select: { id: true, email: true, name: true, role: true, orgUnit: true, createdAt: true } });
  ok(res, users);
});

adminRouter.get('/personas', async (req, res) => ok(res, await prisma.persona.findMany({ where: { tenantId: req.user!.tenantId }, orderBy: { createdAt: 'desc' } })));
adminRouter.get('/rubrics', async (req, res) => {
  const items = await prisma.rubric.findMany({ where: { tenantId: req.user!.tenantId }, orderBy: { createdAt: 'desc' } });
  ok(res, items.map(i => ({ ...i, dimensions: parseJson(i.dimensions, []) })));
});
