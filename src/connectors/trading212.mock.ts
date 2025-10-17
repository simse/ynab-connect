import { type HttpHandler, HttpResponse, http } from "msw";

const TRADING212_BASE_URL = "https://live.trading212.com/api/v0";

/**
 * Trading 212 API mock response types
 */
export interface Trading212AccountCash {
	blocked: number;
	free: number;
	invested: number;
	pieCash: number;
	ppl: number;
	result: number;
	total: number;
}

/**
 * Helper function to validate Basic auth header
 */
const validateAuthHeader = (
	authHeader: string | null,
): { valid: boolean; apiKey?: string; apiSecret?: string } => {
	if (!authHeader || !authHeader.startsWith("Basic ")) {
		return { valid: false };
	}

	try {
		const base64Credentials = authHeader.slice(6);
		const decoded = Buffer.from(base64Credentials, "base64").toString("utf-8");
		const [apiKey, apiSecret] = decoded.split(":");

		if (!apiKey || !apiSecret) {
			return { valid: false };
		}

		return { valid: true, apiKey, apiSecret };
	} catch {
		return { valid: false };
	}
};

/**
 * Create Trading 212 API mock handlers
 */
export const createTrading212Handlers = (
	config: {
		validApiKey?: string;
		validApiSecret?: string;
		accountCash?: Trading212AccountCash;
		returnError?: "unauthorized" | "forbidden" | "rate-limit" | "server-error";
		returnInvalidFormat?: boolean;
	} = {},
): HttpHandler[] => {
	const {
		validApiKey = "valid-api-key",
		validApiSecret = "valid-api-secret",
		accountCash = {
			blocked: 0,
			free: 1000.5,
			invested: 5000.25,
			pieCash: 0,
			ppl: 234.75,
			result: 5235,
			total: 6235.5,
		},
		returnError,
		returnInvalidFormat = false,
	} = config;

	return [
		// GET /equity/account/cash - Get account cash information
		http.get(`${TRADING212_BASE_URL}/equity/account/cash`, ({ request }) => {
			const authHeader = request.headers.get("Authorization");
			const auth = validateAuthHeader(authHeader);

			// Handle forced error scenarios
			if (returnError === "rate-limit") {
				return HttpResponse.json(
					{ message: "Too Many Requests" },
					{ status: 429, statusText: "Too Many Requests" },
				);
			}

			if (returnError === "server-error") {
				return HttpResponse.json(
					{ message: "Internal Server Error" },
					{ status: 500, statusText: "Internal Server Error" },
				);
			}

			if (returnError === "forbidden") {
				return HttpResponse.json(
					{ message: "Forbidden" },
					{ status: 403, statusText: "Forbidden" },
				);
			}

			// Validate authentication
			if (
				!auth.valid ||
				auth.apiKey !== validApiKey ||
				auth.apiSecret !== validApiSecret
			) {
				return HttpResponse.json(
					{ message: "Unauthorized" },
					{ status: 401, statusText: "Unauthorized" },
				);
			}

			// Return invalid format if requested
			if (returnInvalidFormat) {
				return HttpResponse.json({ invalid: "data" });
			}

			// Return successful account cash response
			return HttpResponse.json(accountCash);
		}),
	];
};

/**
 * Default Trading 212 handlers for testing
 */
export const trading212Handlers = createTrading212Handlers();
