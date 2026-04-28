import fetch from 'node-fetch';

const OPENAI_API_KEY = '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';

export async function generateFix(error, script, dom) {

  const prompt = `
You are a senior QA automation engineer specialized in Playwright.

You are debugging a FAILED LOGIN TEST.

Your task:
Fix the Playwright script so that login works successfully.

--------------------------------
CRITICAL INSTRUCTIONS:
- Return ONLY valid JavaScript code (no explanations)
- Must use Playwright "page" object
- DO NOT remove login flow unless necessary
- Ensure correct selectors for login fields
- Handle common login issues:
  - wrong selectors
  - missing waits
  - navigation delays
  - button not clickable
  - input not found
  - iframe login (if exists)
- Add proper waits (waitForSelector / waitForLoadState)
- Ensure login completes successfully before finishing

--------------------------------
LOGIN GOAL:
The test must successfully:
1. Open login page
2. Enter valid credentials (if present in script)
3. Click login button
4. Wait for successful login (dashboard or redirect)

--------------------------------
ERROR:
${error}

--------------------------------
ORIGINAL SCRIPT:
${script}

--------------------------------
PAGE SNAPSHOT (TEXT ONLY):
${dom.slice(0, 8000)}

--------------------------------
OUTPUT:
Return ONLY the fixed Playwright script.
`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-5',
      input: prompt
    })
  });

  const data = await response.json();

  if (!data.output?.[0]) {
    throw new Error('AI response invalid');
  }

  return data.output[0].content[0].text;
}