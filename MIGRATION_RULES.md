# Playwright TypeScript Migration Rules & Skills

Use the rules defined in this document whenever I provide a legacy Selenium Java Page Object or Test Class. Your goal is to scan the Java code, apply these transformation skills, and output production-ready Playwright TypeScript code.

## 1. Core Architectural Mapping
- **Language**: Convert Java to strictly typed TypeScript.
- **Framework**: Convert Selenium/TestNG to `@playwright/test`.
- **Pattern**: Maintain the Page Object Model (POM) approach. 
- **Async Handling**: Every method and locator interaction must use `async/await`. Rely on Playwright's auto-waiting.

## 2. Element & Locator Mapping Skills
When migrating elements, transform them as follows:
- `@FindBy(id = "elementId") WebElement element;` ➔ `readonly element = this.page.locator('#elementId');`
- `@FindBy(xpath = "//button[...] ")` ➔ Use Playwright's user-facing locators where possible (e.g., `this.page.getByRole('button', { name: '...' })`) or standard CSS/XPath locators if complex.
- Convert `element.sendKeys("text")` ➔ `await this.element.fill("text")`
- Convert `element.click()` ➔ `await this.element.click()`

## 3. Financial & EMI Platform Rules (MajdPay Core Context)
The target system is an electronic wallet (EMI). When rewriting business logic or assertions, ensure the following skills are reflected:
- **OTP Handling**: If the Java code references receiving an OTP, map it to our TypeScript MongoDB utility (`dbUtil.getOTP(mobileNumber)`).
- **Database Assertions**: If the test contains assertions, add post-action hooks or methods to perform DB integrity checks (e.g., verifying running ledger balances, checking transaction status, and tracking failure reasons if an operation fails).
- **Idempotency**: Ensure that critical financial requests (like transfers or service purchases) utilize and validate `idempotencyKey` properties where applicable.

## 4. Expected Output Format
For every Java file provided, you must output:
1. **The Migrated File**: The complete TypeScript file (`.ts`) adhering to the rules above.
2. **TypeScript Explanation**: A brief summary highlighting key differences for a developer learning TypeScript (e.g., explaining `interface`, `constructor(private page: Page)`, or `async/await`).
3. **Extracted Skill Snippet**: A short YAML or Markdown block defining the "Skill" used for this specific page, so it can eventually be added to our main `SKILL.md` or `AGENTS.md` files.