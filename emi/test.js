const { test, expect } = require('@playwright/test');

test('check Google title', async ({ page }) => {
  await page.goto('https://google.com');

  const title = await page.title();
  console.log('Title:', title);

  await expect(page).toHaveTitle('Google');
});
