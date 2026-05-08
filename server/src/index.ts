import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { requestId } from './middleware/requestId';
import { authRouter } from './routes/auth';
import { bootstrapRouter } from './routes/bootstrap';
import { scenariosRouter } from './routes/scenarios';
import { practiceRouter } from './routes/practice';
import { adminRouter } from './routes/admin';
import { assignmentsRouter } from './routes/assignments';
import { leaderboardsRouter } from './routes/leaderboards';
import { setupPracticeGateway } from './ws/practiceGateway';

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(requestId);
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/bootstrap', bootstrapRouter);
app.use('/api/v1/scenarios', scenariosRouter);
app.use('/api/v1/practice-sessions', practiceRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/assignments', assignmentsRouter);
app.use('/api/v1/leaderboards', leaderboardsRouter);

const server = http.createServer(app);
setupPracticeGateway(server);
server.listen(config.port, () => console.log(`AI Coach server listening on http://localhost:${config.port}`));
