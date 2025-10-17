import { describe, expect, it } from "bun:test";
import type { APIClient } from "ig-trading-api";
import { IgTradingConnector } from "./igTrading.ts";

const createMockClient = (mockResponse: unknown): APIClient => {
	return {
		rest: {
			account: {
				getAccounts: async () => mockResponse,
			},
		},
	} as unknown as APIClient;
};

const createErrorMockClient = (errorMessage: string): APIClient => {
	return {
		rest: {
			account: {
				getAccounts: async () => {
					throw new Error(errorMessage);
				},
			},
		},
	} as unknown as APIClient;
};

describe("IG Trading Connector", () => {
	it("should successfully retrieve balance", async () => {
		const mockClient = createMockClient({
			accounts: [
				{
					accountId: "ABC123",
					accountName: "Test Account",
					accountAlias: "Test",
					status: "ENABLED",
					accountType: "CFD",
					preferred: true,
					balance: {
						balance: 10000.5,
						deposit: 8000,
						profitLoss: 2000.5,
						available: 9500.5,
					},
					currency: "GBP",
				},
			],
		});

		const connector = new IgTradingConnector(() => mockClient);

		const result = await connector.getBalance({
			type: "ig_trading",
			name: "Test",
			ynabAccountId: "test-id",
			interval: "0 0 * * *",
			igUsername: "test-user",
			igPassword: "test-pass",
			igApiKey: "test-api-key",
			igAccountId: "ABC123",
		});

		expect("balance" in result).toBe(true);
		if ("balance" in result) {
			expect(result.balance).toBe(10000.5);
		}
	});

	it("should return error for unauthorized access (401)", async () => {
		const mockClient = createErrorMockClient("Unauthorized (401)");
		const connector = new IgTradingConnector(() => mockClient);

		const result = await connector.getBalance({
			type: "ig_trading",
			name: "Test",
			ynabAccountId: "test-id",
			interval: "0 0 * * *",
			igUsername: "wrong-user",
			igPassword: "wrong-pass",
			igApiKey: "wrong-key",
			igAccountId: "ABC123",
		});

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toBe(
				"Unauthorized: Check your IG credentials and API key.",
			);
			expect(result.canRetry).toBe(false);
		}
	});

	it("should return error for forbidden access (403)", async () => {
		const mockClient = createErrorMockClient("Forbidden (403)");
		const connector = new IgTradingConnector(() => mockClient);

		const result = await connector.getBalance({
			type: "ig_trading",
			name: "Test",
			ynabAccountId: "test-id",
			interval: "0 0 * * *",
			igUsername: "test-user",
			igPassword: "test-pass",
			igApiKey: "test-api-key",
			igAccountId: "ABC123",
		});

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toBe(
				"Forbidden: Check your IG API key permissions.",
			);
			expect(result.canRetry).toBe(false);
		}
	});

	it("should return error for rate limit exceeded (429)", async () => {
		const mockClient = createErrorMockClient("Rate limit exceeded (429)");
		const connector = new IgTradingConnector(() => mockClient);

		const result = await connector.getBalance({
			type: "ig_trading",
			name: "Test",
			ynabAccountId: "test-id",
			interval: "0 0 * * *",
			igUsername: "test-user",
			igPassword: "test-pass",
			igApiKey: "test-api-key",
			igAccountId: "ABC123",
		});

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toBe(
				"Rate limit exceeded: Too many requests to IG API.",
			);
			expect(result.canRetry).toBe(false);
		}
	});

	it("should return error for server error (500)", async () => {
		const mockClient = createErrorMockClient("Internal server error");
		const connector = new IgTradingConnector(() => mockClient);

		const result = await connector.getBalance({
			type: "ig_trading",
			name: "Test",
			ynabAccountId: "test-id",
			interval: "0 0 * * *",
			igUsername: "test-user",
			igPassword: "test-pass",
			igApiKey: "test-api-key",
			igAccountId: "ABC123",
		});

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toContain("Error fetching IG balance:");
			expect(result.canRetry).toBe(true);
		}
	});

	it("should return error when account not found", async () => {
		const mockClient = createMockClient({
			accounts: [
				{
					accountId: "ABC123",
					accountName: "Test Account",
					accountAlias: "Test",
					status: "ENABLED",
					accountType: "CFD",
					preferred: true,
					balance: {
						balance: 10000.5,
						deposit: 8000,
						profitLoss: 2000.5,
						available: 9500.5,
					},
					currency: "GBP",
				},
			],
		});

		const connector = new IgTradingConnector(() => mockClient);

		const result = await connector.getBalance({
			type: "ig_trading",
			name: "Test",
			ynabAccountId: "test-id",
			interval: "0 0 * * *",
			igUsername: "test-user",
			igPassword: "test-pass",
			igApiKey: "test-api-key",
			igAccountId: "NONEXISTENT",
		});

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toContain("Account with ID NONEXISTENT not found");
			expect(result.error).toContain("ABC123");
			expect(result.canRetry).toBe(false);
		}
	});

	it("should handle multiple accounts and select the correct one", async () => {
		const mockClient = createMockClient({
			accounts: [
				{
					accountId: "ABC123",
					accountName: "First Account",
					accountAlias: "First",
					status: "ENABLED",
					accountType: "CFD",
					preferred: false,
					balance: {
						balance: 5000,
						deposit: 5000,
						profitLoss: 0,
						available: 5000,
					},
					currency: "GBP",
				},
				{
					accountId: "XYZ789",
					accountName: "Second Account",
					accountAlias: "Second",
					status: "ENABLED",
					accountType: "SPREADBET",
					preferred: true,
					balance: {
						balance: 15000.75,
						deposit: 10000,
						profitLoss: 5000.75,
						available: 14000.75,
					},
					currency: "GBP",
				},
			],
		});

		const connector = new IgTradingConnector(() => mockClient);

		const result = await connector.getBalance({
			type: "ig_trading",
			name: "Test",
			ynabAccountId: "test-id",
			interval: "0 0 * * *",
			igUsername: "test-user",
			igPassword: "test-pass",
			igApiKey: "test-api-key",
			igAccountId: "XYZ789",
		});

		expect("balance" in result).toBe(true);
		if ("balance" in result) {
			expect(result.balance).toBe(15000.75);
		}
	});
});
