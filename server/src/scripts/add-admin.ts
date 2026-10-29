/*
 * 管理者を追加する、またはパスワードを変える(ロックも解除する)。
 *   npm run admin:add -- <ログインID> <パスワード> [氏名]
 */
import bcrypt from 'bcryptjs';
import { createPool, exec } from '../db';

const [login_id, password, name = login_id] = process.argv.slice(2);
if (!login_id || !password || password.length < 8 || password.length > 64) {
  console.error('使い方: npm run admin:add -- <ログインID> <パスワード(8〜64文字)> [氏名]');
  process.exit(1);
}
const db = createPool();
const hash = await bcrypt.hash(password, 10);
await exec(db,
  'INSERT INTO T_admins (login_id, password_hash, name) VALUES (?, ?, ?) AS n ON DUPLICATE KEY UPDATE password_hash = n.password_hash, name = n.name, fail_count = 0, locked_until = NULL',
  [login_id, hash, name]);
console.log(`管理者「${login_id}」を登録しました。`);
await db.end();
