import { test, expect } from '@playwright/test';
import fetch from 'node-fetch';
import { generateFix } from './agent.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// تعويض __dirname في ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مجلد لتخزين screenshots
const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

test('Google title test with MCP auto-heal', async ({ page }, testInfo) => {

  let script = `
(async () => {
  await page.goto('https://www.google.com');
  const title = await page.title();
  if (!title.includes('Google')) {
    throw new Error('Title is not Google');
  }
})()
`;

  async function runMCP(script) {
    const res = await fetch('http://localhost:3000/run-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script })
    });
    return await res.json();
  }

  let attempt = 1;
  const maxAttempts = 3;
  let success = false;

  while (attempt <= maxAttempts && !success) {
    const result = await runMCP(script);

    // ✅ نجاح
    if (result.success) {
      console.log(`✅ MCP test passed on attempt #${attempt}`);
      success = true;
      break;
    }

    // ❌ فشل
    console.log(`❌ MCP test failed on attempt #${attempt}: ${result.error}`);

    // 📸 حفظ screenshot من MCP (وليس من Playwright page)
    if (result.screenshot) {
      const buffer = Buffer.from(result.screenshot, 'base64');

      const filePath = path.join(
        screenshotDir,
        `fail_attempt_${attempt}.png`
      );

      fs.writeFileSync(filePath, buffer);

      console.log(`📸 Screenshot saved: ${filePath}`);

      // 🔥 attach داخل التقرير
      await testInfo.attach(`mcp-screenshot-${attempt}`, {
        path: filePath,
        contentType: 'image/png'
      });
    }

    // 🧠 عرض جزء من DOM
    console.log('📝 DOM snapshot (500 chars):', result.dom.slice(0, 500));

    // 🔧 Auto-heal
    try {
      script = await generateFix(result.error, script, result.dom);
      console.log('🔧 Fixed script generated');
    } catch (e) {
      console.error('⚠️ Auto-heal failed:', e.message);
      break;
    }

    attempt++;
  }

  // ❌ فشل نهائي
  if (!success) {
    throw new Error('Test failed after auto-heal attempts');
  }
});