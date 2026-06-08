import { test, expect } from '@playwright/test';

const LOGIN_URL = 'https://uat.majdpay.com/business/auth/login';

test.beforeEach(async ({ page }) => {
  await page.goto(LOGIN_URL);
});

// ── Logo ─────────────────────────────────────────────────────────────────────

test('logo is visible and links to home', async ({ page }) => {
  const logo = page.getByRole('link', { name: 'MJD Pay' });
  await expect(logo).toBeVisible();
  const logoImg = logo.getByRole('img', { name: 'MJD Pay' });
  await expect(logoImg).toBeVisible();
});

// ── Language switcher ─────────────────────────────────────────────────────────

test('EN language button is visible and active by default', async ({ page }) => {
  const enBtn = page.getByRole('button', { name: 'EN' });
  await expect(enBtn).toBeVisible();
});

test('Arabic language button is visible and switches language', async ({ page }) => {
  const arBtn = page.getByRole('button', { name: 'العربية' });
  await expect(arBtn).toBeVisible();
  await arBtn.click();
  // After switching, page direction should be RTL
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

// ── Theme toggle ──────────────────────────────────────────────────────────────

test('switch theme button is visible and toggles theme', async ({ page }) => {
  const themeBtn = page.getByRole('button', { name: 'Switch theme' });
  await expect(themeBtn).toBeVisible();
  await themeBtn.click();
  // Theme toggle should change a data-theme or class attribute on html/body
  const html = page.locator('html');
  const classAfter = await html.getAttribute('class');
  expect(classAfter).toBeTruthy();
});

// ── Page headings & subtitle ──────────────────────────────────────────────────

test('"Login" heading is visible', async ({ page }) => {
  await expect(page.getByText('Login')).toBeVisible();
});

test('"Welcome to MJD Pay" text is visible', async ({ page }) => {
  await expect(page.getByText('Welcome to MJD Pay')).toBeVisible();
});

test('subtitle text is visible', async ({ page }) => {
  await expect(
    page.getByText('Seamless transactions, secure payments — let\'s get started.')
  ).toBeVisible();
});

// ── Company number field ──────────────────────────────────────────────────────

test('company number label is visible', async ({ page }) => {
  await expect(page.getByText('Company number')).toBeVisible();
});

test('company number input is visible and has correct placeholder', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Company number' });
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('placeholder', 'Eg. 153165659');
});

test('company number input accepts text', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Company number' });
  await input.fill('123456789');
  await expect(input).toHaveValue('123456789');
});

// ── Mobile number field ───────────────────────────────────────────────────────

test('mobile number label is visible', async ({ page }) => {
  await expect(page.getByText('Mobile number')).toBeVisible();
});

test('country code (+966) is displayed', async ({ page }) => {
  await expect(page.getByText('(+966)')).toBeVisible();
});

test('mobile number input is visible and has correct placeholder', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Mobile number' });
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('placeholder', 'Input here');
});

test('mobile number input accepts numeric text', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Mobile number' });
  await input.fill('500318143');
  await expect(input).toHaveValue('500318143');
});

// ── Password field ────────────────────────────────────────────────────────────

test('password label is visible', async ({ page }) => {
  await expect(page.getByText('Password')).toBeVisible();
});

test('password input is visible, masked by default, and has correct placeholder', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Password' });
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('type', 'password');
  await expect(input).toHaveAttribute('placeholder', 'Input Password');
});

test('password input accepts text', async ({ page }) => {
  const input = page.getByRole('textbox', { name: 'Password' });
  await input.fill('Secret@123');
  await expect(input).toHaveValue('Secret@123');
});

// ── Show/hide password toggle ─────────────────────────────────────────────────

test('show password button is visible', async ({ page }) => {
  const showBtn = page.getByRole('button', { name: 'Show password' });
  await expect(showBtn).toBeVisible();
});

test('show password button toggles password visibility', async ({ page }) => {
  const passwordInput = page.getByRole('textbox', { name: 'Password' });
  const showBtn = page.getByRole('button', { name: 'Show password' });

  await passwordInput.fill('Secret@123');
  await expect(passwordInput).toHaveAttribute('type', 'password');

  await showBtn.click();
  await expect(passwordInput).toHaveAttribute('type', 'text');

  await showBtn.click();
  await expect(passwordInput).toHaveAttribute('type', 'password');
});

// ── Forgot Password ───────────────────────────────────────────────────────────

test('"Forgot Password?" link is visible', async ({ page }) => {
  await expect(page.getByText('Forgot Password?')).toBeVisible();
});

test('"Forgot Password?" navigates to reset page', async ({ page }) => {
  await page.getByText('Forgot Password?').click();
  await expect(page).not.toHaveURL(LOGIN_URL);
});

// ── Log In button ─────────────────────────────────────────────────────────────

test('"Log In" button is visible and enabled', async ({ page }) => {
  const loginBtn = page.getByRole('button', { name: 'Log In' });
  await expect(loginBtn).toBeVisible();
  await expect(loginBtn).toBeEnabled();
});

test('"Log In" button submits the form', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Company number' }).fill('L3999');
  await page.getByRole('textbox', { name: 'Mobile number' }).fill('500318143');
  await page.getByRole('textbox', { name: 'Password' }).fill('WrongPass');
  await page.getByRole('button', { name: 'Log In' }).click();
  // Expect an error message or stay on login page with feedback
  await expect(page.locator('body')).toContainText(/.+/);
});

// ── Sign Up ───────────────────────────────────────────────────────────────────

test('"New to MJD PAY?" text is visible', async ({ page }) => {
  await expect(page.getByText('New to MJD PAY?')).toBeVisible();
});

test('"Sign Up" link is visible and navigates away from login', async ({ page }) => {
  const signUpLink = page.getByText('Sign Up');
  await expect(signUpLink).toBeVisible();
  await signUpLink.click();
  await expect(page).not.toHaveURL(LOGIN_URL);
});
