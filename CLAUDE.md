# 2Dカスタムガレージ(卒業研究 R4S1 ARMY)

バイクを真横から見た2Dの図で、パーツや塗装を組み替えて見た目を確かめる Web アプリ。
チーム: 上釜 永遠(リーダー)、江副 史穏、和合 由紀。

## 進め方

- 説明や返答は日本語で、プログラミング初心者にもわかる言葉で書く。コマンドは Windows(コマンドプロンプト / PowerShell)向けに示す。
- 作業ブランチは `claude/epic-ramanujan-vvml8a`(`main` は古い)。コミットやプッシュは頼まれたときだけ。`--amend` や force push はしない。
- 実在メーカーの車名・ロゴ・デザインは使わない(ジャンルを参考にしたオリジナルデザイン)。写真を参考にパーツを作るときも同じ。

## 構成

| フォルダ | 中身 |
| --- | --- |
| `web/` | 画面(React 19 + TypeScript + Vite + Zustand)。`npm run dev` で http://localhost:5173/ |
| `server/` | API サーバー(Express 5 + mysql2)。`npm run dev` で http://localhost:3000/ 。Vite は `/api` をここへ中継する |
| `docs/` | ガントチャート、基本設計書(docx)、`sql/schema.sql`、紹介CM |
| `uml/` | ユースケース記述(`usecases.md`)、クラス図・シーケンス図(svg / png) |
| `app/index.html` | 最初のプロトタイプ(1ファイル版)。どこからも使っていない |

- 車両・パーツの定義(JSON)は画面とサーバーで共通: `web/src/catalog/definition.ts`。サーバーは `../../web/src/...` を直接 import する。
- 組み込み車両は V001 スーパースポーツ / V002 アメリカン(描画プログラムは `web/src/render/`)。管理画面で足したパーツは SVG を重ねて描く。座標は 800×440。
- サーバーにつながらないときは、組み込みの2車種とブラウザ保存(localStorage)で動く。
- 管理画面は `/admin`(ログイン → ベース車両追加 / パーツ追加)。見本の定義ファイルは `web/public/samples/`。
- npm は `.npmrc` で `legacy-peer-deps=true`。依存は版を固定して入れる。

## この PC での起動(開発用)

MySQL 8.4 はサービスとして入っていないので、ZIP 版と同じ方法で 3307 番で動かす(3306 番は学校の MariaDB)。

1. `server` で `.\mysql-local.cmd`(データは `C:\Users\st20234154\mysql84\data`。ウィンドウは開いたまま)
2. `server` で `npm run dev`
3. `web` で `npm run dev` → http://localhost:5173/ 、管理画面は http://localhost:5173/admin

- 管理者のパスワード変更: `server` で `npm run admin:add -- <ID> <パスワード>`
- `ibdata1 must be writable` が出たら、同じデータの MySQL がすでに動いている(`netstat -ano | findstr :3307` で確認)。

## テストと配布版

- テスト: `web` で `npx vitest run`、`server` で `npm test`(MySQL が必要。`<DB_NAME>_test` を作り直して使う)。型チェックは両方で `npx tsc --noEmit`。
- 配布版: `server` で `npm run package` → `release/custom-garage`(git 管理外)。Node.js と MySQL 8.4 を同梱すればネットなしで動く。MySQL は 3317 番。
- 配布版は `C:\Users\st20234154\Documents\2Dbike custom\custom-garage` にも置いてある(古い可能性あり)。
