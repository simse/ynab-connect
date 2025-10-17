import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { setupServer } from "msw/node";
import { createTrading212Handlers } from "./trading212.mock.ts";
import { getTrading212Balance } from "./trading212.ts";

describe("Trading 212 Connector", () => {
	const server = setupServer();

	beforeAll(() => {
		server.listen({ onUnhandledRequest: "error" });
	});

	afterEach(() => {
		server.resetHandlers();
	});

	afterAll(() => {
		server.close();
	});

	it("should successfully retrieve balance", async () => {
		const mockResponse = {
			blocked: 0,
			free: 1000.5,
			invested: 5000.25,
			pieCash: 0,
			ppl: 234.75,
			result: 5235,
			total: 6235.5,
		};

		server.use(
			...createTrading212Handlers({
				validApiKey: "test-api-key",
				validApiSecret: "test-secret",
				accountCash: mockResponse,
			}),
		);

		const result = await getTrading212Balance("test-api-key", "test-secret");

		expect("balance" in result).toBe(true);
		if ("balance" in result) {
			expect(result.balance).toBe(6235.5);
		}
	});

	it("should return error for unauthorized access (401)", async () => {
		server.use(
			...createTrading212Handlers({
				validApiKey: "correct-key",
				validApiSecret: "correct-secret",
			}),
		);

		const result = await getTrading212Balance("invalid-key", "invalid-secret");

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toBe(
				"Unauthorized: Check your Trading212 API Key and Secret Key.",
			);
			expect(result.canRetry).toBe(false);
		}
	});

	it("should return error for forbidden access (403)", async () => {
		server.use(
			...createTrading212Handlers({
				validApiKey: "test-api-key",
				validApiSecret: "test-secret",
				returnError: "forbidden",
			}),
		);

		const result = await getTrading212Balance("test-api-key", "test-secret");

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toBe(
				"Forbidden: Check your Trading212 API Key scopes.",
			);
			expect(result.canRetry).toBe(false);
		}
	});

	it("should return error for rate limit exceeded (429)", async () => {
		server.use(
			...createTrading212Handlers({
				validApiKey: "test-api-key",
				validApiSecret: "test-secret",
				returnError: "rate-limit",
			}),
		);

		const result = await getTrading212Balance("test-api-key", "test-secret");

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toBe(
				"Rate limit exceeded: Too many requests to Trading212 API.",
			);
			expect(result.canRetry).toBe(false);
		}
	});

	it("should return error for other HTTP errors", async () => {
		server.use(
			...createTrading212Handlers({
				validApiKey: "test-api-key",
				validApiSecret: "test-secret",
				returnError: "server-error",
			}),
		);

		const result = await getTrading212Balance("test-api-key", "test-secret");

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toBe(
				"Error fetching Trading212 balance: 500 Internal Server Error",
			);
			expect(result.canRetry).toBe(true);
		}
	});

	it("should return error for invalid response format", async () => {
		server.use(
			...createTrading212Handlers({
				validApiKey: "test-api-key",
				validApiSecret: "test-secret",
				returnInvalidFormat: true,
			}),
		);

		const result = await getTrading212Balance("test-api-key", "test-secret");

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toBe(
				"Unexpected response format from Trading212 API.",
			);
			expect(result.canRetry).toBe(false);
		}
	});

	it("should correctly encode API credentials in Authorization header", async () => {
		server.use(
			...createTrading212Handlers({
				validApiKey: "myApiKey",
				validApiSecret: "mySecret",
				accountCash: {
					blocked: 0,
					free: 0,
					invested: 0,
					pieCash: 0,
					ppl: 0,
					result: 0,
					total: 100,
				},
			}),
		);

		const result = await getTrading212Balance("myApiKey", "mySecret");

		// If the credentials were correctly encoded, the request should succeed
		expect("balance" in result).toBe(true);
		if ("balance" in result) {
			expect(result.balance).toBe(100);
		}
	});
});
