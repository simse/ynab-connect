import { APIClient } from "ig-trading-api";
import type { Config } from "../config.ts";
import type { AccountResult, Connector } from "./index.ts";

type AccountType = Config["accounts"][number];

const handleResponseErrors = (error: unknown): AccountResult => {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();

		if (message.includes("unauthorized") || message.includes("401")) {
			return {
				error: "Unauthorized: Check your IG credentials and API key.",
				canRetry: false,
			};
		}

		if (message.includes("forbidden") || message.includes("403")) {
			return {
				error: "Forbidden: Check your IG API key permissions.",
				canRetry: false,
			};
		}

		if (message.includes("rate limit") || message.includes("429")) {
			return {
				error: "Rate limit exceeded: Too many requests to IG API.",
				canRetry: false,
			};
		}

		return {
			error: `Error fetching IG balance: ${error.message}`,
			canRetry: true,
		};
	}

	return {
		error: "Unknown error fetching IG balance",
		canRetry: true,
	};
};

export class IgTradingConnector implements Connector {
	friendlyName = "IG Trading";

	constructor(
		private clientFactory: (
			username: string,
			password: string,
			apiKey: string,
		) => APIClient = (username, password, apiKey) =>
			new APIClient(APIClient.URL_LIVE, {
				apiKey,
				username,
				password,
			}),
	) {}

	async getBalance(account: AccountType): Promise<AccountResult> {
		if (account.type !== "ig_trading") {
			throw new Error("Invalid account type for IG Trading connector");
		}

		try {
			const client = this.clientFactory(
				account.igUsername,
				account.igPassword,
				account.igApiKey,
			);

			const accounts = await client.rest.account.getAccounts();

			const foundAccount = accounts.accounts?.find(
				(acc) => acc.accountId === account.igAccountId,
			);

			if (!foundAccount) {
				const availableIds = accounts.accounts
					?.map((a) => a.accountId)
					.join(", ");
				return {
					error: `Account with ID ${account.igAccountId} not found. Available accounts: ${availableIds || "none"}`,
					canRetry: false,
				};
			}

			return {
				balance: foundAccount.balance.balance,
			};
		} catch (error) {
			return handleResponseErrors(error);
		}
	}
}

export const igTradingConnector = new IgTradingConnector();
