/**
 * Abstraction layer for browser automation that makes testing easier.
 *
 * This provides interfaces that can be implemented by both real browser
 * instances (via Puppeteer) and mock implementations for testing.
 */

/**
 * Represents a selector result that can be evaluated
 */
export interface SelectorResult {
	evaluate(fn: (el: Element) => string | null): Promise<string | null>;
}

/**
 * Represents a locator for interacting with elements
 */
export interface Locator {
	click(): Promise<void>;
	fill(text: string): Promise<void>;
}

/**
 * Represents a browser page with methods for automation
 */
export interface PageAdapter {
	goto(url: string): Promise<void>;
	type(selector: string, text: string): Promise<void>;
	click(selector: string): Promise<void>;
	locator(selector: string): Locator;
	waitForSelector(selector: string): Promise<SelectorResult | null>;
	waitForNetworkIdle(): Promise<void>;
	url(): string;
	close(): Promise<void>;
}

/**
 * Represents a browser instance
 */
export interface BrowserAdapter {
	newPage(): Promise<PageAdapter>;
	close(): Promise<void>;
}
