# -*- coding: utf-8 -*-
import base64, html, re, sys
sys.path.insert(0, '.')
from model import *

FONT = "'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic','Meiryo',sans-serif"
def svg_uri(name):
    s = open(f'svg/{name}.svg', encoding='utf-8').read()
    s = re.sub(r'font-family="[^"]*"', f'font-family="{FONT}"', s)
    return 'data:image/svg+xml;base64,' + base64.b64encode(s.encode()).decode()

def figure(name, caption, src, fid):
    return f'''<figure class="fig" id="{fid}">
  <figcaption><span>{html.escape(caption)}</span>
    <span class="fig-actions">
      <button type="button" class="tbtn" data-zoom="{fid}" aria-pressed="false">実寸で見る</button>
      <button type="button" class="tbtn" data-copy="{fid}-src">PlantUMLをコピー</button>
    </span></figcaption>
  <div class="canvas"><img src="{svg_uri(name)}" alt="{html.escape(caption)}" loading="lazy"></div>
  <details><summary>PlantUMLソース <code>{name}.puml</code></summary><pre id="{fid}-src">{html.escape(src)}</pre></details>
</figure>'''

def ol(items): return '<ol>' + ''.join(f'<li>{html.escape(i)}</li>' for i in items) + '</ol>'
def ul(items): return '<ul class="flow">' + ''.join(f'<li>{html.escape(i)}</li>' for i in items) + '</ul>'

KIND = {'boundary':'バウンダリ','control':'コントロール','entity':'エンティティ'}
class_rows = ''.join(
    f'<tr><td><span class="kind k-{k}">{KIND[k]}</span></td><td><code>{en}</code></td><td>{jp}</td><td>{html.escape(RESP[en])}</td></tr>'
    for k, jp, en in EL.values())

uc_rows = ''.join(f'<tr><td class="mono"><a href="#uc-{u["id"]}">{u["id"]}</a></td><td>{u["name"]}</td><td>{u["actor"]}</td><td>{html.escape(u["summary"])}</td></tr>' for u in UCS)

nav = ''.join(f'<a href="#uc-{u["id"]}"><span class="mono">{u["id"]}</span>{u["name"]}</a>' for u in UCS)

uc_sections = ''
for u in UCS:
    n = u['id'].replace('-', '_')
    uc_sections += f'''
<section class="uc" id="uc-{u['id']}">
  <h2><span class="ucid">{u['id']}</span>{u['name']}</h2>
  <table class="desc">
    <tr><th>ユースケース名</th><td>{u['name']}</td></tr>
    <tr><th>アクター</th><td>{u['actor']}</td></tr>
    <tr><th>概要</th><td>{html.escape(u['summary'])}</td></tr>
    <tr><th>事前条件</th><td>{html.escape(u['pre'])}</td></tr>
    <tr><th>事後条件</th><td>{html.escape(u['post'])}</td></tr>
    <tr><th>基本フロー</th><td>{ol(u['main'])}</td></tr>
    <tr><th>代替フロー</th><td>{ul(u['alt'])}</td></tr>
    <tr><th>例外フロー</th><td>{ul(u['exc'])}</td></tr>
  </table>
  {figure(f'uc{n}_robustness', f'{u["id"]} ロバストネス図', u['robust'], f'r{n}')}
  {figure(f'uc{n}_sequence', f'{u["id"]} シーケンス図', u['seq'], f's{n}')}
</section>'''

page = f'''<title>2Dカスタムガレージ 設計図</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap">
<style>
/* Layout: 左に固定の目次、右に本文。図は白い製図面として置き、幅に合わせるか実寸かを切り替える */
:root{{
  --bg:#eef0f3; --panel:#ffffff; --ink:#191c22; --muted:#5a6170; --line:#d3d8df;
  --accent:#1e4fd0; --accent-soft:#e3eafc;
  --k-boundary:#dfe8ff; --k-control:#ffefcf; --k-entity:#dcf1e3; --k-ink:#191c22;
  --f-body:"Zen Kaku Gothic New","Hiragino Sans","Yu Gothic",system-ui,sans-serif;
  --f-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;
}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{
  --bg:#111318; --panel:#1a1d24; --ink:#e6e8ec; --muted:#9aa1ad; --line:#2d323c;
  --accent:#86a2ff; --accent-soft:#232c45;
  --k-boundary:#2a3557; --k-control:#4a3d1f; --k-entity:#203d2b; --k-ink:#e6e8ec; color-scheme:dark}}}}
:root[data-theme="dark"]{{
  --bg:#111318; --panel:#1a1d24; --ink:#e6e8ec; --muted:#9aa1ad; --line:#2d323c;
  --accent:#86a2ff; --accent-soft:#232c45;
  --k-boundary:#2a3557; --k-control:#4a3d1f; --k-entity:#203d2b; --k-ink:#e6e8ec; color-scheme:dark}}
*{{box-sizing:border-box}}
body{{background:var(--bg);color:var(--ink);font-family:var(--f-body);font-size:15px;line-height:1.7;
  padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:24px 64px}}
a{{color:var(--accent)}}
code,.mono{{font-family:var(--f-mono);font-size:.9em}}
.layout{{max-width:1320px;margin:0 auto;display:grid;grid-template-columns:220px minmax(0,1fr);gap:28px;align-items:start}}
nav.toc{{position:sticky;top:max(16px,env(safe-area-inset-top,0px));display:flex;flex-direction:column;gap:2px;font-size:13px}}
nav.toc .grp{{font-family:var(--f-mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:14px 0 4px}}
nav.toc a{{color:var(--ink);text-decoration:none;padding:4px 8px;border-radius:6px;display:flex;gap:8px}}
nav.toc a:hover{{background:var(--accent-soft)}}
nav.toc a .mono{{color:var(--muted);min-width:34px}}
main{{display:flex;flex-direction:column;gap:40px;min-width:0}}
header h1{{font-size:clamp(24px,3.2vw,34px);font-weight:700;line-height:1.2;margin:0;text-wrap:balance}}
header p{{margin:8px 0 0;color:var(--muted);max-width:70ch}}
.meta{{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px;font-size:13px;color:var(--muted)}}
.meta b{{color:var(--ink);font-family:var(--f-mono);font-weight:600}}
h2{{font-size:22px;margin:0 0 14px;display:flex;align-items:baseline;gap:12px;text-wrap:balance}}
.ucid{{font-family:var(--f-mono);font-size:15px;font-weight:600;color:var(--accent);background:var(--accent-soft);padding:2px 8px;border-radius:5px}}
section{{display:flex;flex-direction:column;gap:18px;scroll-margin-top:16px}}
section.uc{{border-top:1px solid var(--line);padding-top:32px}}
.lead{{margin:0;color:var(--muted);max-width:72ch}}
.tablewrap{{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:8px}}
table{{border-collapse:collapse;width:100%;font-size:14px}}
th,td{{text-align:left;vertical-align:top;padding:9px 12px;border-bottom:1px solid var(--line)}}
tr:last-child>th,tr:last-child>td{{border-bottom:0}}
thead th{{font-size:12px;color:var(--muted);font-weight:500;white-space:nowrap}}
.kind{{display:inline-block;font-size:12px;padding:1px 8px;border-radius:999px;color:var(--k-ink);white-space:nowrap}}
.k-boundary{{background:var(--k-boundary)}} .k-control{{background:var(--k-control)}} .k-entity{{background:var(--k-entity)}}
table.desc{{background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:hidden;display:block}}
table.desc tbody{{display:table;width:100%}}
table.desc th{{width:130px;background:var(--bg);font-weight:500;font-size:13px;color:var(--muted);white-space:nowrap}}
table.desc ol,table.desc ul{{margin:0;padding-left:1.4em}}
table.desc ul.flow{{list-style:none;padding-left:0}}
table.desc li+li{{margin-top:3px}}
.fig{{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:hidden}}
.fig figcaption{{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--line);font-weight:500}}
.fig-actions{{display:flex;gap:6px;flex-wrap:wrap}}
.tbtn{{font:inherit;font-size:12px;color:var(--ink);background:transparent;border:1px solid var(--line);border-radius:6px;padding:4px 10px;cursor:pointer}}
.tbtn:hover{{border-color:var(--accent)}}
.tbtn[aria-pressed="true"]{{background:var(--accent);border-color:var(--accent);color:var(--panel)}}
.tbtn:focus-visible,nav.toc a:focus-visible{{outline:2px solid var(--accent);outline-offset:2px}}
.canvas{{background:#ffffff;overflow-x:auto;padding:14px}}
.canvas img{{display:block;width:100%;height:auto;max-width:100%;margin:0 auto}}
.fig.zoomed .canvas img{{width:auto;max-width:none}}
.fig details{{border-top:1px solid var(--line)}}
.fig summary{{padding:8px 14px;font-size:13px;color:var(--muted);cursor:pointer}}
.fig pre{{margin:0;padding:12px 14px;max-height:360px;overflow:auto;font-family:var(--f-mono);font-size:12px;line-height:1.55;background:var(--bg)}}
.legend{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}}
.legend div{{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 14px;font-size:14px}}
.legend b{{display:block;margin-bottom:4px}}
.toast{{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:8px 16px;border-radius:8px;font-size:13px}}
@media (max-width:860px){{
  .layout{{grid-template-columns:minmax(0,1fr)}}
  nav.toc{{position:static;flex-direction:row;flex-wrap:wrap;gap:6px}}
  nav.toc .grp{{width:100%;margin:6px 0 0}}
  nav.toc a{{border:1px solid var(--line);background:var(--panel)}}
  table.desc th{{width:92px;white-space:normal}}
}}
</style>

<div class="layout">
<nav class="toc" aria-label="目次">
  <div class="grp">全体</div>
  <a href="#overview">凡例と前提</a>
  <a href="#class">クラス図</a>
  <a href="#usecase">ユースケース図</a>
  <div class="grp">ユースケース</div>
  {nav}
</nav>
<main>
<header>
  <h1>2Dカスタムガレージ 設計図</h1>
  <p>卒業研究で洗い出した9機能(2-01〜2-09)について、クラス図、ユースケース図、ユースケース記述、ロバストネス図、シーケンス図をまとめています。図はPlantUMLから生成しているので、ソースをコピーしてastahやVS Codeで編集できます。</p>
  <div class="meta"><span>機能 <b>9</b></span><span>クラス <b>{len(EL)}</b></span><span>図 <b>{2+2*len(UCS)}</b></span><span>アクター <b>2</b></span></div>
</header>

<section id="overview">
  <h2>凡例と前提</h2>
  <div class="legend">
    <div><b><span class="kind k-boundary">バウンダリ</span></b>アクターが直接触れる画面や表示部分。</div>
    <div><b><span class="kind k-control">コントロール</span></b>処理の流れを受け持つ部分。画面とデータの間を取り持つ。</div>
    <div><b><span class="kind k-entity">エンティティ</span></b>車両、パーツ、仕様などのデータ。</div>
  </div>
  <p class="lead">ロバストネス図は、アクターはバウンダリとだけ、バウンダリはコントロールとだけ、エンティティはコントロールとだけつながる、という規則で描いています。図中の矢印の番号は、ユースケース記述のフローの番号と対応しています。アクターは「利用者」(カスタムを試す人)と「管理者」(車両やパーツのデータを登録する人)の2人です。</p>
</section>

<section id="class">
  <h2>クラス図</h2>
  <p class="lead">3層(バウンダリ、コントロール、エンティティ)に分けた25クラスです。シーケンス図に出てくるメソッドは、すべてこのクラス図に載っています。</p>
  {figure('00_class', 'クラス図', CLASS, 'fclass')}
  <div class="tablewrap"><table>
    <thead><tr><th>分類</th><th>クラス名</th><th>日本語名</th><th>責務</th></tr></thead>
    <tbody>{class_rows}</tbody></table></div>
</section>

<section id="usecase">
  <h2>ユースケース図</h2>
  <p class="lead">2-04 組み合わせ制約は利用者が直接操作するものではなく、2-05 パーツ・塗装選択と2-08 仕様の呼出から包含(include)される形にしています。</p>
  {figure('01_usecase', 'ユースケース図', USECASE, 'fuc')}
  <div class="tablewrap"><table>
    <thead><tr><th>ID</th><th>ユースケース</th><th>アクター</th><th>概要</th></tr></thead>
    <tbody>{uc_rows}</tbody></table></div>
</section>
{uc_sections}
</main>
</div>
<div class="toast" id="toast" role="status" hidden></div>

<script>
const toast=document.getElementById('toast');let tt;
function say(t){{toast.textContent=t;toast.hidden=false;clearTimeout(tt);tt=setTimeout(()=>toast.hidden=true,1800)}}
document.addEventListener('click',async e=>{{
  const z=e.target.closest('[data-zoom]');
  if(z){{const f=document.getElementById(z.dataset.zoom);const on=f.classList.toggle('zoomed');z.setAttribute('aria-pressed',String(on));z.textContent=on?'幅に合わせる':'実寸で見る';return}}
  const c=e.target.closest('[data-copy]');
  if(c){{const pre=document.getElementById(c.dataset.copy);
    try{{await navigator.clipboard.writeText(pre.textContent);say('PlantUMLをコピーしました')}}
    catch(err){{pre.closest('details').open=true;const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);say('選択しました。Ctrl+C(⌘C)でコピーしてください')}}}}
}});
</script>
'''
open('design.html', 'w', encoding='utf-8').write(page)
print(len(page))
