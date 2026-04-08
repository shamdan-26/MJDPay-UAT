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

test('Google title test with MCP auto-heal', async ({ page }) => {
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

    if (result.success) {
      console.log(`✅ MCP test passed on attempt #${attempt}`);
      success = true;
      break;
    }

    console.log(`❌ MCP test failed on attempt #${attempt}: ${result.error}`);
    await page.screenshot({ path: path.join(screenshotDir, `fail_attempt_${attempt}.png`) });
    console.log('📝 DOM snapshot (500 chars):', result.dom.slice(0, 500));

    try {
      script = await generateFix(result.error, script, result.dom);
      console.log('🔧 Fixed script generated');
    } catch (e) {
      console.error('⚠️ Auto-heal failed:', e.message);
      break;
    }

    attempt++;
  }

  if (!success) {
    throw new Error('Test failed after auto-heal attempts');
  }
});