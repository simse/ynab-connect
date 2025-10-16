import { await2FACode } from "../2fa.ts";
import { getBrowser } from "../browser.ts";
import type config from "../config.ts";
import type { AccountResult, Connector } from "./index.ts";

type AccountType = (typeof config.accounts)[number];

const STANDARD_LIFE_PENSION_AUTH_URL =
	"https://online.standardlife.com/secure/customer-authentication-client/customer/login";
const STANDARD_LIFE_DASHBOARD_URL =
	"https://platform.secure.standardlife.co.uk/secure/customer-platform/dashboard";
const STANDARD_LIFE_PENSION_POLICY_URL =
	"https://platform.secure.standardlife.co.uk/secure/customer-platform/pension/details?policy=";

const parseBalanceString = (input: string): number => {
	const m = input.match(/£\s*([\d,]+(?:\.\d+)?)/);
	if (!m) return 0;
	return parseFloat(m[1]?.replace(/,/g, "") || "0");
};

class StandardLifePensionConnector implements Connector {
	friendlyName = "Standard Life Pension";

	async getBalance(account: AccountType): Promise<AccountResult> {
		if (account.type !== "standard_life_pension") {
			throw new Error(
				"Invalid account type for Standard Life Pension connector",
			);
		}

		// get a browser instance
		const browser = await getBrowser();

		// sign in
		const page = await browser.newPage();
		await page.goto(STANDARD_LIFE_PENSION_AUTH_URL);
		await page.type("#userid", account.username);
		await page.type("#password", account.password);
		await page.click("#submit");

		// wait for 2FA code
		const twoFactorCode = await await2FACode("standard-life-uk", 15000).catch(
			() => null,
		);

		// if we didn't get a 2FA code, check if we are already logged in
		if (!twoFactorCode) {
			await page.waitForNetworkIdle();
			const pageUrl = page.url();

			if (pageUrl !== STANDARD_LIFE_DASHBOARD_URL) {
				await page.close();

				return {
					error: "2FA code required but not received in time",
					canRetry: true,
				};
			}
		}

		// enter 2FA code if we have one
		if (twoFactorCode) {
			await page.type("#OTPcode", twoFactorCode);
			await page.click("#trustDevice");
			await page.click("#verifyCode");

			// wait for navigation to dashboard
			await page.waitForNetworkIdle();
		}

		// go to policy page
		await page.goto(
			`${STANDARD_LIFE_PENSION_POLICY_URL}${account.policyNumber}`,
		);

		// get balance from class
		const balanceText = await page.waitForSelector(".we_hud-plan-value-amount");
		const value = await balanceText?.evaluate((el) => el.textContent);

		if (!value) {
			await page.close();
			return {
				error: "Could not find balance element on page",
				canRetry: true,
			};
		}

		const balance = parseBalanceString(value);

		await page.close();

		return {
			balance,
		};
	}
}

export const standardLifePensionConnector = new StandardLifePensionConnector();
