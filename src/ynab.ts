import * as ynab from "ynab";
import { getConfig } from "./config.ts";
import logger from "./logger.ts";

const YNAB_MEMO = "Automated balance adjustment created by ynab-connect";
const YNAB_PAYEE = "Balance Adjustment";

let ynabAPI: ynab.API | null = null;

const getYnabAPI = async () => {
	if (ynabAPI) {
		return ynabAPI;
	}
	const config = await getConfig();
	ynabAPI = new ynab.API(config.ynab.accessToken);
	return ynabAPI;
};

const doesBudgetExist = async (budgetId: string) => {
	const api = await getYnabAPI();
	try {
		await api.budgets.getBudgetById(budgetId);
	} catch (_e) {
		return false;
	}

	return true;
};

const getAccountBalance = async (accountId: string) => {
	const config = await getConfig();
	const api = await getYnabAPI();
	const budgetId = config.ynab.budgetId;

	const accountResponse = await api.accounts.getAccountById(
		budgetId,
		accountId,
	);

	return accountResponse.data.account.cleared_balance;
};

const dateToYnabFormat = (date: Date) => {
	return date.toISOString().split("T")[0];
};

const calculateBalanceDelta = async (
	accountId: string,
	targetAmountInMilliunits: number,
) => {
	const currentBalance = await getAccountBalance(accountId);
	return targetAmountInMilliunits - currentBalance;
};

const findExistingAdjustmentTransaction = async (
	budgetId: string,
	accountId: string,
	date: Date,
) => {
	const api = await getYnabAPI();
	const transactionsResponse = await api.transactions.getTransactionsByAccount(
		budgetId,
		accountId,
		dateToYnabFormat(date),
	);

	return transactionsResponse.data.transactions.find(
		(t) => t.memo === YNAB_MEMO && t.date === dateToYnabFormat(date),
	);
};

const updateAdjustmentTransaction = async (
	budgetId: string,
	transactionId: string,
	newAmount: number,
	existingAmount: number,
) => {
	const api = await getYnabAPI();
	await api.transactions.updateTransaction(budgetId, transactionId, {
		transaction: {
			amount: newAmount + existingAmount,
		},
	});
};

const createAdjustmentTransaction = async (
	budgetId: string,
	accountId: string,
	amount: number,
	date: Date,
) => {
	const api = await getYnabAPI();
	await api.transactions.createTransaction(budgetId, {
		transaction: {
			account_id: accountId,
			cleared: "reconciled",
			approved: true,
			date: dateToYnabFormat(date),
			amount: amount,
			payee_name: YNAB_PAYEE,
			memo: YNAB_MEMO,
		},
	});
};

const adjustBalance = async (
	accountId: string,
	amount: number,
	date?: Date,
	log = logger,
) => {
	const config = await getConfig();
	const budgetId = config.ynab.budgetId;
	const balanceDate = date ?? new Date();

	const targetAmountInMilliunits = amount * 1000;

	let balanceDelta = 0;
	try {
		balanceDelta = await calculateBalanceDelta(
			accountId,
			targetAmountInMilliunits,
		);
	} catch (_e) {
		throw new Error("error fetching account balance");
	}

	if (balanceDelta === 0) {
		log.debug(
			{ accountId, amount, date: dateToYnabFormat(balanceDate) },
			`no balance adjustment needed`,
		);
		return;
	}

	const existingTransaction = await findExistingAdjustmentTransaction(
		budgetId,
		accountId,
		balanceDate,
	);

	if (existingTransaction) {
		log.debug(
			{
				accountId,
				transactionId: existingTransaction.id,
				date: existingTransaction.date,
				amount: existingTransaction.amount,
			},
			`An adjustment transaction already exists, updating that transaction instead of creating a new one.`,
		);

		await updateAdjustmentTransaction(
			budgetId,
			existingTransaction.id,
			balanceDelta,
			existingTransaction.amount,
		);

		return;
	}

	await createAdjustmentTransaction(
		budgetId,
		accountId,
		balanceDelta,
		balanceDate,
	);
};

export { doesBudgetExist, adjustBalance };
