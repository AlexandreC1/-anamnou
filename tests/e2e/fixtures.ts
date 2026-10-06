import { test as base, expect } from '@playwright/test';

// All browser journeys share one loopback IP. Respect the real server's window
// before starting a journey; never disable limits or retry a failed assertion.
export const test = base.extend<{ apiWindow: void }>({
  apiWindow: [
    async ({ request }, use) => {
      // /health has an independent liveness limiter; pace against the application window.
      const response = await request.get('/api/ready');
      const header = response.headers().ratelimit ?? '';
      const remaining = /r=(\d+)/.exec(header)?.[1];
      const reset = /t=(\d+)/.exec(header)?.[1];
      if (remaining === undefined || reset === undefined)
        throw new Error(
          'API rate-limit headers are required for browser test pacing.',
        );
      if (Number(remaining) < 80)
        await new Promise((resolve) =>
          setTimeout(resolve, (Number(reset) + 1) * 1000),
        );
      await use();
    },
    { auto: true, timeout: 90000 },
  ],
});
export { expect };
