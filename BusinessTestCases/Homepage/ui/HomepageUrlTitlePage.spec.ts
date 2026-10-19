import { test, expect, Page } from '../helpers/HomepageFixtures.ts';
import { HOME_URL_PATTERN, refreshHomepage } from '../helpers/HomePageHelper.ts';

test.describe('Homepage – Page Elements – URL & title', () => {
    test.describe.configure({ mode: 'serial' });

    let page: Page;

    test.beforeEach(async ({ homepagePage }) => {
        page = homepagePage;
        await refreshHomepage(page);
    });

    test('should redirect to homepage after successful login', async () => {
        await expect(page).toHaveURL(HOME_URL_PATTERN);
    });

    test('should have the correct page title', async () => {
        await expect(page).toHaveTitle('EMI - Business');
    });
});
