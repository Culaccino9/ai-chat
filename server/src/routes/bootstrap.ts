import { Router } from 'express';
import { ok } from '../utils/http';
export const bootstrapRouter = Router();
bootstrapRouter.get('/', (_req, res) => ok(res, {
  appName: 'AI Coach Suite',
  supportedModes: ['FREE_DIALOGUE', 'FIXED_DIALOGUE', 'PPT_SPEECH', 'PRODUCT_3D', 'SCRIPT_RECITAL'],
  supportedLanguages: ['zh-CN', 'en-US'],
  featureFlags: { voice: false, realtimeText: true, managerLite: true, antiCheat: true }
}));
