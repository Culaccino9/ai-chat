import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { prisma } from '../prisma';
import { config } from '../config';
import { buildAiReply } from '../services/aiCoach';

export function setupPracticeGateway(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws/practice' });
  wss.on('connection', async (socket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || '';
    const sessionId = url.searchParams.get('sessionId') || '';
    let user: any;
    try { user = jwt.verify(token, config.jwtSecret); } catch { socket.close(4001, 'Unauthorized'); return; }
    const session = await prisma.practiceSession.findFirst({ where: { id: sessionId, tenantId: user.tenantId } });
    if (!session) { socket.close(4004, 'Session not found'); return; }
    await prisma.practiceSession.update({ where: { id: sessionId }, data: { status: 'RUNNING', startedAt: session.startedAt || new Date() } });
    socket.send(JSON.stringify({ type: 'system', content: '练习已开始，请输入你的回答。' }));
    socket.on('message', async (raw) => {
      try {
        const frame = JSON.parse(raw.toString());
        if (frame.type !== 'user_text') return;
        const count = await prisma.practiceMessage.count({ where: { sessionId } });
        await prisma.practiceMessage.create({ data: { sessionId, seq: count + 1, speaker: 'user', content: frame.content, type: 'text' } });
        const messages = await prisma.practiceMessage.findMany({ where: { sessionId }, orderBy: { seq: 'asc' } });
        const result = buildAiReply(messages.map(m => ({ speaker: m.speaker, content: m.content })));
        await prisma.practiceMessage.create({ data: { sessionId, seq: count + 2, speaker: 'ai', content: result.reply, type: 'text' } });
        socket.send(JSON.stringify({ type: 'ai_text', content: result.reply }));
        if (result.hint) socket.send(JSON.stringify({ type: 'live_hint', content: result.hint, hintType: 'quality' }));
      } catch (e) {
        socket.send(JSON.stringify({ type: 'error', content: '消息格式错误' }));
      }
    });
  });
}
