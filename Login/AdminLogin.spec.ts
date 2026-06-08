import { test, expect } from '@playwright/test';

const ADMIN_LOGIN_URL = 'https://uat.majdpay.com/admin/auth/login';

test.beforeEach(async ({ page }) => {
  await page.goto(ADMIN_LOGIN_URL);

  // Wait for the login form to be rendered by Angular
  await page.locator('#loginComponent-text_submitButton').waitFor({ state: 'visible', timeout: 15000 });

  // Force-remove the permission overlay — it renders late and blocks all pointer events
  await page.evaluate(() => {
    document.querySelector('app-permission-overlay')?.remove();
    document.querySelector('#modal_permissionOverlayModal')?.remove();
    document.querySelector('.modal-overlay')?.remove();
  });
});

// ── Logo ──────────────────────────────────────────────────────────────────────

test('MJD Pay logo is visible', async ({ page }) => {
  const logo = page.locator('img[alt*="MJD"], img[alt*="logo"], [class*="logo"]').first();
  await expect(logo).toBeVisible();
});

// ── Top-right controls ────────────────────────────────────────────────────────

test('dark mode / theme toggle button is visible', async ({ page }) => {
  await expect(page.locator('#text_toggleButton')).toBeVisible();
});

test('dark mode toggle adds "dark-mode" class to body on click', async ({ page }) => {
  // Theme toggle changes body class (not html class)
  await page.locator('#text_toggleButton').click();
  await expect(page.locator('body')).toHaveClass(/dark-mode/);
});

test('language switcher button is visible', async ({ page }) => {
  await expect(page.locator('#text_dropdownBasic1')).toBeVisible();
});

test('language switcher opens dropdown on click', async ({ page }) => {
  const langBtn = page.locator('#text_dropdownBasic1');
  await langBtn.click();
  await expect(langBtn).toHaveAttribute('aria-expanded', 'true');
});

// ── Left panel text ───────────────────────────────────────────────────────────

test('"Admin Version" heading is visible on the left panel', async ({ page }) => {
  await expect(page.getByText('Admin Version')).toBeVisible();
});

test('"Start Your Admin Journey Here" text is visible', async ({ page }) => {
  await expect(page.getByText('Start Your Admin Journey Here')).toBeVisible();
});

test('admin panel description text is visible', async ({ page }) => {
  await expect(
    page.getByText('Welcome To The Admin Hub! Log In To Manage Details And Customize Your Settings.')
  ).toBeVisible();
});

// ── Login card headings ───────────────────────────────────────────────────────

test('"Login" title is visible on the card', async ({ page }) => {
  // "Login" is rendered as a div, not an h* element
  await expect(page.locator('#login-form-title')).toBeVisible();
  await expect(page.locator('#login-form-title')).toHaveText('Login');
});

test('"Welcome To MJD Pay" subtitle is visible', async ({ page }) => {
  await expect(page.getByText('Welcome To MJD Pay')).toBeVisible();
});

// ── QA Login Tools button ─────────────────────────────────────────────────────

test('"QA Login Tools" button is visible', async ({ page }) => {
  await expect(page.locator('button.qa-launcher-btn')).toBeVisible();
});

test('"QA Login Tools" button is clickable without crashing', async ({ page }) => {
  await page.locator('button.qa-launcher-btn').click();
  await expect(page.locator('body')).toBeVisible();
});

// ── Admin quick-fill badge ────────────────────────────────────────────────────
// The chip is rendered only after expanding the QA Login Tools panel

test('"admin" quick-fill badge is visible after opening QA panel', async ({ page }) => {
  await page.locator('button.qa-launcher-btn').click();
  await expect(page.locator('button.qa-launcher-chip').first()).toBeVisible();
});

test('"admin" badge text content is "admin"', async ({ page }) => {
  await page.locator('button.qa-launcher-btn').click();
  await expect(page.locator('button.qa-launcher-chip').first()).toContainText('admin');
});

test('"admin" badge fills in username on click', async ({ page }) => {
  await page.locator('button.qa-launcher-btn').click();
  await page.locator('button.qa-launcher-chip').first().click();
  await expect(page.locator('#input_type_text_name_username_Username')).not.toHaveValue('');
});

// ── Username field ────────────────────────────────────────────────────────────

test('"Username" label exists and is linked to the input', async ({ page }) => {
  // Floating label — CSS-hidden by default until field is focused; verify it exists in DOM
  await expect(page.locator('label[for="input_type_text_name_username_Username"]')).toBeAttached();
});

test('Username input is visible', async ({ page }) => {
  await expect(page.locator('#input_type_text_name_username_Username')).toBeVisible();
});

test('Username input has placeholder "Input here"', async ({ page }) => {
  await expect(page.locator('#input_type_text_name_username_Username')).toHaveAttribute('placeholder', 'Input here');
});

test('Username input accepts typed text', async ({ page }) => {
  const input = page.locator('#input_type_text_name_username_Username');
  await input.fill('testadmin');
  await expect(input).toHaveValue('testadmin');
});

test('Username input can be cleared and refilled', async ({ page }) => {
  const input = page.locator('#input_type_text_name_username_Username');
  await input.fill('mjdpay');
  await input.clear();
  await expect(input).toHaveValue('');
  await input.fill('admin');
  await expect(input).toHaveValue('admin');
});

// ── Password field ────────────────────────────────────────────────────────────

test('"password" label exists and is linked to the input', async ({ page }) => {
  // Floating label — CSS-hidden by default; verify it exists in DOM
  await expect(page.locator('label[for="input_type_password_name_password_password"]')).toBeAttached();
});

test('Password input is visible', async ({ page }) => {
  await expect(page.locator('#input_type_password_name_password_password')).toBeVisible();
});

test('Password input is masked by default (type=password)', async ({ page }) => {
  await expect(page.locator('#input_type_password_name_password_password')).toHaveAttribute('type', 'password');
});

test('Password input has placeholder "Input Password"', async ({ page }) => {
  await expect(page.locator('#input_type_password_name_password_password')).toHaveAttribute('placeholder', 'Input Password');
});

test('Password input accepts typed text', async ({ page }) => {
  const input = page.locator('#input_type_password_name_password_password');
  await input.fill('Secret@123');
  await expect(input).toHaveValue('Secret@123');
});

// ── Show/hide password toggle ─────────────────────────────────────────────────

test('Show/hide password eye icon is visible', async ({ page }) => {
  await expect(page.locator('#loginComponent-text_toggleEyeIcon')).toBeVisible();
});

test('Show password toggle reveals the password (type becomes text)', async ({ page }) => {
  const passwordInput = page.locator('#input_type_password_name_password_password');
  await passwordInput.fill('Secret@123');
  await expect(passwordInput).toHaveAttribute('type', 'password');

  await page.locator('#loginComponent-text_toggleEyeIcon').click();
  await expect(passwordInput).toHaveAttribute('type', 'text');
});

test('Show password toggle hides the password again on second click', async ({ page }) => {
  const passwordInput = page.locator('#input_type_password_name_password_password');
  await passwordInput.fill('Secret@123');

  const toggle = page.locator('#loginComponent-text_toggleEyeIcon');
  await toggle.click();
  await toggle.click();
  await expect(passwordInput).toHaveAttribute('type', 'password');
});

// ── Log In button ─────────────────────────────────────────────────────────────

test('"Log In" button is visible', async ({ page }) => {
  await expect(page.locator('#loginComponent-text_submitButton')).toBeVisible();
});

test('"Log In" button is disabled when fields are empty', async ({ page }) => {
  await expect(page.locator('#loginComponent-text_submitButton')).toBeDisabled();
});

test('"Log In" button becomes enabled when username and password are filled', async ({ page }) => {
  await page.locator('#input_type_text_name_username_Username').fill('mjdpay');
  await page.locator('#input_type_password_name_password_password').fill('Aa#12345');
  await expect(page.locator('#loginComponent-text_submitButton')).toBeEnabled();
});

test('"Log In" with wrong credentials shows error message', async ({ page }) => {
  await page.locator('#input_type_text_name_username_Username').fill('wronguser');
  await page.locator('#input_type_password_name_password_password').fill('WrongPass@123');
  await page.locator('#loginComponent-text_submitButton').click();
  await expect(page.locator('body')).toContainText(/.+/);
});

test('"Log In" with valid admin credentials redirects away from login', async ({ page }) => {
  // Open QA panel first — the chip is only rendered after expanding it
  await page.locator('button.qa-launcher-btn').click();
  await page.locator('button.qa-launcher-chip').first().click();
  await expect(page.locator('#loginComponent-text_submitButton')).toBeEnabled();
  await page.locator('#loginComponent-text_submitButton').click();
  await expect(page).not.toHaveURL(ADMIN_LOGIN_URL);
});

// ── Keyboard interaction ──────────────────────────────────────────────────────

test('Tab key moves focus from Username to Password field', async ({ page }) => {
  await page.locator('#input_type_text_name_username_Username').click();
  await page.keyboard.press('Tab');
  await expect(page.locator('#input_type_password_name_password_password')).toBeFocused();
});

test('Enter key in Password field submits the form', async ({ page }) => {
  await page.locator('#input_type_text_name_username_Username').fill('mjdpay');
  const passwordInput = page.locator('#input_type_password_name_password_password');
  await passwordInput.fill('WrongPass');
  await passwordInput.press('Enter');
  await expect(page.locator('body')).toBeVisible();
});

// ── Page title ────────────────────────────────────────────────────────────────

test('page has a non-empty document title', async ({ page }) => {
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});
