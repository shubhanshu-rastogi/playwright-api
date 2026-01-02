import { expect } from '@playwright/test';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  opts?: { timeoutMs?: number; intervalMs?: number; name?: string }
): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? 10_000;
  const intervalMs = opts?.intervalMs ?? 500;
  const name = opts?.name ?? 'condition';

  const start = Date.now();
  let last: T;

  while (true) {
    last = await fn();
    if (predicate(last)) return last;

    if (Date.now() - start > timeoutMs) {
      expect(false, `Timed out waiting for ${name} after ${timeoutMs}ms`).toBe(true);
    }

    await sleep(intervalMs);
  }
}