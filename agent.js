import fetch from 'node-fetch';

const OPENAI_API_KEY = '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';

/**
 * AI Auto-Healing for Playwright
 */
export async function generateFix(error, script, dom, testData = null) {

  const prompt = `
You are an expert Playwright automation engineer specialized in fixing broken tests.

TASK:
Fix the failing Playwright test completely.

STRICT RULES:
- Return ONLY the FULL corrected code file
- Do NOT explain anything
- Do NOT add comments outside code
- Keep existing structure (Page Object Model if used)
- Fix broken locators
- Ensure test runs successfully
- Keep data-driven structure if exists
- Ensure OTP/login flows remain correct

--------------------------------
ERROR:
${error}

--------------------------------
TEST DATA:
${testData ? JSON.stringify(testData, null, 2) : 'N/A'}

--------------------------------
CURRENT SCRIPT:
${script}

--------------------------------
DOM SNAPSHOT:
${dom}

--------------------------------
OUTPUT:
Return only the fixed Playwright test file.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: prompt
      })
    });

    const data = await response.json();

    if (!data.output || !data.output.length) {
      throw new Error('Empty response from OpenAI');
    }

    // استخراج النص بشكل آمن
    const text = data.output[0]?.content?.[0]?.text;

    if (!text) {
      throw new Error('Invalid AI response format');
    }

    return text;

  } catch (err) {
    console.error('AI Fix failed:', err.message);
    throw err;
  }
}

/**
 * Extract DOM
 */
export async function getPageDom(page) {
  return await page.content();
}

/**
 * Smart AI Recovery Runner
 */
export async function runWithAIRecovery(testFn, context) {
  try {
    await testFn();
  } catch (error) {

    console.log('❌ Test failed → sending to AI healer...');

    const dom = context?.page ? await context.page.content() : 'NO DOM AVAILABLE';

    const script = testFn.toString();

    const fixedScript = await generateFix(
      error.message,
      script,
      dom,
      context?.testData
    );

    console.log('✅ AI FIX GENERATED');

    return fixedScript;
  }
}