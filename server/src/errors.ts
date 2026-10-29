/** API のエラー。code は基本設計書 9.2 の APIエラーコード */
export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details: string[] = []) {
    super(message);
  }
}

export const badRequest = (message: string, details: string[] = []) => new HttpError(400, 'VALIDATION_ERROR', message, details);
export const notFound = (message = '見つかりません') => new HttpError(404, 'NOT_FOUND', message);
