import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError, api } from '../api/client';
import { useCatalog } from '../catalog';
import { validatePartDefinition, validateVehicleDefinition, withPart, type CatalogJson, type PartDefinition } from '../catalog/definition';
import { buildVehicle } from '../catalog/fromCatalog';
import type { Vehicle } from '../catalog/types';
import { BikeSvg } from '../components/BikeSvg';
import { applyRules } from '../logic/constraints';
import { navigate } from '../router';

type Admin = { login_id: string; name: string };
type Msg = { kind: 'ok' | 'err'; text: string } | null;

/** 定義ファイルを読む(1MBまで) */
async function readJson(file: File): Promise<{ data?: unknown; error?: string }> {
  if (file.size > 1024 * 1024) return { error: 'ファイルが大きすぎます(1MBまで)' };
  try {
    return { data: JSON.parse(await file.text()) };
  } catch (e) {
    return { error: `JSON として読めません: ${e instanceof Error ? e.message : ''}` };
  }
}

const errText = (e: unknown) => (e instanceof ApiError ? e.message : 'サーバーに接続できません。時間をおいてもう一度お試しください。');

/** 検証結果を、項目のまとまりごとに OK / エラーで見せる */
function CheckTable({ groups, errors, fileError }: { groups: [string, string][]; errors: string[]; fileError?: string }) {
  if (fileError) return <p className="msg err" role="alert">{fileError}</p>;
  return (
    <table className="diff check">
      <thead><tr><th>検証項目</th><th>結果</th></tr></thead>
      <tbody>
        {groups.map(([label, prefix]) => {
          const mine = errors.filter((e) => prefix.split('|').some((p) => e.startsWith(p)));
          return (
            <tr key={label}>
              <td>{label}</td>
              <td>{mine.length === 0 ? <span className="ok">OK</span> : <ul className="ng">{mine.map((e) => <li key={e}>{e}</li>)}</ul>}</td>
            </tr>
          );
        })}
        {errors.filter((e) => !groups.some(([, p]) => p.split('|').some((x) => e.startsWith(x)))).map((e) => (
          <tr key={e}><td>その他</td><td><ul className="ng"><li>{e}</li></ul></td></tr>
        ))}
      </tbody>
    </table>
  );
}

function Preview({ vehicle, spec }: { vehicle: Vehicle; spec: Vehicle['defaults'] }) {
  return (
    <div className="stage">
      <div className="style-tag"><small>Preview</small><b>{vehicle.styleName(spec)}</b></div>
      <BikeSvg vehicle={vehicle} spec={spec} label={`${vehicle.label}のプレビュー`} />
    </div>
  );
}

/** 上書きの確認(W003) */
function Overwrite({ text, onYes, onNo }: { text: string; onYes: () => void; onNo: () => void }) {
  return (
    <div className="confirm danger-box" role="alertdialog" aria-label="上書きの確認">
      <span>{text}</span>
      <button type="button" className="btn danger" onClick={onYes}>はい(上書きする)</button>
      <button type="button" className="btn ghost" onClick={onNo}>いいえ</button>
    </div>
  );
}

/* ---------- SCR-05 管理者ログイン ---------- */
function Login({ onLogin }: { onLogin: (a: Admin) => void }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await api.admin.login(id.trim(), pw));
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
      setPw('');
    }
  };
  return (
    <form className="panel login" onSubmit={submit}>
      <h1 className="page-title">管理者ログイン</h1>
      <label className="field">
        <span>ログインID</span>
        <input id="admin-login-id" className="text" autoComplete="username" maxLength={30} required value={id} onChange={(e) => setId(e.target.value)} />
      </label>
      <label className="field">
        <span>パスワード</span>
        <input id="admin-password" className="text" type="password" autoComplete="current-password" maxLength={64} required value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>
      {error && <p className="msg err" role="alert">{error}</p>}
      <button type="submit" className="btn primary block" disabled={busy}>{busy ? 'ログイン中…' : 'ログイン'}</button>
      <button type="button" className="link-btn" onClick={() => navigate('top')}>利用者画面へ戻る</button>
    </form>
  );
}

/* ---------- SCR-06 ベース車両追加 ---------- */
const VEHICLE_CHECKS: [string, string][] = [
  ['JSON の形', 'ファイルの中身'],
  ['車両の情報(コード・名前・諸元・車体の描画データ)', 'vehicle'],
  ['部位とパーツ(コードの重複、描画データ)', 'slots|部位と塗装部位'],
  ['塗装部位と色', 'paints'],
  ['標準仕様(すべての部位を満たすか)', 'defaultSpec'],
  ['プリセット', 'presets'],
  ['組み合わせ制約', 'constraints'],
];

function VehicleAdd({ onDone }: { onDone: () => Promise<void> }) {
  const vehicles = useCatalog((c) => c.vehicles);
  const ids = useCatalog((c) => c.ids);
  const catalogs = useCatalog((c) => c.catalogs);
  const [file, setFile] = useState<{ name: string; data?: unknown; error?: string } | null>(null);
  const [preset, setPreset] = useState(0);
  const [msg, setMsg] = useState<Msg>(null);
  const [dup, setDup] = useState('');
  const [busy, setBusy] = useState(false);
  const errors = useMemo(() => (file?.data !== undefined ? validateVehicleDefinition(file.data) : []), [file]);
  const def = file?.data !== undefined && errors.length === 0 ? (file.data as CatalogJson) : null;
  const preview = useMemo(() => (def ? buildVehicle(def) : null), [def]);

  const load = async (name: string, f: Promise<{ data?: unknown; error?: string }>) => {
    setMsg(null);
    setDup('');
    setPreset(0);
    setFile({ name, ...(await f) });
  };
  const register = async (overwrite = false) => {
    if (!def) return;
    setBusy(true);
    setDup('');
    try {
      await api.admin.addVehicle(def, overwrite);
      await onDone();
      setMsg({ kind: 'ok', text: `登録しました。「${def.vehicle.name}(${def.vehicle.code})」が車種選択に表示されます。` });
      setFile(null);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DUPLICATE' && !overwrite && !e.message.includes('組み込み')) setDup(e.message);
      else setMsg({ kind: 'err', text: errText(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-grid">
      <div className="col">
        <section className="panel">
          <h2 className="panel-title">登録済みの車両</h2>
          <table className="diff">
            <thead><tr><th>コード</th><th>車両名</th><th>描き方</th></tr></thead>
            <tbody>
              {ids.map((id) => (
                <tr key={id}><td>{id}</td><td>{vehicles[id].label}</td><td>{catalogs[id]?.vehicle.renderer === 'template' ? '定義ファイル' : '組み込み'}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2 className="panel-title">車両定義ファイル(JSON)</h2>
          <input id="vehicle-file" type="file" accept=".json,application/json" aria-label="車両定義ファイル"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f.name, readJson(f)); e.target.value = ''; }} />
          <p className="note">
            書き方はサンプルを見てください: <a href="samples/vehicle-naked.json" download>vehicle-naked.json</a>
            {' '}<button type="button" className="link-btn" onClick={() => void load('vehicle-naked.json(サンプル)', fetch('samples/vehicle-naked.json').then(async (r) => ({ data: await r.json() })))}>サンプルを読み込む</button>
          </p>
          {file && <p className="note">選んだファイル: {file.name}</p>}
        </section>
        {file && (
          <section className="panel">
            <h2 className="panel-title">検証結果</h2>
            <CheckTable groups={VEHICLE_CHECKS} errors={errors} fileError={file.error} />
          </section>
        )}
      </div>
      <div className="col">
        <section className="panel">
          <h2 className="panel-title">プレビュー(標準仕様{preview && preset > 0 ? `・${preview.presets[preset].name}` : ''})</h2>
          {preview ? (
            <>
              <Preview vehicle={preview} spec={{ ...preview.defaults, ...preview.presets[preset]?.spec }} />
              <div className="chips" style={{ marginTop: 8 }}>
                {preview.presets.map((p, i) => (
                  <button key={p.name} type="button" className="chip" aria-pressed={i === preset} onClick={() => setPreset(i)}>{p.name}</button>
                ))}
              </div>
            </>
          ) : (
            <p className="empty">検証に通った定義ファイルを選ぶと、ここに図が出ます。</p>
          )}
        </section>
        {dup && <Overwrite text={dup} onYes={() => void register(true)} onNo={() => setDup('')} />}
        <div className="row-end">
          <button type="button" className="btn" onClick={() => { setFile(null); setMsg(null); setDup(''); }}>取消</button>
          <button type="button" className="btn primary" disabled={!def || busy} onClick={() => void register()}>{busy ? '登録中…' : '登録'}</button>
        </div>
        {msg && <p className={`msg ${msg.kind === 'err' ? 'err' : ''}`} role="status">{msg.text}</p>}
      </div>
    </div>
  );
}

/* ---------- SCR-07 パーツ追加 ---------- */
const PART_CHECKS: [string, string][] = [
  ['JSON の形', 'ファイルの中身'],
  ['追加先の部位', 'slot'],
  ['パーツ(コード・名前・重量・価格・描画データ)', 'part'],
  ['組み合わせ制約(参照先のパーツがあるか)', 'constraints'],
];
const NEW_SLOT = '__new__';

function PartAdd({ onDone }: { onDone: () => Promise<void> }) {
  const ids = useCatalog((c) => c.ids);
  const vehicles = useCatalog((c) => c.vehicles);
  const catalogs = useCatalog((c) => c.catalogs);
  const [code, setCode] = useState(ids[0]);
  const [slotSel, setSlotSel] = useState('');
  const [newSlot, setNewSlot] = useState({ code: '', name: '' });
  const [file, setFile] = useState<{ name: string; data?: unknown; error?: string } | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [dup, setDup] = useState('');
  const [busy, setBusy] = useState(false);
  const catalog = catalogs[code];

  // ファイルを読んだら、ファイルに書いてある部位を初期値にする
  useEffect(() => {
    const s = (file?.data as PartDefinition | undefined)?.slot;
    if (!s || !catalog) return;
    if (catalog.slots.some((x) => x.code === s.code)) setSlotSel(s.code);
    else {
      setSlotSel(NEW_SLOT);
      setNewSlot({ code: String(s.code ?? ''), name: String(s.name ?? '') });
    }
  }, [file, catalog]);

  const def = useMemo((): PartDefinition | null => {
    if (!file?.data || typeof file.data !== 'object') return null;
    const raw = file.data as PartDefinition;
    const slot = slotSel === NEW_SLOT ? { code: newSlot.code.trim(), name: newSlot.name.trim() } : { code: slotSel || raw.slot?.code };
    return { ...raw, slot };
  }, [file, slotSel, newSlot]);
  // 同じコードのパーツは、エラーにせず「上書きしますか?」を出す
  const errors = useMemo(() => (def && catalog ? validatePartDefinition(def, catalog, true) : file?.data !== undefined && !def ? ['ファイルの中身が JSON のオブジェクトになっていません'] : []), [def, catalog, file]);
  const ok = !!def && !!catalog && errors.length === 0;
  const existing = ok ? catalog!.slots.find((x) => x.code === def!.slot.code)?.parts.find((p) => p.code === def!.part.code) : undefined;
  const preview = useMemo(() => {
    if (!ok) return null;
    const v = buildVehicle(withPart(catalog!, def!));
    return { v, spec: applyRules(v, { ...v.defaults, [def!.slot.code]: def!.part.code }).spec };
  }, [ok, catalog, def]);

  const load = async (name: string, f: Promise<{ data?: unknown; error?: string }>) => {
    setMsg(null);
    setDup('');
    setFile({ name, ...(await f) });
  };
  const register = async (overwrite = false) => {
    if (!ok || !def) return;
    if (existing && !overwrite) {
      setDup(`この部位にはもう「${existing.name}(${existing.code})」があります。上書きしますか?`);
      return;
    }
    setBusy(true);
    setDup('');
    try {
      await api.admin.addPart(code, def, overwrite);
      await onDone();
      setMsg({ kind: 'ok', text: `登録しました。「${vehicles[code]?.label}」の部位「${catalog?.slots.find((s) => s.code === def.slot.code)?.name ?? def.slot.name}」に「${def.part.name}」が増えました。` });
      setFile(null);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DUPLICATE' && !overwrite) setDup(`${e.message}。上書きしますか?`);
      else setMsg({ kind: 'err', text: errText(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-grid">
      <div className="col">
        <section className="panel">
          <h2 className="panel-title">追加先</h2>
          <label className="field">
            <span>対象の車両</span>
            <select id="part-vehicle" className="text" value={code} onChange={(e) => { setCode(e.target.value); setSlotSel(''); }}>
              {ids.map((id) => <option key={id} value={id}>{id} {vehicles[id].label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>部位</span>
            <select id="part-slot" className="text" value={slotSel} onChange={(e) => setSlotSel(e.target.value)}>
              <option value="">(ファイルに書いた部位)</option>
              {catalog?.slots.map((s) => <option key={s.code} value={s.code}>{s.code} {s.name}</option>)}
              <option value={NEW_SLOT}>新しい部位…</option>
            </select>
          </label>
          {slotSel === NEW_SLOT && (
            <div className="inline">
              <label className="field"><span>部位コード</span><input id="new-slot-code" className="text" maxLength={20} value={newSlot.code} onChange={(e) => setNewSlot({ ...newSlot, code: e.target.value })} /></label>
              <label className="field"><span>部位名</span><input id="new-slot-name" className="text" maxLength={30} value={newSlot.name} onChange={(e) => setNewSlot({ ...newSlot, name: e.target.value })} /></label>
            </div>
          )}
        </section>
        <section className="panel">
          <h2 className="panel-title">パーツ定義ファイル(JSON)</h2>
          <input id="part-file" type="file" accept=".json,application/json" aria-label="パーツ定義ファイル"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f.name, readJson(f)); e.target.value = ''; }} />
          <p className="note">
            書き方はサンプルを見てください: <a href="samples/part-supersport-exhaust.json" download>part-supersport-exhaust.json</a>(スーパースポーツ用)
            {' '}<button type="button" className="link-btn" onClick={() => { setCode('V001'); void load('part-supersport-exhaust.json(サンプル)', fetch('samples/part-supersport-exhaust.json').then(async (r) => ({ data: await r.json() }))); }}>サンプルを読み込む</button>
          </p>
          {file && <p className="note">選んだファイル: {file.name}</p>}
        </section>
        {file && (
          <section className="panel">
            <h2 className="panel-title">検証結果</h2>
            <CheckTable groups={PART_CHECKS} errors={errors} fileError={file.error} />
            {existing && <p className="note">同じコードのパーツ「{existing.name}」があります。登録すると上書きの確認が出ます。</p>}
          </section>
        )}
      </div>
      <div className="col">
        <section className="panel">
          <h2 className="panel-title">プレビュー(標準仕様にこのパーツを付けた図)</h2>
          {preview ? <Preview vehicle={preview.v} spec={preview.spec} /> : <p className="empty">検証に通ったパーツ定義ファイルを選ぶと、ここに図が出ます。</p>}
        </section>
        {dup && <Overwrite text={dup} onYes={() => void register(true)} onNo={() => setDup('')} />}
        <div className="row-end">
          <button type="button" className="btn" onClick={() => { setFile(null); setMsg(null); setDup(''); }}>取消</button>
          <button type="button" className="btn primary" disabled={!ok || busy} onClick={() => void register()}>{busy ? '登録中…' : '登録'}</button>
        </div>
        {msg && <p className={`msg ${msg.kind === 'err' ? 'err' : ''}`} role="status">{msg.text}</p>}
      </div>
    </div>
  );
}

/** 管理画面(/admin): ログイン(SCR-05)、ベース車両追加(SCR-06)、パーツ追加(SCR-07) */
export function AdminPage() {
  const source = useCatalog((c) => c.source);
  const reload = useCatalog((c) => c.load);
  const [admin, setAdmin] = useState<Admin | null | undefined>(undefined);
  const [tab, setTab] = useState<'vehicle' | 'part'>('vehicle');

  useEffect(() => {
    if (source !== 'api') return;
    api.admin.me().then(setAdmin, () => setAdmin(null));
  }, [source]);

  if (source === 'loading') return <div className="page"><p className="empty">サーバーに接続しています…</p></div>;
  if (source === 'builtin') {
    return (
      <div className="page">
        <section className="panel empty-box">
          <h1 className="page-title">管理画面</h1>
          <p>管理画面は、サーバー(server フォルダ)とデータベースが動いているときだけ使えます。いまはサーバーに接続できないため、組み込みの2車種だけで動いています。</p>
          <p>サーバーを起動してから、このページを開き直してください(手順は README の「サーバーとデータベース」)。</p>
          <button type="button" className="btn" onClick={() => navigate('top')}>利用者画面へ戻る</button>
        </section>
      </div>
    );
  }
  if (admin === undefined) return <div className="page"><p className="empty">確認しています…</p></div>;
  if (admin === null) return <div className="page"><Login onLogin={setAdmin} /></div>;

  const logout = async () => {
    await api.admin.logout().catch(() => undefined);
    setAdmin(null);
  };
  return (
    <div className="page wide">
      <div className="page-head">
        <h1 className="page-title">管理画面</h1>
        <div className="head-actions">
          <div className="seg" role="tablist" aria-label="管理メニュー">
            <button type="button" role="tab" aria-selected={tab === 'vehicle'} aria-pressed={tab === 'vehicle'} onClick={() => setTab('vehicle')}>ベース車両追加</button>
            <button type="button" role="tab" aria-selected={tab === 'part'} aria-pressed={tab === 'part'} onClick={() => setTab('part')}>パーツ追加</button>
          </div>
          <span className="note">{admin.name}({admin.login_id})</span>
          <button type="button" className="btn" onClick={() => void logout()}>ログアウト</button>
        </div>
      </div>
      {tab === 'vehicle' ? <VehicleAdd onDone={reload} /> : <PartAdd onDone={reload} />}
    </div>
  );
}
