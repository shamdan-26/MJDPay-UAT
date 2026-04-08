import fetch from 'node-fetch';
import { generateFix } from './agent.js';

// غلاف async لتجنب خطأ await
let script = `
(async () => {
  await page.goto('https://www.google.com');
  const title = await page.title();
  if (!title.includes('Google')) {
    throw new Error('Title is not Google');
  }
})()
`;

async function runTest(script) {
  const res = await fetch('http://localhost:3000/run-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script })
  });

  return await res.json();
}

(async () => {
  let result = await runTest(script);

  if (!result.success) {
    console.log('❌ Test failed:', result.error);

    // عرض جزء من DOM لتسهيل التصحيح
    console.log('📝 Snapshot of page DOM (first 500 chars):', result.dom.slice(0, 500));

    try {
      const fixedScript = await generateFix(
        result.error,
        script,
        result.dom
      );

      console.log('🔧 Fixed script generated:\n', fixedScript);

      // إعادة تجربة السكريبت بعد التصحيح
      result = await runTest(fixedScript);
    } catch (e) {
      console.error('⚠️ Auto-heal failed:', e.message);
      return;
    }
  }

  console.log(result.success ? '✅ Google title test passed' : '❌ Still failing');
})();