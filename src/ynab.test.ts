import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test";
import { setupServer } from "msw/node";
import type { Logger } from "pino";
import type { Account, TransactionDetail } from "ynab";
import type { Config } from "./config.ts";
import * as configModule from "./config.ts";
import { createYnabHandlers } from "./ynab.mock.ts";
import { adjustBalance, doesBudgetExist } from "./ynab.ts";

describe("YNAB Module", () => {
	const server = setupServer();
	const TEST_TOKEN = "test-ynab-token";
	const TEST_BUDGET_ID = "test-budget-123";
	const TEST_ACCOUNT_ID = "test-account-456";

	const mockConfig: Config = {
		ynab: {
			accessToken: TEST_TOKEN,
			budgetId: TEST_BUDGET_ID,
		},
		accounts: [],
	};

	// Factory function to create test accounts
	const createTestAccount = (overrides: Partial<Account> = {}): Account => ({
		id: TEST_ACCOUNT_ID,
		name: "Test Account",
		type: "checking",
		on_budget: true,
		closed: false,
		balance: 100000,
		cleared_balance: 100000,
		uncleared_balance: 0,
		transfer_payee_id: null,
		deleted: false,
		...overrides,
	});

	// Factory function to create test transactions
	const createTestTransaction = (
		overrides: Partial<TransactionDetail> = {},
	): TransactionDetail => ({
		id: `transaction-${Date.now()}-${Math.random()}`,
		date: new Date().toISOString().split("T")[0],
		amount: 0,
		memo: "Automated balance adjustment created by ynab-connect",
		cleared: "reconciled",
		approved: true,
		account_id: TEST_ACCOUNT_ID,
		account_name: "Test Account",
		payee_name: "Balance Adjustment",
		deleted: false,
		subtransactions: [],
		...overrides,
	});

	// Helper to setup mock handlers
	const setupMockHandlers = (
		accounts: Map<string, Account>,
		transactions: Map<string, TransactionDetail>,
		options: { returnError?: string } = {},
	) => {
		server.use(
			...createYnabHandlers({
				validToken: TEST_TOKEN,
				accounts,
				transactions,
				returnError: options.returnError as
					| "unauthorized"
					| "not-found"
					| "server-error"
					| "invalid-token"
					| undefined,
			}),
		);
	};

	beforeAll(() => {
		server.listen({ onUnhandledRequest: "error" });
	});

	beforeEach(() => {
		// Mock getConfig to return our test config
		spyOn(configModule, "getConfig").mockResolvedValue(mockConfig);
	});

	afterEach(() => {
		server.resetHandlers();
		mock.restore();
	});

	afterAll(() => {
		server.close();
	});

	describe("doesBudgetExist", () => {
		it("should return true when budget exists", async () => {
			server.use(
				...createYnabHandlers({
					validToken: TEST_TOKEN,
					budgets: new Map([
						[
							TEST_BUDGET_ID,
							{
								id: TEST_BUDGET_ID,
								name: "Test Budget",
							},
						],
					]),
				}),
			);

			const result = await doesBudgetExist(TEST_BUDGET_ID);
			expect(result).toBe(true);
		});

		it("should return false when budget does not exist", async () => {
			server.use(
				...createYnabHandlers({
					validToken: TEST_TOKEN,
					returnError: "not-found",
				}),
			);

			const result = await doesBudgetExist("non-existent-budget");
			expect(result).toBe(false);
		});

		it("should return false on API error", async () => {
			server.use(
				...createYnabHandlers({
					validToken: TEST_TOKEN,
					returnError: "server-error",
				}),
			);

			const result = await doesBudgetExist(TEST_BUDGET_ID);
			expect(result).toBe(false);
		});
	});

	describe("adjustBalance", () => {
		describe("when balance matches target", () => {
			it("should not create a transaction when balance already matches", async () => {
				const mockAccount = createTestAccount();
				const transactions = new Map<string, TransactionDetail>();

				setupMockHandlers(
					new Map([[TEST_ACCOUNT_ID, mockAccount]]),
					transactions,
				);

				const mockLogger: Partial<Logger> = {
					debug: mock(() => {}),
					info: mock(() => {}),
					warn: mock(() => {}),
					error: mock(() => {}),
				};

				await adjustBalance(
					TEST_ACCOUNT_ID,
					100, // Same as current balance
					undefined,
					mockLogger as Logger,
				);

				// Verify debug log was called
				expect(mockLogger.debug).toHaveBeenCalledTimes(1);

				// Verify no transactions were created
				expect(transactions.size).toBe(0);
			});
		});

		describe("when balance needs adjustment", () => {
			it("should create a new adjustment transaction when none exists", async () => {
				const mockAccount = createTestAccount();
				const transactions = new Map<string, TransactionDetail>();

				setupMockHandlers(
					new Map([[TEST_ACCOUNT_ID, mockAccount]]),
					transactions,
				);

				const targetAmount = 150; // Target: 150.00
				await adjustBalance(TEST_ACCOUNT_ID, targetAmount);

				// Verify transaction was created
				expect(transactions.size).toBe(1);

				const createdTransaction = Array.from(transactions.values())[0];
				expect(createdTransaction.amount).toBe(50000); // 50.00 difference in milliunits
				expect(createdTransaction.account_id).toBe(TEST_ACCOUNT_ID);
				expect(createdTransaction.cleared).toBe("reconciled");
				expect(createdTransaction.approved).toBe(true);
				expect(createdTransaction.memo).toBe(
					"Automated balance adjustment created by ynab-connect",
				);
				expect(createdTransaction.payee_name).toBe("Balance Adjustment");
			});

			it("should create adjustment with correct date when provided", async () => {
				const mockAccount = createTestAccount();
				const transactions = new Map<string, TransactionDetail>();

				setupMockHandlers(
					new Map([[TEST_ACCOUNT_ID, mockAccount]]),
					transactions,
				);

				const customDate = new Date("2025-06-15");
				await adjustBalance(TEST_ACCOUNT_ID, 150, customDate);

				const createdTransaction = Array.from(transactions.values())[0];
				expect(createdTransaction.date).toBe("2025-06-15");
			});

			it("should handle negative balance adjustments", async () => {
				const mockAccount = createTestAccount();
				const transactions = new Map<string, TransactionDetail>();

				setupMockHandlers(
					new Map([[TEST_ACCOUNT_ID, mockAccount]]),
					transactions,
				);

				const targetAmount = 50; // Target: 50.00 (reduction)
				await adjustBalance(TEST_ACCOUNT_ID, targetAmount);

				const createdTransaction = Array.from(transactions.values())[0];
				expect(createdTransaction.amount).toBe(-50000); // -50.00 difference
			});
		});

		describe("when existing adjustment transaction exists", () => {
			it("should update existing transaction instead of creating new one", async () => {
				const mockAccount = createTestAccount();
				const testDate = new Date("2025-06-15");
				const existingTransaction = createTestTransaction({
					id: "existing-transaction-123",
					date: "2025-06-15",
					amount: 30000, // 30.00
				});

				const transactions = new Map<string, TransactionDetail>([
					[existingTransaction.id, existingTransaction],
				]);

				setupMockHandlers(
					new Map([[TEST_ACCOUNT_ID, mockAccount]]),
					transactions,
				);

				const mockLogger: Partial<Logger> = {
					debug: mock(() => {}),
					info: mock(() => {}),
					warn: mock(() => {}),
					error: mock(() => {}),
				};

				await adjustBalance(
					TEST_ACCOUNT_ID,
					150, // Target: 150.00
					testDate,
					mockLogger as Logger,
				);

				// Verify debug log was called about updating existing transaction
				expect(mockLogger.debug).toHaveBeenCalled();
				const debugCall = (
					mockLogger.debug as ReturnType<typeof mock>
				).mock.calls.find((call: unknown[]) => {
					const message = call[1] as string | undefined;
					return message?.includes("already exists");
				});
				expect(debugCall).toBeDefined();

				// Verify transaction was updated, not created new
				expect(transactions.size).toBe(1);

				const updatedTransaction = transactions.get(existingTransaction.id);
				expect(updatedTransaction).toBeDefined();
				// New amount should be: existing (30000) + delta (50000) = 80000
				expect(updatedTransaction?.amount).toBe(80000);
			});

			it("should only update transaction with matching date", async () => {
				const mockAccount = createTestAccount();
				const oldTransaction = createTestTransaction({
					id: "old-transaction-123",
					date: "2025-06-10",
					amount: 30000,
				});

				const transactions = new Map<string, TransactionDetail>([
					[oldTransaction.id, oldTransaction],
				]);

				setupMockHandlers(
					new Map([[TEST_ACCOUNT_ID, mockAccount]]),
					transactions,
				);

				const newDate = new Date("2025-06-15");
				await adjustBalance(TEST_ACCOUNT_ID, 150, newDate);

				// Should create new transaction since date doesn't match
				expect(transactions.size).toBe(2);

				// Old transaction should remain unchanged
				const oldTx = transactions.get(oldTransaction.id);
				expect(oldTx?.amount).toBe(30000);

				// New transaction should be created
				const newTransactions = Array.from(transactions.values()).filter(
					(t) => t.date === "2025-06-15",
				);
				expect(newTransactions.length).toBe(1);
				expect(newTransactions[0].amount).toBe(50000);
			});
		});

		describe("error handling", () => {
			it("should throw error when fetching account balance fails", async () => {
				setupMockHandlers(new Map(), new Map(), {
					returnError: "server-error",
				});

				await expect(adjustBalance(TEST_ACCOUNT_ID, 150)).rejects.toThrowError(
					"error fetching account balance",
				);
			});

			it("should propagate API errors when creating transaction", async () => {
				const mockAccount = createTestAccount();
				const transactions = new Map<string, TransactionDetail>();

				// First provide successful account fetch
				setupMockHandlers(new Map([[TEST_ACCOUNT_ID, mockAccount]]), new Map());

				// Then switch to error mode for transaction creation
				setupMockHandlers(
					new Map([[TEST_ACCOUNT_ID, mockAccount]]),
					transactions,
					{ returnError: "server-error" },
				);

				await expect(adjustBalance(TEST_ACCOUNT_ID, 150)).rejects.toThrow();
			});
		});

		describe("edge cases", () => {
			it("should handle decimal amounts correctly", async () => {
				const mockAccount = createTestAccount({
					balance: 100500, // 100.50 in milliunits
					cleared_balance: 100500,
				});
				const transactions = new Map<string, TransactionDetail>();

				setupMockHandlers(
					new Map([[TEST_ACCOUNT_ID, mockAccount]]),
					transactions,
				);

				await adjustBalance(TEST_ACCOUNT_ID, 150.75); // Target: 150.75

				const createdTransaction = Array.from(transactions.values())[0];
				// Difference: 150.75 - 100.50 = 50.25 = 50250 milliunits
				expect(createdTransaction.amount).toBe(50250);
			});

			it("should handle zero target amount", async () => {
				const mockAccount = createTestAccount({
					balance: 50000, // 50.00 in milliunits
					cleared_balance: 50000,
				});
				const transactions = new Map<string, TransactionDetail>();

				setupMockHandlers(
					new Map([[TEST_ACCOUNT_ID, mockAccount]]),
					transactions,
				);

				await adjustBalance(TEST_ACCOUNT_ID, 0);

				const createdTransaction = Array.from(transactions.values())[0];
				expect(createdTransaction.amount).toBe(-50000); // Reduce to 0
			});

			it("should use current date when date is not provided", async () => {
				const mockAccount = createTestAccount();
				const transactions = new Map<string, TransactionDetail>();

				setupMockHandlers(
					new Map([[TEST_ACCOUNT_ID, mockAccount]]),
					transactions,
				);

				await adjustBalance(TEST_ACCOUNT_ID, 150);

				const createdTransaction = Array.from(transactions.values())[0];
				const today = new Date().toISOString().split("T")[0];
				expect(createdTransaction.date).toBe(today);
			});
		});
	});
});
