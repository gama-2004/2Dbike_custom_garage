import { useState } from 'react';
import { PartPanel } from '../components/PartPanel';
import { Stage } from '../components/Stage';
import { SummaryPanel } from '../components/SummaryPanel';

/** カスタム画面(SCR-01): 左にパーツ、中央に2D表示、右に選択中のパーツと価格 */
export function CustomizePage() {
  const [focus, setFocus] = useState<{ id: string; at: number } | null>(null);
  return (
    <div className="custom-layout">
      <PartPanel focus={focus} />
      <Stage onPart={(id) => setFocus({ id, at: Date.now() })} />
      <SummaryPanel />
    </div>
  );
}
