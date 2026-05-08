import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma';
import { config } from '../config';
import { auth } from '../middleware/auth';
import { fail, ok } from '../utils/http';

export const authRouter = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_FAILED', '参数不合法', parsed.error.flatten());
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, include: { tenant: true } });
  if (!user) return fail(res, 401, 'AUTH_FAILED', '账号或密码错误');
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return fail(res, 401, 'AUTH_FAILED', '账号或密码错误');
  const payload = { id: user.id, tenantId: user.tenantId, email: user.email, name: user.name, role: user.role };
  const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });
  return ok(res, { accessToken, user: payload, tenant: user.tenant });
});

authRouter.get('/me', auth(), async (req, res) => {
  return ok(res, { user: req.user });
});
