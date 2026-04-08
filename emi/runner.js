import fetch from 'node-fetch';
import { generateFix } from './agent.js';

let script = `
await page.goto('https://www.google.com');
await page.click('#wrong-id');
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
    console.log('❌ Failed:', result.error);

    const fixedScript = await generateFix(
      result.error,
      script,
      result.dom
    );

    console.log('🔧 Fixed script:', fixedScript);

    result = await runTest(fixedScript);
  }

  console.log(result.success ? '✅ Passed' : '❌ Still failing');
})();