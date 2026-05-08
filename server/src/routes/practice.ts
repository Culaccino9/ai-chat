import { Router } from 'express';
import { PracticeMode, SessionStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma';
import { auth } from '../middleware/auth';
import { fail, ok, parseJson } from '../utils/http';
import { evaluateSession } from '../services/aiCoach';

export const practiceRouter = Router();
practiceRouter.use(auth());

const createSchema = z.object({ scenarioId: z.string(), mode: z.nativeEnum(PracticeMode).default('FREE_DIALOGUE'), language: z.string().default('zh-CN') });

practiceRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_FAILED', '参数不合法', parsed.error.flatten());
  const scenario = await prisma.scenario.findFirst({ where: { id: parsed.data.scenarioId, tenantId: req.user!.tenantId }, include: { persona: true, rubric: true } });
  if (!scenario) return fail(res, 404, 'SCENARIO_NOT_FOUND', '场景不存在');
  const session = await prisma.practiceSession.create({ data: { tenantId: req.user!.tenantId, userId: req.user!.id, scenarioId: scenario.id, mode: parsed.data.mode, language: parsed.data.language, status: SessionStatus.CREATED } });
  ok(res, { sessionId: session.id, wsUrl: `/ws/practice?sessionId=${session.id}`, persona: scenario.persona, timers: { maxDurationSec: scenario.estMinutes * 60, idleTimeoutSec: 45 } });
});

practiceRouter.get('/:id', async (req, res) => {
  const session = await prisma.practiceSession.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId }, include: { scenario: { include: { persona: true, rubric: true } }, messages: { orderBy: { seq: 'asc' } }, report: true } });
  if (!session) return fail(res, 404, 'SESSION_NOT_FOUND', '会话不存在');
  ok(res, session);
});

practiceRouter.post('/:id/finish', async (req, res) => {
  const session = await prisma.practiceSession.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId }, include: { scenario: { include: { rubric: true } }, messages: { orderBy: { seq: 'asc' } } } });
  if (!session) return fail(res, 404, 'SESSION_NOT_FOUND', '会话不存在');
  const report = evaluateSession(session.messages.map(m => ({ speaker: m.speaker, content: m.content })), session.scenario.rubric?.dimensions, session.scenario.rubric?.passScore || 70);
  const saved = await prisma.sessionReport.upsert({
    where: { sessionId: session.id },
    create: { sessionId: session.id, overallScore: report.overallScore, pass: report.pass, dimensionScores: JSON.stringify(report.dimensionScores), sentenceReviews: JSON.stringify(report.sentenceReviews), bestScripts: JSON.stringify(report.bestScripts), recommendations: JSON.stringify(report.recommendations), summary: report.summary },
    update: { overallScore: report.overallScore, pass: report.pass, dimensionScores: JSON.stringify(report.dimensionScores), sentenceReviews: JSON.stringify(report.sentenceReviews), bestScripts: JSON.stringify(report.bestScripts), recommendations: JSON.stringify(report.recommendations), summary: report.summary }
  });
  await prisma.practiceSession.update({ where: { id: session.id }, data: { status: SessionStatus.COMPLETED, finishedAt: new Date() } });
  ok(res, { ...saved, ...report });
});

practiceRouter.get('/:id/report', async (req, res) => {
  const report = await prisma.sessionReport.findFirst({ where: { session: { id: req.params.id, tenantId: req.user!.tenantId } }, include: { session: { include: { scenario: true, user: true } } } });
  if (!report) return fail(res, 404, 'REPORT_NOT_FOUND', '报告还未生成');
  ok(res, { ...report, dimensionScores: parseJson(report.dimensionScores, []), sentenceReviews: parseJson(report.sentenceReviews, []), bestScripts: parseJson(report.bestScripts, []), recommendations: parseJson(report.recommendations, []) });
});

practiceRouter.get('/', async (req, res) => {
  const where: any = { tenantId: req.user!.tenantId };
  if (req.user!.role === 'LEARNER') where.userId = req.user!.id;
  const items = await prisma.practiceSession.findMany({ where, include: { user: true, scenario: true, report: true }, orderBy: { createdAt: 'desc' } });
  ok(res, items);
});
