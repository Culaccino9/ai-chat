import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  adminOrigin: process.env.ADMIN_ORIGIN || 'http://localhost:5173',
  minimax: {
    apiKey: process.env.MINIMAX_API_KEY || '',
    // 默认按 OpenAI 兼容 Chat Completions 形式调用；如你的 MiniMax 控制台给出的地址不同，直接改环境变量即可。
    baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1/chat/completions',
    model: process.env.MINIMAX_MODEL || 'MiniMax-Text-01',
    enabled: process.env.MINIMAX_ENABLED !== 'false',
    timeoutMs: Number(process.env.MINIMAX_TIMEOUT_MS || 30000)
  }
};
