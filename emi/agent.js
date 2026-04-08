import fetch from 'node-fetch';

const OPENAI_API_KEY = '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';

export async function generateFix(error, script, dom) {
  const prompt = `
  Fix this Playwright test.

  Error:
  ${error}

  Script:
  ${script}

  DOM:
  ${dom}

  Return updated script only.
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
  return data.output[0].content[0].text;
}
