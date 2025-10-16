import type { Logger } from "pino";
import retry from "retry";
import type { Account } from "./config.ts";
import { type AccountResult, connectors } from "./connectors";
import { createLogger } from "./logger.ts";
import { adjustBalance } from "./ynab.ts";

const getBalanceWithRetry = async (
	account: Account,
	logger: Logger,
): Promise<AccountResult | null> => {
	const operation = retry.operation({
		retries: 3,
		minTimeout: 1000,
	});

	const connector = connectors[account.type];

	return new Promise((resolve) => {
		operation.attempt(async (currentAttempt) => {
			let result: AccountResult;

			try {
				result = await connector.getBalance(account);
			} catch (e) {
				result = {
					canRetry: true,
					error: (e as Error).message,
				};
			}

			if ("balance" in result) {
				return resolve(result);
			}

			if (!result.canRetry) {
				logger.error(
					{
						account: account.name,
						type: account.type,
						error: result.error,
					},
					`Stumbled upon a non-retryable error`,
				);
				operation.stop();
				return resolve(null);
			}

			logger.warn(
				{
					account: account.name,
					type: account.type,
					attempt: currentAttempt,
					error: result.error,
				},
				"Error fetching balance, retrying...",
			);

			if (!operation.retry(new Error(result.error))) {
				logger.error(
					{
						account: account.name,
						type: account.type,
						error: result.error,
					},
					`Failed to fetch balance for account after retries`,
				);
				return resolve(null);
			}
		});
	});
};

const runSyncJob = async (account: Account) => {
	const logger = createLogger(account.name);

	// fetch balance
	const result = await getBalanceWithRetry(account, logger);

	if (!result || !("balance" in result)) {
		logger.error(
			{
				type: account.type,
			},
			`Failed to fetch balance for account after retries`,
		);
		return;
	}

	logger.debug(
		{
			type: account.type,
			balance: result.balance,
		},
		`Fetched balance successfully`,
	);

	console.log(result.transactions);

	// update balance in YNAB
	try {
		await adjustBalance(
			account.ynabAccountId,
			result.balance,
			undefined,
			logger,
		);
	} catch (e) {
		logger.error(
			{
				type: account.type,
				error: (e as Error).message,
			},
			`Failed to adjust balance in YNAB`,
		);
		return;
	}

	logger.info(
		{
			type: account.type,
			balance: result.balance,
			accountId: account.ynabAccountId,
			accountName: account.name,
		},
		`Adjusted balance in YNAB successfully`,
	);
};

export { runSyncJob };
