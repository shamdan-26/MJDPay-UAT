import fs from 'fs';
import { execSync } from 'child_process';

export async function runWithAIRecovery(testFn, context) {
  try {
    await testFn();
  } catch (error) {

    console.log('❌ Test failed → AI Auto-Heal started...');

    const dom = context?.page ? await context.page.content() : 'NO DOM';
    const script = testFn.toString();

    const fixedScript = await generateFix(
      error.message,
      script,
      dom,
      context?.testData
    );

    console.log('🛠 Applying AI fix to file...');

    // 1. احفظ التعديل
    fs.writeFileSync(
      'tests/testCases/LoginTests.spec.ts',
      fixedScript,
      'utf8'
    );

    console.log('🔁 Re-running test after fix...');

    // 2. أعد تشغيل الاختبار
    execSync(
      'npx playwright test tests/testCases/LoginTests.spec.ts',
      { stdio: 'inherit' }
    );
  }
}