import puppeteer from "puppeteer-core";
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

	if (!endpoint) {
		throw new Error("Browser endpoint is not configured");
	}

	return puppeteer.connect({
		browserWSEndpoint: endpoint,
	});
};
