import { Page } from '@playwright/test';

export class CreateSingleBillPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }
}
