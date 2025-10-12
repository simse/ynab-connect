import puppeteer from "puppeteer-core";
import config from "./config.ts";

export const checkConnection = async () => {
	await getBrowser();
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
