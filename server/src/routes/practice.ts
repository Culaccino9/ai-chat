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
  if (!parsed.success) return fail(res, 422, 'VALIDATION_FAILED', 'Invalid parameters', parsed.error.flatten());
  const authUser = req.user!;
  const scenario = await prisma.scenario.findFirst({ where: { id: parsed.data.scenarioId, tenantId: authUser.tenantId }, include: { persona: true, rubric: true } });
  if (!scenario) return fail(res, 404, 'SCENARIO_NOT_FOUND', 'Scenario not found');
  const session = await prisma.practiceSession.create({ data: { tenantId: authUser.tenantId, userId: authUser.id, scenarioId: scenario.id, mode: parsed.data.mode, language: parsed.data.language, status: SessionStatus.CREATED } });
  ok(res, { sessionId: session.id, wsUrl: `/ws/practice?sessionId=${session.id}`, persona: scenario.persona, timers: { maxDurationSec: scenario.estMinutes * 60, idleTimeoutSec: 45 } });
});

practiceRouter.get('/:id', async (req, res) => {
  const authUser = req.user!;
  const session = await prisma.practiceSession.findFirst({ where: { id: req.params.id, tenantId: authUser.tenantId }, include: { scenario: { include: { persona: true, rubric: true } }, messages: { orderBy: { seq: 'asc' } }, report: true } });
  if (!session) return fail(res, 404, 'SESSION_NOT_FOUND', 'Session not found');
  ok(res, session);
});

practiceRouter.post('/:id/finish', async (req, res) => {
  const authUser = req.user!;
  const session = await prisma.practiceSession.findFirst({ where: { id: req.params.id, tenantId: authUser.tenantId }, include: { scenario: { include: { persona: true, rubric: true } }, messages: { orderBy: { seq: 'asc' } } } });
  if (!session) return fail(res, 404, 'SESSION_NOT_FOUND', 'Session not found');
  const report = await evaluateSession(session.messages.map(m => ({ speaker: m.speaker, content: m.content })), session.scenario.rubric?.dimensions, session.scenario.rubric?.passScore || 70, { scenarioTitle: session.scenario.title, personaName: session.scenario.persona?.name, personaDescription: session.scenario.persona?.prompt || session.scenario.persona?.goal || undefined, rubricDimensionsJson: session.scenario.rubric?.dimensions });
  const saved = await prisma.sessionReport.upsert({ where: { sessionId: session.id }, create: { sessionId: session.id, overallScore: report.overallScore, pass: report.pass, dimensionScores: JSON.stringify(report.dimensionScores), sentenceReviews: JSON.stringify(report.sentenceReviews), bestScripts: JSON.stringify(report.bestScripts), recommendations: JSON.stringify(report.recommendations), summary: report.summary }, update: { overallScore: report.overallScore, pass: report.pass, dimensionScores: JSON.stringify(report.dimensionScores), sentenceReviews: JSON.stringify(report.sentenceReviews), bestScripts: JSON.stringify(report.bestScripts), recommendations: JSON.stringify(report.recommendations), summary: report.summary } });
  await prisma.practiceSession.update({ where: { id: session.id }, data: { status: SessionStatus.COMPLETED, finishedAt: new Date() } });
  ok(res, { ...saved, ...report });
});

practiceRouter.get('/:id/report', async (req, res) => {
  const authUser = req.user!;
  const report = await prisma.sessionReport.findFirst({ where: { session: { id: req.params.id, tenantId: authUser.tenantId } }, include: { session: { include: { scenario: true, user: true } } } });
  if (!report) return fail(res, 404, 'REPORT_NOT_FOUND', 'Report is not ready');
  ok(res, { ...report, dimensionScores: parseJson(report.dimensionScores, []), sentenceReviews: parseJson(report.sentenceReviews, []), bestScripts: parseJson(report.bestScripts, []), recommendations: parseJson(report.recommendations, []) });
});

practiceRouter.get('/', async (req, res) => {
  const authUser = req.user!;
  const where: any = { tenantId: authUser.tenantId };
  if (authUser.role === 'LEARNER') where.userId = authUser.id;
  const items = await prisma.practiceSession.findMany({ where, include: { user: true, scenario: true, report: true }, orderBy: { createdAt: 'desc' } });
  ok(res, items);
});
