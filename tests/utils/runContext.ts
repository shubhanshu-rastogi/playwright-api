import crypto from 'crypto';
import { TestInfo } from '@playwright/test';

export function runContext(testInfo: TestInfo) {
  const runId =
    process.env.CI
      ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`
      : 'local';

  const testId = crypto
    .createHash('sha1')
    .update(`${runId}:${testInfo.file}:${testInfo.title}`)
    .digest('hex')
    .slice(0, 10);

  return {
    runId,
    testId,
    correlationId: `corr-${testId}`,
    idempotencyKey: `idem-${testId}`,
    uniqueEmail: `user_${testId}@example.com`,
  };
}