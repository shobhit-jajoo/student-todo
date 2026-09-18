import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;



export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  jwtSecret,
  jwtExpiresIn: '7d' as const,
  databaseUrl: process.env.DATABASE_URL,
};
