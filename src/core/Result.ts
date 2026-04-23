export type Result<T> =
  | { ok: true;  value: T }
  | { ok: false; error: string; status: number };

export function Ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function Err<T = never>(error: string, status = 500): Result<T> {
  return { ok: false, error, status };
}
