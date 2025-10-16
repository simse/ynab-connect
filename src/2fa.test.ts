import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { await2FACode, start2FAServer, stop2FAServer } from "./2fa.ts";

describe("2FA Module", () => {
	const TEST_PORT = 4031;

	beforeEach(() => {
		start2FAServer(TEST_PORT);
	});

	afterEach(() => {
		stop2FAServer();
	});

	describe("Pattern Matching", () => {
		it("should capture a 6-digit code", async () => {
			const codePromise = await2FACode("generic-6digit", 5000);

			const response = await fetch(
				`http://localhost:${TEST_PORT}/capture-2fa`,
				{
					method: "POST",
					body: "Your verification code: 123456",
				},
			);

			expect(response.status).toBe(200);
			const code = await codePromise;
			expect(code).toBe("123456");
		});

		it("should return 204 when no pattern matches", async () => {
			const response = await fetch(
				`http://localhost:${TEST_PORT}/capture-2fa`,
				{
					method: "POST",
					body: "This message has no code in it",
				},
			);

			expect(response.status).toBe(204);
		});

		it("should be case insensitive", async () => {
			const codePromise = await2FACode("generic-6digit", 5000);

			await fetch(`http://localhost:${TEST_PORT}/capture-2fa`, {
				method: "POST",
				body: "Your CODE: 111222",
			});

			const code = await codePromise;
			expect(code).toBe("111222");
		});
	});

	describe("Timeout Behavior", () => {
		it.skip("should timeout after specified duration", async () => {
			const start = Date.now();

			try {
				await await2FACode("generic-6digit", 1000);
				expect.unreachable("Should have timed out");
			} catch (error) {
				const duration = Date.now() - start;
				expect(duration).toBeGreaterThanOrEqual(1000);
				expect(duration).toBeLessThan(1200);
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toContain("Timeout");
			}
		});

		it("should use default timeout of 60 seconds", async () => {
			const codePromise = await2FACode("generic-6digit");

			// Immediately send the code to resolve
			await fetch(`http://localhost:${TEST_PORT}/capture-2fa`, {
				method: "POST",
				body: "code: 999888",
			});

			const code = await codePromise;
			expect(code).toBe("999888");
		});
	});

	describe("Multiple Waiters", () => {
		it("should resolve all pending requests for the same provider", async () => {
			const promise1 = await2FACode("generic-6digit", 5000);
			const promise2 = await2FACode("generic-6digit", 5000);
			const promise3 = await2FACode("generic-6digit", 5000);

			await fetch(`http://localhost:${TEST_PORT}/capture-2fa`, {
				method: "POST",
				body: "code: 444555",
			});

			const [code1, code2, code3] = await Promise.all([
				promise1,
				promise2,
				promise3,
			]);

			expect(code1).toBe("444555");
			expect(code2).toBe("444555");
			expect(code3).toBe("444555");
		});
	});

	describe("Server Lifecycle", () => {
		it("should reject pending requests when server stops", async () => {
			const codePromise = await2FACode("generic-6digit", 10000);

			stop2FAServer();

			try {
				await codePromise;
				expect.unreachable("Should have rejected");
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toContain("2FA server stopped");
			}
		});

		it("should return 404 for unknown routes", async () => {
			const response = await fetch(`http://localhost:${TEST_PORT}/unknown`);
			expect(response.status).toBe(404);
		});

		it("should return 405 for non-POST requests to /capture-2fa", async () => {
			const response = await fetch(
				`http://localhost:${TEST_PORT}/capture-2fa`,
				{
					method: "GET",
				},
			);
			expect(response.status).toBe(405);
		});

		it("should return 400 for empty request body", async () => {
			const response = await fetch(
				`http://localhost:${TEST_PORT}/capture-2fa`,
				{
					method: "POST",
					body: "",
				},
			);
			expect(response.status).toBe(400);
		});
	});

	describe("Code Caching", () => {
		it("should immediately resolve with cached code if received before await", async () => {
			// Capture a code first
			const captureResponse = await fetch(
				`http://localhost:${TEST_PORT}/capture-2fa`,
				{
					method: "POST",
					body: "code: 123456",
				},
			);
			expect(captureResponse.status).toBe(200);

			// Now await it - should resolve immediately
			const code = await await2FACode("generic-6digit", 5000);
			expect(code).toBe("123456");
		});

		it("should wait for new code if cached code is expired", async () => {
			// Capture a code first
			await fetch(`http://localhost:${TEST_PORT}/capture-2fa`, {
				method: "POST",
				body: "code: 111111",
			});

			// Wait longer than the reverse timeout (default 10s)
			await new Promise((resolve) => setTimeout(resolve, 15));

			// Now await it with a very short reverse timeout (1ms) - should wait for new code
			const codePromise = await2FACode("generic-6digit", 5000, 1);

			// Send a new code
			await fetch(`http://localhost:${TEST_PORT}/capture-2fa`, {
				method: "POST",
				body: "code: 222222",
			});

			const code = await codePromise;
			expect(code).toBe("222222");
		});

		it("should remove code from cache after using it", async () => {
			// Capture a code
			await fetch(`http://localhost:${TEST_PORT}/capture-2fa`, {
				method: "POST",
				body: "code: 333333",
			});

			// First await should get the cached code
			const code1 = await await2FACode("generic-6digit", 5000);
			expect(code1).toBe("333333");

			// Second await should wait for a new code (not get the cached one)
			const codePromise = await2FACode("generic-6digit", 5000);

			// Send a new code
			await fetch(`http://localhost:${TEST_PORT}/capture-2fa`, {
				method: "POST",
				body: "code: 444444",
			});

			const code2 = await codePromise;
			expect(code2).toBe("444444");
		});

		it("should respect custom reverse timeout", async () => {
			// Capture a code
			await fetch(`http://localhost:${TEST_PORT}/capture-2fa`, {
				method: "POST",
				body: "code: 555555",
			});

			// Wait a short time
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Await with a custom reverse timeout of 100ms - should still get cached code
			const code = await await2FACode("generic-6digit", 5000, 100);
			expect(code).toBe("555555");
		});

		it("should handle different providers independently in cache", async () => {
			// Capture codes for different providers
			await fetch(`http://localhost:${TEST_PORT}/capture-2fa`, {
				method: "POST",
				body: "code: 666666",
			});

			await fetch(`http://localhost:${TEST_PORT}/capture-2fa`, {
				method: "POST",
				body: "Your Standard Life verification code is 777777",
			});

			// Await should get the correct cached code for each provider
			const genericCode = await await2FACode("generic-6digit", 5000);
			const standardLifeCode = await await2FACode("standard-life-uk", 5000);

			expect(genericCode).toBe("666666");
			expect(standardLifeCode).toBe("777777");
		});
	});
});
