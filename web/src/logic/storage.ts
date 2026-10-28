/* localStorage の読み書き。プライベートモードなどで使えなくても落ちないようにする。 */

export function loadJSON<T>(key: string): T | null {
  try {
    const v = globalThis.localStorage?.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

export function storeJSON(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    /* 保存できなくても画面は動かす */
  }
}
