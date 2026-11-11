/*
 * ほかの PC に配る用のフォルダ(release/custom-garage)を作る。
 *   npm run package
 * できたフォルダは、インターネットにつながっていない PC でも動く(Node.js と MySQL 8.4 は別に用意する)。
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const out = path.join(root, 'release', 'custom-garage');

/** Windows のバッチファイルは CRLF にする(LF だと goto や call が誤動作することがある) */
const crlf = (s: string) => s.replace(/\r?\n/g, '\r\n');
const write = (name: string, text: string) => writeFileSync(path.join(out, name), crlf(text));

// 道具の場所を探す(どのバッチファイルでも同じ)
const FIND_TOOLS = String.raw`:tools
set "NODE=node"
if exist "%~dp0node\node.exe" set "NODE=%~dp0node\node.exe"
"%NODE%" --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo         Install Node.js 22 or later, or put node.exe in the "node" folder.
  exit /b 1
)
set "MYSQLD=%~dp0mysql\bin\mysqld.exe"
if not exist "%MYSQLD%" set "MYSQLD=%ProgramFiles%\MySQL\MySQL Server 8.4\bin\mysqld.exe"
if not exist "%MYSQLD%" (
  echo [ERROR] MySQL 8.4 was not found.
  echo         Extract the MySQL 8.4 ZIP into the "mysql" folder, so that mysql\bin\mysqld.exe exists.
  exit /b 1
)
set "MYSQLADMIN=%MYSQLD:mysqld.exe=mysqladmin.exe%"
set "RUN="%NODE%" --env-file-if-exists=.env app\garage.mjs"
exit /b 0
`;

// MySQL がまだ動いていなければ、最小化した別ウィンドウで動かす
const START_MYSQL = String.raw`:mysql
%RUN% ping >nul 2>&1
if not errorlevel 1 exit /b 0
start "MySQL (2D Custom Garage) - do not close" /min "%MYSQLD%" --datadir="%~dp0data" --port=3317 --bind-address=127.0.0.1 --mysqlx=OFF --console
%RUN% wait-db 60
exit /b %errorlevel%
`;

const SETUP = String.raw`@echo off
rem First-time setup: create .env, the MySQL data folder and the database.
setlocal
cd /d "%~dp0"
call :tools || goto :fail
%RUN% env || goto :fail
if not exist "%~dp0data\" (
  echo Creating the MySQL data folder...
  "%MYSQLD%" --initialize-insecure --datadir="%~dp0data" --console || goto :fail
)
call :mysql || goto :fail
%RUN% init-db || goto :fail
echo.
echo Setup finished. Double-click start.cmd to use the app.
pause
exit /b 0
:fail
echo.
echo Setup did not finish. Read the messages above.
pause
exit /b 1

${FIND_TOOLS}
${START_MYSQL}`;

const START = String.raw`@echo off
rem Start the app: MySQL in a minimized window, then the server. The browser opens automatically.
setlocal
cd /d "%~dp0"
call :tools || goto :fail
if not exist "%~dp0data\" (
  echo Run setup.cmd first.
  goto :fail
)
call :mysql || goto :fail
%RUN% serve
exit /b 0
:fail
pause
exit /b 1

${FIND_TOOLS}
${START_MYSQL}`;

const STOP = String.raw`@echo off
rem Stop MySQL (close the server window first, or press Ctrl+C there).
setlocal
cd /d "%~dp0"
call :tools || goto :fail
"%MYSQLADMIN%" -h 127.0.0.1 -P 3317 -u root shutdown
if errorlevel 1 goto :fail
echo MySQL stopped.
timeout /t 2 >nul
exit /b 0
:fail
pause
exit /b 1

${FIND_TOOLS}`;

const ADMIN = String.raw`@echo off
rem Add an administrator, or change the password: admin.cmd <login-id> <password> [name]
setlocal
cd /d "%~dp0"
call :tools || goto :fail
call :mysql || goto :fail
%RUN% admin %*
if errorlevel 1 goto :fail
exit /b 0
:fail
pause
exit /b 1

${FIND_TOOLS}
${START_MYSQL}`;

const README = `2Dカスタムガレージ(配布版)
==============================

インターネットにつながっていない PC でも動きます。
フォルダは C:\\custom-garage のように、日本語や空白を含まない場所に置いてください
(MySQL が日本語のフォルダ名を扱えないことがあるため)。


■ 用意するもの(1回だけ)

1. Node.js 22 以降
   ・インストール済みならそのまま使えます。
   ・ネットがない PC では、別の PC で https://nodejs.org/ から
     「Windows Binary (.zip)」をダウンロードしておき、
     中身(node.exe があるフォルダの中身)をこのフォルダの「node」に入れます。
     → node\\node.exe があれば OK

2. MySQL 8.4
   ・別の PC で https://dev.mysql.com/downloads/mysql/ から
     「Windows (x86, 64-bit), ZIP Archive」(8.4.x LTS)をダウンロードしておき、
     展開した中身をこのフォルダの「mysql」に入れます。
     → mysql\\bin\\mysqld.exe があれば OK
   ・MySQL 8.4 をインストール済み(C:\\Program Files\\MySQL\\MySQL Server 8.4)なら不要です。
   ・MySQL には Visual C++ 再頒布可能パッケージが必要です。入っていない PC では
     別の PC で https://aka.ms/vs/17/release/vc_redist.x64.exe をダウンロードしておき、実行します。


■ 初回の準備(1回だけ)

  setup.cmd をダブルクリック
  ・データベースを作ります。最後に表示される「管理者のパスワード」を控えてください。
  ・「Windows セキュリティの重要な警告」が出たら「プライベート ネットワーク」で「アクセスを許可する」を選びます
    (ほかの PC から開くときに必要。この PC だけで使うなら「キャンセル」でも動きます)。


■ 使うとき

  start.cmd をダブルクリック
  ・ブラウザが開きます(開かないときは http://localhost:3000/ )。
  ・管理画面は http://localhost:3000/admin
  ・黒い画面に「ほかの PC からは: http://192.168.x.x:3000/」と出ます。
    同じネットワーク(同じ Wi-Fi や LAN)のほかの PC やスマホは、その URL で開けます。
    インターネットは要りません。

  終わるとき
  ・サーバーの黒い画面で Ctrl+C を押す(または閉じる)
  ・stop.cmd をダブルクリック(最小化されている MySQL を止める)


■ そのほか

  admin.cmd <ログインID> <パスワード> [氏名]
    管理者を追加する、パスワードを変える(ロックも解除する)。コマンドプロンプトで実行します。

  設定は .env(メモ帳で開ける)
    PORT=3000      … 画面の番号。ほかのソフトと重なるときに変える
    HOST=127.0.0.1 … こう書くと、この PC からしか開けなくなる

  データは data フォルダにあります。別の PC に移すときは、stop.cmd で止めてから
  フォルダごとコピーします。
`;

rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, 'app'), { recursive: true });

console.log('画面をビルドしています…');
execSync('npm run build', { cwd: path.join(root, 'web'), stdio: 'inherit' });
cpSync(path.join(root, 'web', 'dist'), path.join(out, 'web'), { recursive: true });

console.log('サーバーを1つのファイルにまとめています…');
await build({
  entryPoints: [path.join(root, 'server', 'src', 'cli.ts')],
  outfile: path.join(out, 'app', 'garage.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  minify: false,
  legalComments: 'eof',
  // express などの CommonJS のパッケージが require を使えるようにする
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'warning',
});
cpSync(path.join(root, 'docs', 'sql', 'schema.sql'), path.join(out, 'app', 'schema.sql'));

for (const d of ['node', 'mysql']) mkdirSync(path.join(out, d));
write('node/ここにNode.jsのZIPの中身を入れる.txt', 'node.exe がこのフォルダの直下に来るようにする(Node.js をインストール済みなら不要)。\n');
write('mysql/ここにMySQLのZIPの中身を入れる.txt', 'mysql\\bin\\mysqld.exe となるようにする(MySQL 8.4 をインストール済みなら不要)。\n');
write('setup.cmd', SETUP);
write('start.cmd', START);
write('stop.cmd', STOP);
write('admin.cmd', ADMIN);
write('はじめにお読みください.txt', README);

if (!existsSync(path.join(out, 'app', 'garage.mjs'))) throw new Error('garage.mjs ができませんでした');
console.log(`できました: ${out}`);
console.log('このフォルダを ZIP にして(右クリック →「圧縮先」→「ZIP ファイル」)、ほかの PC に渡します。');
