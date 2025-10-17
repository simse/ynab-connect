import puppeteer from "puppeteer";
import { getConfig } from "../config.ts";
import type { BrowserAdapter } from "./browserAdapter.ts";
import { PuppeteerAdapter } from "./puppeteerAdapter.ts";

export const getBrowser = async (): Promise<BrowserAdapter> => {
	const config = await getConfig();
	const endpoint = config.browser?.endpoint;
	const isProduction = Bun.env.NODE_ENV === "production";

	// In non-production environments without an endpoint, launch a headful browser
	if (!isProduction && !endpoint) {
		const browser = await puppeteer.launch({
			headless: false,
		});
		return new PuppeteerAdapter(browser);
	}

	// In production or when an endpoint is configured, connect to the endpoint
	if (!endpoint) {
		throw new Error("Browser endpoint is not configured");
	}

	const browser = await puppeteer.connect({
		browserWSEndpoint: endpoint,
	});
	return new PuppeteerAdapter(browser);
};
