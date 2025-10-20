import { type HttpHandler, HttpResponse, http } from "msw";
import type { Account, BudgetSummary, TransactionDetail } from "ynab";

const YNAB_BASE_URL = "https://api.ynab.com/v1";

/**
 * Helper function to validate Bearer token auth header
 */
const validateAuthHeader = (
	authHeader: string | null,
	validToken: string,
): boolean => {
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return false;
	}

	const token = authHeader.slice(7);
	return token === validToken;
};

/**
 * Create YNAB API mock handlers
 */
export const createYnabHandlers = (
	config: {
		validToken?: string;
		budgets?: Map<string, BudgetSummary>;
		accounts?: Map<string, Account>;
		transactions?: Map<string, TransactionDetail>;
		returnError?:
			| "unauthorized"
			| "not-found"
			| "server-error"
			| "invalid-token";
	} = {},
): HttpHandler[] => {
	const {
		validToken = "valid-ynab-token",
		budgets = new Map(),
		accounts = new Map(),
		transactions = new Map(),
		returnError,
	} = config;

	return [
		// GET /budgets/{budget_id} - Get budget by ID
		http.get(`${YNAB_BASE_URL}/budgets/:budgetId`, ({ request, params }) => {
			const authHeader = request.headers.get("Authorization");
			const { budgetId } = params;

			// Handle forced error scenarios
			if (returnError === "unauthorized" || returnError === "invalid-token") {
				return HttpResponse.json(
					{
						error: {
							id: "401",
							name: "unauthorized",
							detail: "Unauthorized",
						},
					},
					{ status: 401, statusText: "Unauthorized" },
				);
			}

			if (returnError === "server-error") {
				return HttpResponse.json(
					{
						error: {
							id: "500",
							name: "internal_server_error",
							detail: "Internal Server Error",
						},
					},
					{ status: 500, statusText: "Internal Server Error" },
				);
			}

			// Validate authentication
			if (!validateAuthHeader(authHeader, validToken)) {
				return HttpResponse.json(
					{
						error: {
							id: "401",
							name: "unauthorized",
							detail: "Unauthorized",
						},
					},
					{ status: 401, statusText: "Unauthorized" },
				);
			}

			// Check if budget exists
			const budget = budgets.get(budgetId as string);
			if (!budget && returnError === "not-found") {
				return HttpResponse.json(
					{
						error: {
							id: "404",
							name: "not_found",
							detail: "Budget not found",
						},
					},
					{ status: 404, statusText: "Not Found" },
				);
			}

			// Return budget
			return HttpResponse.json({
				data: {
					budget:
						budget ||
						({
							id: budgetId,
							name: "Test Budget",
						} as BudgetSummary),
				},
			});
		}),

		// GET /budgets/{budget_id}/accounts/{account_id} - Get account by ID
		http.get(
			`${YNAB_BASE_URL}/budgets/:budgetId/accounts/:accountId`,
			({ request, params }) => {
				const authHeader = request.headers.get("Authorization");
				const { accountId } = params;

				// Handle forced error scenarios
				if (returnError === "unauthorized" || returnError === "invalid-token") {
					return HttpResponse.json(
						{
							error: {
								id: "401",
								name: "unauthorized",
								detail: "Unauthorized",
							},
						},
						{ status: 401, statusText: "Unauthorized" },
					);
				}

				if (returnError === "server-error") {
					return HttpResponse.json(
						{
							error: {
								id: "500",
								name: "internal_server_error",
								detail: "Internal Server Error",
							},
						},
						{ status: 500, statusText: "Internal Server Error" },
					);
				}

				// Validate authentication
				if (!validateAuthHeader(authHeader, validToken)) {
					return HttpResponse.json(
						{
							error: {
								id: "401",
								name: "unauthorized",
								detail: "Unauthorized",
							},
						},
						{ status: 401, statusText: "Unauthorized" },
					);
				}

				// Get account or return default
				const account = accounts.get(accountId as string);

				return HttpResponse.json({
					data: {
						account:
							account ||
							({
								id: accountId,
								name: "Test Account",
								type: "checking",
								on_budget: true,
								closed: false,
								balance: 0,
								cleared_balance: 0,
								uncleared_balance: 0,
								transfer_payee_id: null,
								deleted: false,
							} as Account),
					},
				});
			},
		),

		// GET /budgets/{budget_id}/accounts/{account_id}/transactions - Get transactions for account
		http.get(
			`${YNAB_BASE_URL}/budgets/:budgetId/accounts/:accountId/transactions`,
			({ request, params }) => {
				const authHeader = request.headers.get("Authorization");
				const { accountId } = params;
				const url = new URL(request.url);
				const sinceDate = url.searchParams.get("since_date");

				// Handle forced error scenarios
				if (returnError === "unauthorized" || returnError === "invalid-token") {
					return HttpResponse.json(
						{
							error: {
								id: "401",
								name: "unauthorized",
								detail: "Unauthorized",
							},
						},
						{ status: 401, statusText: "Unauthorized" },
					);
				}

				if (returnError === "server-error") {
					return HttpResponse.json(
						{
							error: {
								id: "500",
								name: "internal_server_error",
								detail: "Internal Server Error",
							},
						},
						{ status: 500, statusText: "Internal Server Error" },
					);
				}

				// Validate authentication
				if (!validateAuthHeader(authHeader, validToken)) {
					return HttpResponse.json(
						{
							error: {
								id: "401",
								name: "unauthorized",
								detail: "Unauthorized",
							},
						},
						{ status: 401, statusText: "Unauthorized" },
					);
				}

				// Filter transactions by account and date
				const accountTransactions = Array.from(transactions.values()).filter(
					(t) => {
						const matchesAccount = t.account_id === accountId;
						const matchesDate = sinceDate ? t.date >= sinceDate : true;
						return matchesAccount && matchesDate;
					},
				);

				return HttpResponse.json({
					data: {
						transactions: accountTransactions,
					},
				});
			},
		),

		// POST /budgets/{budget_id}/transactions - Create transaction
		http.post(
			`${YNAB_BASE_URL}/budgets/:budgetId/transactions`,
			async ({ request }) => {
				const authHeader = request.headers.get("Authorization");

				// Handle forced error scenarios
				if (returnError === "unauthorized" || returnError === "invalid-token") {
					return HttpResponse.json(
						{
							error: {
								id: "401",
								name: "unauthorized",
								detail: "Unauthorized",
							},
						},
						{ status: 401, statusText: "Unauthorized" },
					);
				}

				if (returnError === "server-error") {
					return HttpResponse.json(
						{
							error: {
								id: "500",
								name: "internal_server_error",
								detail: "Internal Server Error",
							},
						},
						{ status: 500, statusText: "Internal Server Error" },
					);
				}

				// Validate authentication
				if (!validateAuthHeader(authHeader, validToken)) {
					return HttpResponse.json(
						{
							error: {
								id: "401",
								name: "unauthorized",
								detail: "Unauthorized",
							},
						},
						{ status: 401, statusText: "Unauthorized" },
					);
				}

				const body = (await request.json()) as {
					transaction: Partial<TransactionDetail>;
				};

				const accountId = body.transaction.account_id || "";
				const account = accounts.get(accountId);
				const accountName = account?.name || "Test Account";

				const newTransaction: TransactionDetail = {
					id: `transaction-${Date.now()}`,
					date: body.transaction.date || new Date().toISOString().split("T")[0],
					amount: body.transaction.amount || 0,
					memo: body.transaction.memo || null,
					cleared: body.transaction.cleared || "uncleared",
					approved: body.transaction.approved || false,
					account_id: accountId,
					account_name: accountName,
					payee_name: body.transaction.payee_name || null,
					deleted: false,
					subtransactions: [],
				};

				// Store the transaction
				transactions.set(newTransaction.id, newTransaction);

				return HttpResponse.json({
					data: {
						transaction: newTransaction,
					},
				});
			},
		),

		// PUT /budgets/{budget_id}/transactions/{transaction_id} - Update transaction
		http.put(
			`${YNAB_BASE_URL}/budgets/:budgetId/transactions/:transactionId`,
			async ({ request, params }) => {
				const authHeader = request.headers.get("Authorization");
				const { transactionId } = params;

				// Handle forced error scenarios
				if (returnError === "unauthorized" || returnError === "invalid-token") {
					return HttpResponse.json(
						{
							error: {
								id: "401",
								name: "unauthorized",
								detail: "Unauthorized",
							},
						},
						{ status: 401, statusText: "Unauthorized" },
					);
				}

				if (returnError === "server-error") {
					return HttpResponse.json(
						{
							error: {
								id: "500",
								name: "internal_server_error",
								detail: "Internal Server Error",
							},
						},
						{ status: 500, statusText: "Internal Server Error" },
					);
				}

				// Validate authentication
				if (!validateAuthHeader(authHeader, validToken)) {
					return HttpResponse.json(
						{
							error: {
								id: "401",
								name: "unauthorized",
								detail: "Unauthorized",
							},
						},
						{ status: 401, statusText: "Unauthorized" },
					);
				}

				const body = (await request.json()) as {
					transaction: Partial<TransactionDetail>;
				};
				const existingTransaction = transactions.get(transactionId as string);

				if (!existingTransaction) {
					return HttpResponse.json(
						{
							error: {
								id: "404",
								name: "not_found",
								detail: "Transaction not found",
							},
						},
						{ status: 404, statusText: "Not Found" },
					);
				}

				// Update transaction
				const updatedTransaction: TransactionDetail = {
					...existingTransaction,
					...body.transaction,
				};

				transactions.set(transactionId as string, updatedTransaction);

				return HttpResponse.json({
					data: {
						transaction: updatedTransaction,
					},
				});
			},
		),
	];
};

/**
 * Default YNAB handlers for testing
 */
export const ynabHandlers = createYnabHandlers();
