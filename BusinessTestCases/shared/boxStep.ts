import { test } from '@playwright/test';

/**
 * Runs a helper body as a boxed test.step so a failure is reported at the
 * calling spec line, not inside the helper. Outside a test (global-setup,
 * scripts) there is no step context, so the body just runs.
 */
export async function boxStep<T>(title: string, body: () => Promise<T>): Promise<T> {
  try {
    test.info();
  } catch {
    return body();
  }
  return test.step(title, body, { box: true });
}
