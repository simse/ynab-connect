import { getBrowser } from "../browser.ts";

const parseBalanceString = (input: string): number => {
	const m = input.match(/£\s*([\d,]+(?:\.\d+)?)/);
	if (!m) return 0;
	return parseFloat(m[1]?.replace(/,/g, "") || "0");
};

const getUkStudentLoanBalance = async (
	slcEmail: string,
	slcPassword: string,
	slcSecretAnswer: string,
): Promise<number> => {
	const browser = await getBrowser();

	const page = await browser.newPage();

	/* Journey start */
	await page.goto(
		"https://www.gov.uk/sign-in-to-manage-your-student-loan-balance",
	);

	await page.locator("text/Start now").click();

	/* Select manage student loan */
	await page.locator("#textForSignIn1").click();

	await page.locator("text/Continue").click();

	/* Enter credentials */
	await page.locator("input#userId").fill(slcEmail);

	await page.locator("input#password").fill(slcPassword);

	await page.locator("text/Continue").click();

	/* Enter secret answer */
	await page.locator("input#secretAnswer").fill(slcSecretAnswer);

	await page.locator("text/Login to account").click();

	/* Get balance */
	const balanceElement = await page.waitForSelector("#balanceId_1");
	const value = await balanceElement?.evaluate((el) => el.textContent);

	if (!value) {
		throw new Error("Could not find balance element on page");
	}

	return -1 * parseBalanceString(value);
};

export { getUkStudentLoanBalance };
