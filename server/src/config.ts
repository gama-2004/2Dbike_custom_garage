/** 環境変数(.env)から設定を読む */
export const config = {
  port: Number(process.env.PORT ?? 3000),
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'garage',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'custom_garage',
  },
  sessionSecret: process.env.SESSION_SECRET ?? '',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
};
