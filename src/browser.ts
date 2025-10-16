import puppeteer from "puppeteer";
import config from "./config.ts";

export const isBrowserAvailable = async () => {
	try {
		const browser = await getBrowser();
		await browser.close();

		return true;
	} catch {
		return false;
	}
};

export const getBrowser = async () => {
	const endpoint = config.browser?.endpoint;
	const isProduction = Bun.env.NODE_ENV === "production";

	// In non-production environments without an endpoint, launch a headful browser
	if (!isProduction && !endpoint) {
		return puppeteer.launch({
			headless: false,
		});
	}

	// In production or when an endpoint is configured, connect to the endpoint
	if (!endpoint) {
		throw new Error("Browser endpoint is not configured");
	}

	return puppeteer.connect({
		browserWSEndpoint: endpoint,
	});
};
