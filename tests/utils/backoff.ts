export type BackoffOptions = {
  maxAttempts?: number;     // default 3
  baseDelayMs?: number;     // default 200
  maxDelayMs?: number;      // default 2000
  jitterMs?: number;        // default 0 (deterministic)
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const addJitter = (ms: number, jitterMs: number) =>
  jitterMs > 0 ? ms + Math.floor(Math.random() * jitterMs) : ms;

export async function withExponentialBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  shouldRetry: (err: any) => boolean,
  options: BackoffOptions = {}
): Promise<{ result: T; attempts: number }> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 200;
  const maxDelayMs = options.maxDelayMs ?? 2000;
  const jitterMs = options.jitterMs ?? 0;

  let attempt = 1;

  while (true) {
    try {
      const result = await fn(attempt);
      return { result, attempts: attempt };
    } catch (err) {
      if (attempt >= maxAttempts || !shouldRetry(err)) throw err;

      const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      const waitMs = addJitter(expDelay, jitterMs);

      await sleep(waitMs);
      attempt += 1;
    }
  }
}
