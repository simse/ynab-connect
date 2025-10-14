import * as ynab from "ynab";
import config from "./config.ts";
import logger from "./logger.ts";

const YNAB_MEMO = "Automated balance adjustment created by ynab-connect";
const YNAB_PAYEE = "Balance Adjustment";

const ynabAPI = new ynab.API(config.ynab.accessToken);

const ensureBudgetExists = async (budgetId: string) => {
	try {
		await ynabAPI.budgets.getBudgetById(budgetId);
	} catch (_e) {
		return false;
	}

	return true;
};

const getAccountBalance = async (accountId: string) => {
	const budgetId = config.ynab.budgetId;

	const accountResponse = await ynabAPI.accounts.getAccountById(
		budgetId,
		accountId,
	);

	return accountResponse.data.account.cleared_balance;
};

const dateToYnabFormat = (date: Date) => {
	return date.toISOString().split("T")[0];
};

const adjustBalance = async (
	accountId: string,
	amount: number,
	date?: Date,
	log = logger,
) => {
	const budgetId = config.ynab.budgetId;
	const balanceDate = date ?? new Date();

	let balanceDelta = 0;

	const newBalance = amount * 1000; // convert to milliunits

	try {
		const currentBalance = await getAccountBalance(accountId);

		balanceDelta = newBalance - currentBalance;
	} catch (_e) {
		throw new Error(`Error fetching account balance for account ${accountId}`);
	}

	if (balanceDelta === 0) {
		log.info(
			{ accountId, amount, date: dateToYnabFormat(balanceDate) },
			`No adjustment needed.`,
		);
		return;
	}

	// check if there's already a transaction with the same memo and date
	const transactionsResponse =
		await ynabAPI.transactions.getTransactionsByAccount(
			budgetId,
			accountId,
			dateToYnabFormat(balanceDate),
		);

	const existingTransaction = transactionsResponse.data.transactions.find(
		(t) => t.memo === YNAB_MEMO && t.date === dateToYnabFormat(balanceDate),
	);

	if (existingTransaction) {
		log.info(
			{
				accountId,
				transactionId: existingTransaction.id,
				date: existingTransaction.date,
				amount: existingTransaction.amount,
			},
			`An adjustment transaction already exists, updating that transaction instead of creating a new one.`,
		);

		await ynabAPI.transactions.updateTransaction(
			budgetId,
			existingTransaction.id,
			{
				transaction: {
					amount: balanceDelta + existingTransaction.amount,
				},
			},
		);

		return;
	}

	await ynabAPI.transactions.createTransaction(budgetId, {
		transaction: {
			account_id: accountId,
			cleared: "reconciled",
			approved: true,
			date: balanceDate.toISOString().split("T")[0],
			amount: balanceDelta,
			payee_name: YNAB_PAYEE,
			memo: YNAB_MEMO,
		},
	});
};

export { ensureBudgetExists, adjustBalance };
