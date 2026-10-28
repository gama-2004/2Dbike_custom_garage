import { useEffect, useState } from 'react';
import { VEHICLES, isVehicleId } from '../catalog';
import { localBuildRepository, type SavedBuild } from '../repo/buildRepository';
import { useGarage } from '../store/garage';

const repo = localBuildRepository();

/** 保存一覧(SaveListPanel / マイガレージ) */
export function SaveList() {
  const [list, setList] = useState<SavedBuild[]>([]);
  const base = useGarage((st) => st.base);
  const spec = useGarage((st) => st.specs[st.base]);
  const loadBuild = useGarage((st) => st.loadBuild);

  useEffect(() => {
    repo.list().then(setList);
  }, []);

  return (
    <section className="sec" id="sec-saves">
      <h3>
        マイガレージ <em>このブラウザに保存</em>
      </h3>
      <button type="button" className="btn primary" onClick={() => repo.save(base, spec).then(setList)}>
        今の仕様を保存
      </button>
      <div className="saves">
        {list.length === 0 && <p className="empty">保存した仕様はまだありません。気に入った組み合わせを保存しておくと、あとで呼び出せます。</p>}
        {list.map((b) => {
          const id = isVehicleId(b.base) ? b.base : 'ss';
          const v = VEHICLES[id];
          return (
            <div className="save" key={b.n}>
              <button type="button" className="load" onClick={() => loadBuild(id, b.state)}>
                <i className="dot" style={{ background: String(b.state.main) }} />
                <span className="nm">{b.name}</span>
                <span className="st">
                  {v.label}・{v.styleName({ ...v.defaults, ...b.state })}・{b.date}
                </span>
              </button>
              <button type="button" className="del" aria-label={`${b.name}を削除`} onClick={() => repo.remove(b.n).then(setList)}>
                ×
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
