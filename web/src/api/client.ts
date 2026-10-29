import type { CatalogJson, CatalogVehicle, PartDefinition } from '../catalog/definition';
import type { Spec } from '../catalog/types';

/** API が返すエラー。code は基本設計書のAPIエラーコード(VALIDATION_ERROR、DUPLICATE など) */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details: string[] = []) {
    super(message);
  }
}

/** サーバーにつながらない(サーバーなしの公開ページなど) */
export class OfflineError extends Error {}

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

async function req<T>(path: string, init: RequestInit & { json?: unknown; timeout?: number } = {}): Promise<T> {
  const { json, timeout = 8000, ...rest } = init;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      credentials: 'same-origin',
      ...rest,
      headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), 'X-Owner-Key': ownerKey(), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      signal: ctl.signal,
    });
  } catch {
    throw new OfflineError('サーバーに接続できません');
  } finally {
    clearTimeout(timer);
  }
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    if (res.status === 204) return undefined as T;
    throw new OfflineError('サーバーに接続できません');
  }
  const body = await res.json();
  if (!res.ok) throw new ApiError(res.status, body?.error?.code ?? 'SERVER_ERROR', body?.error?.message ?? 'エラーが起きました', body?.error?.details);
  return body as T;
}

/** 利用者キー: 保存仕様の持ち主をブラウザごとに区別する UUID */
const KEY_OWNER = 'ss-garage-owner';
let owner: string | null = null;
export function ownerKey(): string {
  if (owner) return owner;
  try {
    owner = localStorage.getItem(KEY_OWNER);
  } catch {
    /* 使えないときは、この画面を開いている間だけのキーにする */
  }
  if (!owner || !/^[0-9a-f-]{36}$/.test(owner)) {
    owner = globalThis.crypto?.randomUUID?.() ?? '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0');
    try {
      localStorage.setItem(KEY_OWNER, owner);
    } catch {
      /* 同上 */
    }
  }
  return owner;
}

export interface ApiBuild {
  id: number;
  vehicle_code: string;
  name: string;
  style_name: string;
  saved_at: string;
  spec: Spec;
}

export const api = {
  vehicles: () => req<CatalogVehicle[]>('/vehicles', { timeout: 3000 }),
  catalog: (code: string) => req<CatalogJson>(`/vehicles/${encodeURIComponent(code)}/catalog`),
  builds: {
    list: () => req<ApiBuild[]>('/builds'),
    get: (id: number) => req<ApiBuild>(`/builds/${id}`),
    create: (b: { vehicle_code: string; name: string; style_name: string; spec: Spec }) => req<ApiBuild>('/builds', { method: 'POST', json: b }),
    rename: (id: number, name: string) => req<ApiBuild>(`/builds/${id}`, { method: 'PATCH', json: { name } }),
    remove: (id: number) => req<void>(`/builds/${id}`, { method: 'DELETE' }),
  },
  admin: {
    me: () => req<{ login_id: string; name: string } | null>('/admin/me'),
    login: (login_id: string, password: string) => req<{ login_id: string; name: string }>('/admin/login', { method: 'POST', json: { login_id, password } }),
    logout: () => req<{ ok: true }>('/admin/logout', { method: 'POST', json: {} }),
    addVehicle: (def: CatalogJson, overwrite = false) => req<CatalogVehicle>(`/admin/vehicles${overwrite ? '?overwrite=true' : ''}`, { method: 'POST', json: def }),
    addPart: (code: string, def: PartDefinition, overwrite = false) =>
      req<CatalogJson>(`/admin/vehicles/${encodeURIComponent(code)}/parts${overwrite ? '?overwrite=true' : ''}`, { method: 'POST', json: def }),
  },
};
