import path from "node:path";
import cron from "node-cron";
import { z } from "zod";
import { loadConfig } from "zod-config";
import { yamlAdapter } from "zod-config/yaml-adapter";
import { fromError } from "zod-validation-error";
import logger from "./logger.ts";

const commonFields = {
	name: z
		.string()
		.min(1, "Account name is required")
		.describe("Unique name for this account"),
	ynabAccountId: z
		.string()
		.min(1, "YNAB Account ID is required")
		.describe("The ID of the YNAB account to sync to"),
	interval: z
		.string()
		.refine((val) => cron.validate(val), { error: "Invalid CRON expression" })
		.describe(
			"Cron expression for sync schedule (e.g., '0 2 * * *' for daily at 2 AM)",
		),
};

const accountConfig = z.discriminatedUnion("type", [
	z.object({
		...commonFields,
		type: z.literal("trading212").describe("Connector type"),
		trading212ApiKey: z
			.string()
			.min(1, "Trading212 API Key is required")
			.describe("Your Trading 212 API key"),
		trading212SecretKey: z
			.string()
			.min(1, "Trading212 Secret Key is required")
			.describe("Your Trading 212 API secret"),
	}),
	z.object({
		...commonFields,
		type: z.literal("uk_student_loan").describe("Connector type"),
		email: z
			.email("UK Student Loan email is required")
			.describe("Email address for login"),
		password: z
			.string()
			.min(1, "UK Student Loan password is required")
			.describe("Password for login"),
		secretAnswer: z
			.string()
			.min(1, "UK Student Loan secret answer is required")
			.describe("Secret answer for security question"),
	}),
	z.object({
		...commonFields,
		type: z.literal("standard_life_pension").describe("Connector type"),
		username: z
			.string()
			.min(1, "Standard Life username is required")
			.describe("Username for login"),
		password: z
			.string()
			.min(1, "Standard Life password is required")
			.describe("Password for login"),
		policyNumber: z
			.string()
			.min(1, "Standard Life policy number is required")
			.describe("Policy number for the pension account"),
	}),
]);

export type Account = z.infer<typeof accountConfig>;

const schemaConfig = z
	.object({
		ynab: z
			.object({
				accessToken: z
					.string()
					.min(1, "YNAB Access Token is required")
					.describe("Your YNAB personal access token"),
				budgetId: z
					.string()
					.min(1, "YNAB Budget ID is required")
					.describe("The ID of your YNAB budget"),
			})
			.describe("YNAB API configuration"),
		browser: z
			.object({
				endpoint: z
					.string()
					.describe(
						"URL of a browserless endpoint for headless browser automation",
					),
			})
			.optional()
			.describe("Browser automation configuration (optional)"),
		server: z
			.object({
				port: z
					.number()
					.int()
					.positive()
					.default(4030)
					.describe("Port number for the 2FA server"),
			})
			.optional()
			.describe("2FA server configuration (optional)"),
		accounts: accountConfig
			.array()
			.min(1, "At least one account must be configured")
			.describe("List of accounts to sync"),
	})
	.describe("ynab-connect configuration");

export { schemaConfig };

export type Config = z.infer<typeof schemaConfig>;

const configPath =
	Bun.env.NODE_ENV === "production"
		? "/config.yaml"
		: path.join(__dirname, "../config.yaml");

let cachedConfig: Config | null = null;

/**
 * Get the configuration, loading it if not already loaded.
 * The config is cached after the first load.
 */
export const getConfig = async (): Promise<Config> => {
	if (cachedConfig) {
		return cachedConfig;
	}

	cachedConfig = await loadConfig({
		schema: schemaConfig,
		adapters: yamlAdapter({
			path: configPath,
		}),
		onError: (e) => {
			console.error(`error while loading config: ${fromError(e).message}`);
			process.exit(1);
		},
		logger,
	});

	return cachedConfig;
};
