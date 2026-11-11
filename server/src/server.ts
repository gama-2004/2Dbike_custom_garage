/** サーバーを起動する(npm start / npm run dev と、配布用の garage.mjs から使う) */
import { exec } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { config } from './config';
import { createPool } from './db';

const here = path.dirname(fileURLToPath(import.meta.url));

/** 同じネットワークのほかの PC から開くときの URL */
export function lanUrls(port: number): string[] {
  return Object.values(networkInterfaces()).flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal)
    .map((a) => `http://${a!.address}:${port}/`);
}

export function startServer() {
  const db = createPool();
  const app = createApp({
    db,
    sessionSecret: config.sessionSecret,
    cookieSecure: config.cookieSecure,
    // 配布用のフォルダでは STATIC_DIR で画面の場所を指定する
    staticDir: process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : path.resolve(here, '../../web/dist'),
  });
  const onListen = () => {
    const url = `http://localhost:${config.port}/`;
    console.log(`2Dカスタムガレージのサーバーを起動しました: ${url}`);
    const lan = config.host === '127.0.0.1' ? [] : lanUrls(config.port);
    if (lan.length) console.log(`  ほかの PC からは: ${lan.join('  ')}`);
    console.log(`  データベース: ${config.db.user}@${config.db.host}:${config.db.port}/${config.db.database}`);
    console.log('  止めるときは、この画面で Ctrl+C を押す');
    if (process.env.OPEN_BROWSER === 'true' && process.platform === 'win32') exec(`start "" "${url}"`);
  };
  const server = config.host ? app.listen(config.port, config.host, onListen) : app.listen(config.port, onListen);
  server.on('error', (e: NodeJS.ErrnoException) => {
    console.error(e.code === 'EADDRINUSE' ? `ポート ${config.port} はほかのプログラムが使っています。.env の PORT を変えてください。` : e.message);
    process.exit(1);
  });
  return server;
}
