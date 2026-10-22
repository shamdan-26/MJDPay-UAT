import { chromium } from 'playwright';
import { generateFix } from './agent.js';

const MAX_RETRIES = 3;

async function runTest(script, retry = 0) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`🚀 Running test (attempt ${retry + 1})`);

    // تمرير page للسكريبت
    const fn = new Function('page', script);
    await fn(page);

    await browser.close();

    console.log('✅ Test passed');
    return { success: true };

  } catch (error) {

    console.log('❌ Test failed:', error.message);

    const dom = await page.content();
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });

    await browser.close();

    // 🚨 stop condition
    if (retry >= MAX_RETRIES) {
      console.log('🛑 Max retries reached');
      return {
        success: false,
        error: error.message,
        dom,
        screenshot
      };
    }

    console.log('🧠 Sending to AI fixer...');

    // 🔧 إصلاح بواسطة AI
    const fixedScript = await generateFix(
      error.message,
      script,
      dom
    );

    console.log('🔁 Retrying with AI-fixed script...');

    // 🔄 إعادة تشغيل تلقائي
    return await runTest(fixedScript, retry + 1);
  }
}

export default runTest;