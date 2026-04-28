import fetch from 'node-fetch';

const OPENAI_API_KEY = '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';

export async function generateFix(error, script, dom) {

  const prompt = `
You are a senior Playwright automation engineer.

Fix this failing test.

RULES:
- Return ONLY JavaScript code
- No explanations
- Must work with Playwright
- Must use "page" object
- Do not remove test logic unless necessary

ERROR:
${error}

SCRIPT:
${script}

DOM:
${dom}
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