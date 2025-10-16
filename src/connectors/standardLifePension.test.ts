import { describe, expect, it } from "bun:test";
import {
	createMockBrowser,
	type MockPageScenario,
} from "../browser/mockBrowser.ts";
import { StandardLifePensionConnector } from "./standardLifePension.ts";

describe("Standard Life Pension Connector", () => {
	it("should successfully retrieve balance when no 2FA is required", async () => {
		// Create a mock browser that simulates a successful login without 2FA
		const mockScenario: MockPageScenario = {
			currentUrl: "about:blank",
			selectorValues: {
				".we_hud-plan-value-amount": "£45,678.90",
			},
			interactions: [],
			urlTransitions: [
				{
					trigger: { type: "click", selector: "#submit" },
					newUrl:
						"https://platform.secure.standardlife.co.uk/secure/customer-platform/dashboard",
				},
			],
		};

		const mockBrowser = createMockBrowser(mockScenario);

		// Create connector with mock browser
		const connector = new StandardLifePensionConnector(async () => mockBrowser);

		// Test account
		const account = {
			type: "standard_life_pension" as const,
			username: "test@example.com",
			password: "testpassword",
			policyNumber: "12345",
			name: "Test Pension",
			ynabAccountId: "test-account-id",
			interval: "0 0 * * *",
		};

		const result = await connector.getBalance(account);

		// Verify the result
		expect("balance" in result).toBe(true);
		if ("balance" in result) {
			expect(result.balance).toBe(45678.9);
		}

		// Verify interactions happened in correct order
		expect(mockScenario.interactions).toContainEqual({
			type: "goto",
			url: "https://online.standardlife.com/secure/customer-authentication-client/customer/login",
		});
		expect(mockScenario.interactions).toContainEqual({
			type: "type",
			selector: "#userid",
			value: "test@example.com",
		});
		expect(mockScenario.interactions).toContainEqual({
			type: "type",
			selector: "#password",
			value: "testpassword",
		});
		expect(mockScenario.interactions).toContainEqual({
			type: "click",
			selector: "#submit",
		});
	});

	it("should return error when balance element is not found", async () => {
		const mockScenario: MockPageScenario = {
			currentUrl: "about:blank",
			selectorValues: {},
			interactions: [],
			urlTransitions: [
				{
					trigger: { type: "click", selector: "#submit" },
					newUrl:
						"https://platform.secure.standardlife.co.uk/secure/customer-platform/dashboard",
				},
			],
		};

		const mockBrowser = createMockBrowser(mockScenario);

		const connector = new StandardLifePensionConnector(async () => mockBrowser);

		const account = {
			type: "standard_life_pension" as const,
			username: "test@example.com",
			password: "testpassword",
			policyNumber: "12345",
			name: "Test Pension",
			ynabAccountId: "test-account-id",
			interval: "0 0 * * *",
		};

		const result = await connector.getBalance(account);

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toBe("Could not find balance element on page");
			expect(result.canRetry).toBe(true);
		}
	});

	it("should throw error for invalid account type", async () => {
		const mockBrowser = createMockBrowser({});

		const connector = new StandardLifePensionConnector(async () => mockBrowser);

		const account = {
			type: "trading_212",
			trading212ApiKey: "test",
			trading212SecretKey: "test",
		} as const;

		// @ts-expect-error - Testing invalid account type
		await expect(connector.getBalance(account)).rejects.toThrow(
			"Invalid account type for Standard Life Pension connector",
		);
	});

	it("should parse various balance formats correctly", async () => {
		const testCases = [
			{ input: "£45,678.90", expected: 45678.9 },
			{ input: "£1,234.56", expected: 1234.56 },
			{ input: "£100", expected: 100 },
			{ input: "£1,000,000.00", expected: 1000000 },
		];

		for (const testCase of testCases) {
			const mockScenario: MockPageScenario = {
				currentUrl: "about:blank",
				selectorValues: {
					".we_hud-plan-value-amount": testCase.input,
				},
				interactions: [],
				urlTransitions: [
					{
						trigger: { type: "click", selector: "#submit" },
						newUrl:
							"https://platform.secure.standardlife.co.uk/secure/customer-platform/dashboard",
					},
				],
			};

			const mockBrowser = createMockBrowser(mockScenario);

			const connector = new StandardLifePensionConnector(
				async () => mockBrowser,
			);

			const account = {
				type: "standard_life_pension" as const,
				username: "test@example.com",
				password: "testpassword",
				policyNumber: "12345",
				name: "Test Pension",
				ynabAccountId: "test-account-id",
				interval: "0 0 * * *",
			};

			const result = await connector.getBalance(account);

			expect("balance" in result).toBe(true);
			if ("balance" in result) {
				expect(result.balance).toBe(testCase.expected);
			}
		}
	});
});
