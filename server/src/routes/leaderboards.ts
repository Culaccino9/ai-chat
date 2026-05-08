import { Router } from 'express';
import { prisma } from '../prisma';
import { auth } from '../middleware/auth';
import { ok } from '../utils/http';
export const leaderboardsRouter = Router();
leaderboardsRouter.use(auth());
leaderboardsRouter.get('/', async (req, res) => {
  const reports = await prisma.sessionReport.findMany({ where: { session: { tenantId: req.user!.tenantId } }, include: { session: { include: { user: true, scenario: true } } }, orderBy: { overallScore: 'desc' }, take: 50 });
  ok(res, reports.map((r, idx) => ({ rank: idx + 1, userId: r.session.user.id, userName: r.session.user.name, orgUnit: r.session.user.orgUnit, scenarioTitle: r.session.scenario.title, score: r.overallScore, pass: r.pass, createdAt: r.createdAt })));
});
