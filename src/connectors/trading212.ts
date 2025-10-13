import * as z from "zod";
import type { AccountResult } from "./index.ts";

const getAuthorizationHeader = (apiKey: string, apiSecret: string): string => {
	return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
};

const handleResponseErrors = (resp: Response): AccountResult => {
	if (resp.status === 401) {
		return {
			error: "Unauthorized: Check your Trading212 API Key and Secret Key.",
			canRetry: false,
		};
	}

	if (resp.status === 403) {
		return {
			error: "Forbidden: Check your Trading212 API Key scopes.",
			canRetry: false,
		};
	}

	if (resp.status === 429) {
		return {
			error: "Rate limit exceeded: Too many requests to Trading212 API.",
			canRetry: false,
		};
	}

	return {
		error: `Error fetching Trading212 balance: ${resp.status} ${resp.statusText}`,
		canRetry: true,
	};
};

/*const getTransactions = async (apiKey: string, apiSecret: string) => {
	const query = new URLSearchParams({
		//cursor: 'string',
		//time: new Date("2025-09-01").toISOString(),
		//limit: "50",
	}).toString();

	const resp = await fetch(
		`https://live.trading212.com/api/v0/history/transactions?${query}`,
		{
			method: "GET",
			headers: {
				Authorization: getAuthorizationHeader(apiKey, apiSecret),
			},
		},
	);

	if (!resp.ok) {
		return handleResponseErrors(resp);
	}

	const dataJson = await resp.json();

	const { data, success } = await z
		.object({
			nextPagePath: z.string(),
			items: z
				.object({
					amount: z.number(),
					dateTime: z.coerce.date(),
					reference: z.string(),
					type: z.enum(["DEPOSIT", "WITHDRAWAL", "FEE", "TRANSFER"]),
				})
				.array(),
		})
		.safeParseAsync(dataJson);

	if (!success) {
		return {
			error: `Unexpected response format from Trading212 API.`,
			canRetry: false,
		};
	}

	console.log(data);

	return data.items.map(
		(item): AccountTransaction => ({
			date: item.dateTime,
			amount: item.amount,
			type: "DEPOSIT",
		}),
	);
};*/

const getTrading212Balance = async (
	apiKey: string,
	apiSecret: string,
): Promise<AccountResult> => {
	const resp = await fetch(
		`https://live.trading212.com/api/v0/equity/account/cash`,
		{
			method: "GET",
			headers: {
				Authorization: getAuthorizationHeader(apiKey, apiSecret),
			},
		},
	);

	if (!resp.ok) {
		return handleResponseErrors(resp);
	}

	// parse response from Trading 212
	const dataJson = await resp.json();
	const { data, success } = await z
		.object({
			blocked: z.number(),
			free: z.number(),
			invested: z.number(),
			pieCash: z.number(),
			ppl: z.number(),
			result: z.number(),
			total: z.number(),
		})
		.safeParseAsync(dataJson);

	if (!success) {
		return {
			error: `Unexpected response format from Trading212 API.`,
			canRetry: false,
		};
	}

	/*const transactions = await getTransactions(apiKey, apiSecret);

	// If transactions is an error result, return it
	if (!Array.isArray(transactions)) {
		return transactions;
	}*/

	return {
		balance: data.total,
		//transactions,
	};
};

export { getTrading212Balance };
