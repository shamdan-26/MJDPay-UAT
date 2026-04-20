import fetch from 'node-fetch';

const OPENAI_API_KEY = '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';


/**
 * AI Agent to fix Playwright test failures
 */
export async function generateFix(error, script, dom, testData = null) {

  const prompt = `
You are a senior Playwright automation engineer.

Fix the following failing Playwright test.

IMPORTANT RULES:
- Return ONLY the corrected full JavaScript test file.
- Do NOT add explanations.
- Keep Playwright best practices.
- Ensure LoginPage usage remains intact.
- Ensure OTP handling logic is correct.
- Ensure test works with data-driven JSON input.

--------------------------------
ERROR:
${error}

--------------------------------
TEST DATA:
${testData ? JSON.stringify(testData, null, 2) : 'N/A'}

--------------------------------
SCRIPT:
${script}

--------------------------------
DOM:
${dom}

--------------------------------
OUTPUT:
Return only the fixed script.
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

  if (!data.output || !data.output[0]) {
    throw new Error('Invalid response from OpenAI API');
  }

  return data.output[0].content[0].text;
}

/**
 * Optional helper: extract page DOM for debugging
 */
export async function getPageDom(page) {
  return await page.content();
}

/**
 * Optional helper: wrap Playwright test execution with AI debugging
 */
export async function runWithAIRecovery(testFn, context) {
  try {
    await testFn();
  } catch (error) {
    console.log('Test failed, sending to AI agent...');

    const dom = context?.page ? await context.page.content() : 'NO DOM';
    const script = testFn.toString();

    const fixed = await generateFix(
      error.message,
      script,
      dom
    );

    console.log('--- FIXED SCRIPT FROM AI ---');
    console.log(fixed);

    return fixed;
  }
}

