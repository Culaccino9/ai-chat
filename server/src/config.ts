import dotenv from 'dotenv';
dotenv.config();
export const config = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  adminOrigin: process.env.ADMIN_ORIGIN || 'http://localhost:5173'
};
