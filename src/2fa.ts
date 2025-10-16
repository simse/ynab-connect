import { createLogger } from "./logger.ts";

const logger = createLogger("2FA");

interface Pattern {
	name: string;
	regex: RegExp;
}

interface PendingRequest {
	resolve: (code: string) => void;
	reject: (error: Error) => void;
	timeoutId: Timer;
}

interface CachedCode {
	code: string;
	timestamp: number;
}

// Registry of 2FA patterns to match against
const patterns: Pattern[] = [
	{
		name: "generic-6digit",
		regex: /code[:\s]*([0-9]{6})/i,
	},
	{
		name: "standard-life-uk",
		regex: /Your Standard Life verification code is ([0-9]{6})/,
	},
];

// Default timeout for reverse caching (10 seconds)
const DEFAULT_REVERSE_TIMEOUT_MS = 10000;

// Store for pending 2FA code requests
const pendingRequests = new Map<string, PendingRequest[]>();

// Cache for recently captured 2FA codes
const cachedCodes = new Map<string, CachedCode>();

let server: ReturnType<typeof Bun.serve> | null = null;

/**
 * Handles incoming 2FA message capture requests
 */
async function handleCapture(req: Request): Promise<Response> {
	if (req.method !== "POST") {
		return new Response("Method not allowed", { status: 405 });
	}

	const text = await req.text();

	if (!text) {
		return new Response("Empty request body", { status: 400 });
	}

	// Try to match against all patterns
	for (const pattern of patterns) {
		const match = pattern.regex.exec(text);

		if (match?.[1]) {
			const code = match[1];
			logger.info({ provider: pattern.name }, "2FA code captured");

			// Store code in cache with timestamp
			cachedCodes.set(pattern.name, {
				code,
				timestamp: Date.now(),
			});

			// Resolve all pending requests for this provider
			const pending = pendingRequests.get(pattern.name);
			if (pending) {
				for (const request of pending) {
					clearTimeout(request.timeoutId);
					request.resolve(code);
				}
				pendingRequests.delete(pattern.name);
			}

			return new Response("OK", { status: 200 });
		}
	}

	// No pattern matched
	return new Response("No match", { status: 204 });
}

/**
 * Starts the 2FA capture HTTP server
 */
export function start2FAServer(port: number): void {
	if (server) {
		logger.warn("2FA server already running");
		return;
	}

	server = Bun.serve({
		port,
		fetch: async (req) => {
			const url = new URL(req.url);

			if (url.pathname === "/capture-2fa") {
				return handleCapture(req);
			}

			return new Response("Not found", { status: 404 });
		},
	});

	logger.info({ port }, "2FA server started");
}

/**
 * Stops the 2FA capture HTTP server
 */
export function stop2FAServer(): void {
	if (!server) {
		return;
	}

	server.stop();
	server = null;

	// Reject all pending requests
	for (const [_provider, requests] of pendingRequests) {
		for (const request of requests) {
			clearTimeout(request.timeoutId);
			request.reject(new Error("2FA server stopped"));
		}
	}
	pendingRequests.clear();

	// Clear cached codes
	cachedCodes.clear();

	logger.info("2FA server stopped");
}

/**
 * Waits for a 2FA code for the specified provider
 * @param provider The name of the provider (must match a pattern name)
 * @param timeoutMs Timeout in milliseconds (default: 60000)
 * @param reverseTimeoutMs Maximum age of cached code to use in milliseconds (default: 10000)
 * @returns Promise that resolves with the 2FA code or rejects on timeout
 */
export function await2FACode(
	provider: string,
	timeoutMs = 60000,
	reverseTimeoutMs = DEFAULT_REVERSE_TIMEOUT_MS,
): Promise<string> {
	// Check if we have a recently cached code
	const cached = cachedCodes.get(provider);
	if (cached) {
		const age = Date.now() - cached.timestamp;
		if (age <= reverseTimeoutMs) {
			logger.debug(
				{ provider, age },
				"Using cached 2FA code from before await",
			);
			// Remove from cache and return immediately
			cachedCodes.delete(provider);
			return Promise.resolve(cached.code);
		}
		// Code is too old, remove it
		logger.debug({ provider, age }, "Cached 2FA code expired");
		cachedCodes.delete(provider);
	}

	return new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			// Remove this request from pending
			const pending = pendingRequests.get(provider);
			if (pending) {
				const index = pending.findIndex((r) => r.timeoutId === timeoutId);
				if (index !== -1) {
					pending.splice(index, 1);
				}
				if (pending.length === 0) {
					pendingRequests.delete(provider);
				}
			}

			reject(new Error(`Timeout waiting for 2FA code from ${provider}`));
		}, timeoutMs);

		const request: PendingRequest = {
			resolve,
			reject,
			timeoutId,
		};

		const existing = pendingRequests.get(provider);
		if (existing) {
			existing.push(request);
		} else {
			pendingRequests.set(provider, [request]);
		}

		logger.debug({ provider, timeout: timeoutMs }, "Waiting for 2FA code");
	});
}
