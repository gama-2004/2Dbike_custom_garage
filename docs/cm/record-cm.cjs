// 2Dカスタムガレージ 紹介CM(約37秒、音なし)を録画する。
// 使い方: web で npm run build → npx vite preview --port 4173 を動かしたまま、node docs/cm/record-cm.cjs <出力フォルダ>
// できた .webm を ffmpeg で mp4 にする(docs/cm/README.md)
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2];
const APP = 'http://localhost:4173/';
const W = 1280, H = 720;

const FONT = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Zen+Kaku+Gothic+New:wght@500;700&display=swap">`;
const CARD_CSS = `
*{margin:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;background:#0f1a30;color:#fff;font-family:'Zen Kaku Gothic New','IPAGothic',sans-serif;
 display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px}
.l{opacity:0;transform:translateY(18px);animation:in .7s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes in{to{opacity:1;transform:none}}
.big{font-family:'Dela Gothic One','IPAGothic',sans-serif;font-size:58px;letter-spacing:.04em}
.mid{font-size:30px;font-weight:700;color:#c9d6f2}
.sm{font-size:20px;color:#9fb0d0;letter-spacing:.2em}
.bar{width:0;height:4px;background:#2457d6;animation:bar 1s .9s ease forwards}
@keyframes bar{to{width:420px}}
`;

// 字幕と、クリックの場所を見せるカーソル
async function overlay(p) {
  await p.evaluate(() => {
    if (document.getElementById('cm-cap')) return;
    const st = document.createElement('style');
    st.textContent = `
#cm-cap{position:fixed;left:50%;bottom:34px;transform:translateX(-50%);z-index:9999;pointer-events:none;
 background:rgba(15,26,48,.88);color:#fff;font:700 30px 'Zen Kaku Gothic New','IPAGothic',sans-serif;padding:14px 30px;border-radius:14px;
 letter-spacing:.03em;white-space:nowrap;opacity:0;transition:opacity .35s, transform .35s;box-shadow:0 10px 30px rgba(0,0,0,.25)}
#cm-cap.on{opacity:1}
#cm-cap b{color:#8fb0ff}
#cm-cur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:10000;pointer-events:none;transition:transform .55s cubic-bezier(.3,.7,.2,1)}
#cm-cur::after{content:'';position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;background:rgba(36,87,214,.35);transform:scale(0);opacity:0}
#cm-cur.tap::after{animation:tap .45s ease}
@keyframes tap{0%{transform:scale(.3);opacity:1}100%{transform:scale(1.6);opacity:0}}`;
    document.head.appendChild(st);
    const c = document.createElement('div'); c.id = 'cm-cap'; document.body.appendChild(c);
    const k = document.createElement('div'); k.id = 'cm-cur';
    k.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.4 L17.5 13.4 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    k.style.transform = 'translate(640px,420px)';
    document.body.appendChild(k);
  });
}
async function cap(p, html) {
  await p.evaluate((h) => {
    const c = document.getElementById('cm-cap');
    c.classList.remove('on');
    setTimeout(() => { c.innerHTML = h; c.classList.add('on'); }, h ? 180 : 0);
  }, html);
}
async function moveTo(p, loc) {
  const b = await loc.boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await p.evaluate(([x, y]) => { document.getElementById('cm-cur').style.transform = `translate(${x}px,${y}px)`; }, [x, y]);
  await p.waitForTimeout(600);
}
async function click(p, loc, wait = 700) {
  await loc.scrollIntoViewIfNeeded();
  await moveTo(p, loc);
  await p.evaluate(() => { const k = document.getElementById('cm-cur'); k.classList.remove('tap'); void k.offsetWidth; k.classList.add('tap'); });
  await loc.click();
  await p.waitForTimeout(wait);
}

async function openCat(p, name, wait = 400) {
  const h = p.locator('.cat-head', { hasText: name });
  if ((await h.getAttribute('aria-expanded')) !== 'true') await click(p, h, wait);
  else { await moveTo(p, h); await p.waitForTimeout(wait); }
}

(async () => {
  const b = await chromium.launch();
  // 下準備(保存一覧を空に、スーパースポーツを選んだ状態にする)は録画しない
  const prep = await b.newContext({ viewport: { width: W, height: H } });
  const pp = await prep.newPage();
  await pp.goto(APP);
  const state = await prep.storageState();
  await prep.close();

  const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: OUT, size: { width: W, height: H } }, storageState: state });
  const p = await ctx.newPage();
  const t0 = Date.now();

  // 1. オープニング
  await p.setContent(`${FONT}<style>${CARD_CSS}</style>
    <div class="sm l" style="animation-delay:.1s">BIKE CUSTOMIZER</div>
    <div class="big l" style="animation-delay:.35s">そのカスタム、</div>
    <div class="big l" style="animation-delay:.9s">買う前に見てみよう。</div>
    <div class="bar"></div>`);
  await p.waitForTimeout(3200);

  // 2. 車種を選ぶ
  await p.goto(APP + '#select');
  await p.waitForSelector('.vehicle-big');
  await overlay(p);
  await p.waitForTimeout(300);
  await cap(p, 'まずは、<b>ベース車両</b>を選んで');
  await p.waitForTimeout(900);
  await click(p, p.locator('.vehicle-big', { hasText: 'スーパースポーツ' }), 1100);
  await overlay(p);

  // 3. パーツを組み替える
  await cap(p, 'パーツも色も、<b>クリックひとつ</b>で');
  await openCat(p, 'マフラー', 400);
  await click(p, p.locator('.part-card', { hasText: 'センターアップ' }), 700);
  await openCat(p, 'ホイール', 400);
  await click(p, p.locator('.part-card', { hasText: '鍛造7本' }), 700);
  await openCat(p, '塗装', 500);
  const sw = p.locator('#sec-paint .swatches').first().locator('button');
  await click(p, sw.nth(2), 500);
  await click(p, sw.nth(4), 600);
  await cap(p, '合計金額や重さも、<b>その場で計算</b>');
  await moveTo(p, p.locator('.total').first());
  await p.waitForTimeout(1500);

  // 4. 組み合わせ制約
  await cap(p, '付けられない組み合わせは、<b>自動でお知らせ</b>');
  await openCat(p, 'カウル', 400);
  await click(p, p.locator('.part-card', { hasText: 'ネイキッド化' }), 600);
  await openCat(p, 'スクリーン', 1600);

  // 5. 比較
  await cap(p, 'ノーマルと並べて、<b>違いがひと目で</b>');
  await click(p, p.getByRole('button', { name: '比較する' }), 1300);
  await overlay(p);
  await click(p, p.getByRole('button', { name: '重ねる' }), 600);
  const slider = p.locator('input[type=range]').first();
  if (await slider.count()) {
    await moveTo(p, slider);
    for (const v of [80, 65, 50, 35, 20, 35, 50]) {
      await slider.fill(String(v));
      await p.waitForTimeout(140);
    }
  }
  await p.waitForTimeout(600);

  // 6. 保存
  await p.goto(APP + '#custom');
  await overlay(p);
  await cap(p, 'お気に入りは<b>保存</b>して、いつでも呼び出し');
  await p.getByLabel('保存名').scrollIntoViewIfNeeded();
  await moveTo(p, p.getByLabel('保存名'));
  await p.getByLabel('保存名').pressSequentially('週末ツーリング仕様', { delay: 70 });
  await click(p, p.getByRole('button', { name: '保存する' }), 600);
  await click(p, p.locator('.app-header nav a', { hasText: 'マイページ' }), 1600);
  await cap(p, '');

  // 7. エンディング
  await p.setContent(`${FONT}<style>${CARD_CSS}</style>
    <div class="mid l" style="animation-delay:.1s">バイクのカスタムを、2Dでシミュレーション</div>
    <div class="big l" style="animation-delay:.5s;font-size:72px">2Dカスタムガレージ</div>
    <div class="bar"></div>
    <div class="sm l" style="animation-delay:1.2s">R4S1 ARMY ／ 2026年度 卒業研究</div>`);
  await p.waitForTimeout(3600);

  const sec = (Date.now() - t0) / 1000;
  const v = p.video();
  await ctx.close();
  console.log(JSON.stringify({ seconds: sec, video: await v.path() }));
  await b.close();
})();
