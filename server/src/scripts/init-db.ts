/*
 * データベースを作り、初期データ(組み込みの2車種と最初の管理者)を入れる。
 *   npm run db:init   … まだデータベースがないときに使う
 *   npm run db:reset  … 消して作り直す(保存したカスタムも消える)
 */
import { initDatabaseCli } from '../initDb';

if (!(await initDatabaseCli(process.argv.includes('--reset')))) process.exitCode = 1;
