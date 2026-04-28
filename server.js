import { chromium } from 'playwright';
import { generateFix } from './agent.js';

async function runTest(script) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await eval(script);
    await browser.close();
    return { success: true };

  } catch (error) {

    const dom = await page.content();
    const screenshot = await page.screenshot({ encoding: 'base64' });

    await browser.close();

    // 🧠 إرسال للـ AI fixer
    const fixedScript = await generateFix(
      error.message,
      script,
      dom
    );

    console.log("🔧 AI fixed script received");

    // 🔁 إعادة التشغيل بالنسخة الجديدة
    return await runTest(fixedScript);
  }
}