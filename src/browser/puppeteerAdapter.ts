import type {
	Browser,
	ElementHandle,
	Page,
	Locator as PuppeteerLocatorType,
} from "puppeteer";
import type {
	BrowserAdapter,
	Locator,
	PageAdapter,
	SelectorResult,
} from "./browserAdapter.ts";

/**
 * Wraps a Puppeteer element handle to provide evaluate functionality
 */
class PuppeteerSelectorResult implements SelectorResult {
	constructor(private element: ElementHandle<Element>) {}

	async evaluate(fn: (el: Element) => string | null): Promise<string | null> {
		return this.element.evaluate(fn);
	}
}

/**
 * Wraps Puppeteer locator functionality
 */
class PuppeteerLocator implements Locator {
	constructor(private locator: PuppeteerLocatorType<Element>) {}

	async click(): Promise<void> {
		await this.locator.click();
	}

	async fill(text: string): Promise<void> {
		await this.locator.fill(text);
	}
}

/**
 * Wraps a Puppeteer Page to implement PageAdapter interface
 */
class PuppeteerPageAdapter implements PageAdapter {
	constructor(private page: Page) {}

	async goto(url: string): Promise<void> {
		await this.page.goto(url);
	}

	async type(selector: string, text: string): Promise<void> {
		await this.page.type(selector, text);
	}

	async click(selector: string): Promise<void> {
		await this.page.click(selector);
	}

	locator(selector: string): Locator {
		const locator = this.page.locator(selector);
		return new PuppeteerLocator(locator);
	}

	async waitForSelector(selector: string): Promise<SelectorResult | null> {
		const element = await this.page.waitForSelector(selector);
		if (!element) return null;
		return new PuppeteerSelectorResult(element);
	}

	async waitForNetworkIdle(): Promise<void> {
		await this.page.waitForNetworkIdle();
	}

	url(): string {
		return this.page.url();
	}

	async close(): Promise<void> {
		await this.page.close();
	}
}

/**
 * Wraps a Puppeteer Browser to implement BrowserAdapter interface
 */
export class PuppeteerAdapter implements BrowserAdapter {
	constructor(private browser: Browser) {}

	async newPage(): Promise<PageAdapter> {
		const page = await this.browser.newPage();
		return new PuppeteerPageAdapter(page);
	}

	async close(): Promise<void> {
		await this.browser.close();
	}
}
