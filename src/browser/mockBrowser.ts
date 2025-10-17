import type {
	BrowserAdapter,
	Locator,
	PageAdapter,
	SelectorResult,
} from "./browserAdapter.ts";

/**
 * Configuration for a mock page scenario
 */
export interface MockPageScenario {
	/**
	 * Mock values to return when waitForSelector is called.
	 * Key is the selector, value is the text content to return.
	 */
	selectorValues?: Record<string, string>;

	/**
	 * Mock URLs to return for page.url() calls.
	 * Updated as goto() is called or can be set explicitly.
	 */
	currentUrl?: string;

	/**
	 * Track interactions for verification in tests
	 */
	interactions?: Array<{
		type: string;
		selector?: string;
		value?: string;
		url?: string;
	}>;

	/**
	 * Whether to throw errors for specific selectors
	 */
	selectorErrors?: Record<string, Error>;

	/**
	 * URL transitions to simulate after specific actions
	 * Allows tests to simulate page navigation after interactions
	 */
	urlTransitions?: Array<{
		trigger: {
			type: string;
			selector?: string;
			url?: string;
		};
		newUrl: string;
	}>;
}

/**
 * Mock selector result for testing
 */
class MockSelectorResult implements SelectorResult {
	constructor(private value: string) {}

	async evaluate(_fn: (el: Element) => string | null): Promise<string | null> {
		return this.value;
	}
}

/**
 * Mock locator for testing
 */
class MockLocator implements Locator {
	constructor(
		private selector: string,
		private scenario: MockPageScenario,
	) {}

	async click(): Promise<void> {
		this.scenario.interactions?.push({
			type: "locator.click",
			selector: this.selector,
		});

		// Check for URL transitions
		const transition = this.scenario.urlTransitions?.find(
			(t) =>
				t.trigger.type === "locator.click" &&
				t.trigger.selector === this.selector,
		);
		if (transition) {
			this.scenario.currentUrl = transition.newUrl;
		}
	}

	async fill(text: string): Promise<void> {
		this.scenario.interactions?.push({
			type: "locator.fill",
			selector: this.selector,
			value: text,
		});
	}
}

/**
 * Mock page adapter for testing
 */
class MockPageAdapter implements PageAdapter {
	constructor(private scenario: MockPageScenario) {}

	async goto(url: string): Promise<void> {
		this.scenario.interactions?.push({ type: "goto", url });

		// Check for URL transitions
		const transition = this.scenario.urlTransitions?.find(
			(t) => t.trigger.type === "goto" && t.trigger.url === url,
		);
		if (transition) {
			this.scenario.currentUrl = transition.newUrl;
		} else {
			this.scenario.currentUrl = url;
		}
	}

	async type(selector: string, text: string): Promise<void> {
		this.scenario.interactions?.push({ type: "type", selector, value: text });
	}

	async click(selector: string): Promise<void> {
		this.scenario.interactions?.push({ type: "click", selector });

		// Check for URL transitions
		const transition = this.scenario.urlTransitions?.find(
			(t) => t.trigger.type === "click" && t.trigger.selector === selector,
		);
		if (transition) {
			this.scenario.currentUrl = transition.newUrl;
		}
	}

	locator(selector: string): Locator {
		return new MockLocator(selector, this.scenario);
	}

	async waitForSelector(selector: string): Promise<SelectorResult | null> {
		// Check if we should throw an error for this selector
		if (this.scenario.selectorErrors?.[selector]) {
			throw this.scenario.selectorErrors[selector];
		}

		// Return mock value if configured
		const value = this.scenario.selectorValues?.[selector];
		if (value !== undefined) {
			return new MockSelectorResult(value);
		}

		return null;
	}

	async waitForNetworkIdle(): Promise<void> {
		this.scenario.interactions?.push({ type: "waitForNetworkIdle" });
	}

	url(): string {
		return this.scenario.currentUrl || "about:blank";
	}

	async close(): Promise<void> {
		this.scenario.interactions?.push({ type: "close" });
	}
}

/**
 * Mock browser adapter for testing
 */
export class MockBrowserAdapter implements BrowserAdapter {
	constructor(private scenario: MockPageScenario) {}

	async newPage(): Promise<PageAdapter> {
		return new MockPageAdapter(this.scenario);
	}

	async close(): Promise<void> {
		this.scenario.interactions?.push({ type: "browser.close" });
	}
}

/**
 * Helper function to create a mock browser for testing
 */
export function createMockBrowser(
	scenario: MockPageScenario = {},
): BrowserAdapter {
	// Initialize interactions array if not provided
	if (!scenario.interactions) {
		scenario.interactions = [];
	}
	return new MockBrowserAdapter(scenario);
}
