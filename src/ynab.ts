import * as ynab from "ynab";
import config from "./config.ts";

const ynabAPI = new ynab.API(config.ynab.accessToken);

const ensureBudgetExists = async () => {
	const budgetId = config.ynab.budgetId;

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

const adjustBalance = async (
	accountId: string,
	amount: number,
	date?: Date,
) => {
	const budgetId = config.ynab.budgetId;
	const balanceDate = date ?? new Date();

	let balanceDelta = 0;

	const newBalance = amount * 1000; // convert to milliunits

	try {
		const currentBalance = await getAccountBalance(accountId);

		balanceDelta = newBalance - currentBalance;
	} catch (e) {
		throw new Error(`Error fetching account balance for account ${accountId}`);
	}

	if (balanceDelta === 0) {
		console.log(
			`No adjustment needed for account ${accountId}. Current balance matches desired balance of ${newBalance}.`,
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
			payee_name: "Balance Adjustment",
			memo: "Automated balance adjustment created by ynab-connect",
		},
	});
};

export { ensureBudgetExists, adjustBalance };
