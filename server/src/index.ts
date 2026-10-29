import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { config } from './config';
import { createPool } from './db';

const here = path.dirname(fileURLToPath(import.meta.url));
const db = createPool();
const app = createApp({
  db,
  sessionSecret: config.sessionSecret,
  cookieSecure: config.cookieSecure,
  staticDir: path.resolve(here, '../../web/dist'),
});

app.listen(config.port, () => {
  console.log(`2Dカスタムガレージのサーバーを起動しました: http://localhost:${config.port}`);
  console.log(`  データベース: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`);
});
