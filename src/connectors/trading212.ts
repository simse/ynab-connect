const getAuthorizationHeader = (apiKey: string, apiSecret: string): string => {
	return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;
};

const getTrading212Balance = async (
	apiKey: string,
	apiSecret: string,
): Promise<number> => {
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
		if (resp.status === 401) {
			throw new Error(
				`Unauthorized: Check your Trading212 API key, secret and scopes.`,
			);
		}

		throw new Error(`Error fetching Trading212 balance: ${resp.statusText}`);
	}

	const data = (await resp.json()) as {
		blocked: number;
		free: number;
		invested: number;
		pieCash: number;
		ppl: number;
		result: number;
		total: number;
	};

	return data.total;
};

export { getTrading212Balance };
