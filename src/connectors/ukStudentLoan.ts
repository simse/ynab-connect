import { getBrowser } from "../browser";
import type { BrowserAdapter } from "../browser/browserAdapter.ts";
import type { AccountResult } from "./index.ts";

const parseBalanceString = (input: string): number => {
	const m = input.match(/£\s*([\d,]+(?:\.\d+)?)/);
	if (!m) return 0;
	return parseFloat(m[1]?.replace(/,/g, "") || "0");
};

const getUkStudentLoanBalance = async (
	slcEmail: string,
	slcPassword: string,
	slcSecretAnswer: string,
	browserFactory: () => Promise<BrowserAdapter> = getBrowser,
): Promise<AccountResult> => {
	const browser = await browserFactory();

	const page = await browser.newPage();

	/* Journey start */
	try {
		await page.goto(
			"https://www.gov.uk/sign-in-to-manage-your-student-loan-balance",
		);
	} catch {
		return {
			error: "Could not reach UK Student Loan page",
			canRetry: true,
		};
	}

	try {
		await page.locator("text/Start now").click();
	} catch {
		return {
			error: "Could not find Start Now button on UK Student Loan page",
			canRetry: true,
		};
	}

	/* Select manage student loan */
	try {
		await page.locator("#textForSignIn1").click();

		await page.locator("text/Continue").click();
	} catch {
		return {
			error:
				"Could not find manage student loan option on UK Student Loan page",
			canRetry: true,
		};
	}

	/* Enter credentials */
	try {
		await page.locator("input#userId").fill(slcEmail);

		await page.locator("input#password").fill(slcPassword);

		await page.locator("text/Continue").click();
	} catch {
		return {
			error: "Could not enter email or password on UK Student Loan page",
			canRetry: true,
		};
	}

	/* Enter secret answer */
	try {
		await page.locator("input#secretAnswer").fill(slcSecretAnswer);

		await page.locator("text/Login to account").click();
	} catch {
		return {
			error: "Could not enter secret answer on UK Student Loan page",
			canRetry: true,
		};
	}

	/* Get balance */
	const balanceElement = await page.waitForSelector("#balanceId_1");
	const value = await balanceElement?.evaluate((el) => el.textContent);

	if (!value) {
		return {
			error: "Could not find balance element on UK Student Loan page",
			canRetry: false,
		};
	}

	return {
		balance: -1 * parseBalanceString(value),
	};
};

export { getUkStudentLoanBalance, parseBalanceString };
