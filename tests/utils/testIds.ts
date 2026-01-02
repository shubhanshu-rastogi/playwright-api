import type { TestInfo } from '@playwright/test';

export function runId(testInfo: TestInfo) {
  // stable per test, unique enough for parallel runs
  const worker = testInfo.workerIndex;
  const title = testInfo.title.replace(/\W+/g, '_').slice(0, 40);
  const ts = Date.now();
  return `${title}_${worker}_${ts}`;
}