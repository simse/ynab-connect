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
		it("should timeout after specified duration", async () => {
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
});
