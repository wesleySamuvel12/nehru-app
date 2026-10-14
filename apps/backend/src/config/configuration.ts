export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/school_erp?schema=public',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-token-key-2026',
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  },
  cors: {
    origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'],
  },
});
