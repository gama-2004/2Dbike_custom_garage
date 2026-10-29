import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import { config } from './config';

export type Db = Pool;
export type Conn = Pool | PoolConnection;

/** コネクションプール(基本設計書 10章: 10本) */
export function createPool(database = config.db.database): Pool {
  return mysql.createPool({ ...config.db, database, connectionLimit: 10, charset: 'utf8mb4', timezone: 'Z', dateStrings: false });
}

export async function rows<T>(c: Conn, sql: string, params: unknown[] = []): Promise<T[]> {
  const [r] = await c.query<RowDataPacket[]>(sql, params);
  return r as T[];
}

export async function one<T>(c: Conn, sql: string, params: unknown[] = []): Promise<T | undefined> {
  return (await rows<T>(c, sql, params))[0];
}

export async function exec(c: Conn, sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [r] = await c.query<ResultSetHeader>(sql, params);
  return r;
}

/** トランザクションで処理する。途中で失敗したら全部取り消す */
export async function tx<T>(db: Pool, fn: (c: PoolConnection) => Promise<T>): Promise<T> {
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const r = await fn(c);
    await c.commit();
    return r;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
