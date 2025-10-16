import path from "node:path";
import cron from "node-cron";
import { z } from "zod";
import { loadConfig } from "zod-config";
import { yamlAdapter } from "zod-config/yaml-adapter";
import { fromError } from "zod-validation-error";
import logger from "./logger.ts";

const commonFields = {
	name: z.string().min(1, "Account name is required"),
	ynabAccountId: z.string().min(1, "YNAB Account ID is required"),
	interval: z
		.string()
		.refine((val) => cron.validate(val), { error: "Invalid CRON expression" }),
};

const accountConfig = z.discriminatedUnion("type", [
	z.object({
		...commonFields,
		type: z.literal("trading212"),
		trading212ApiKey: z.string().min(1, "Trading212 API Key is required"),
		trading212SecretKey: z.string().min(1, "Trading212 Secret Key is required"),
	}),
	z.object({
		...commonFields,
		type: z.literal("uk_student_loan"),
		email: z.email("UK Student Loan email is required"),
		password: z.string().min(1, "UK Student Loan password is required"),
		secretAnswer: z
			.string()
			.min(1, "UK Student Loan secret answer is required"),
	}),
	z.object({
		...commonFields,
		type: z.literal("standard_life_pension"),
		username: z.string().min(1, "Standard Life username is required"),
		password: z.string().min(1, "Standard Life password is required"),
		policyNumber: z.string().min(1, "Standard Life policy number is required"),
	}),
]);

export type Account = z.infer<typeof accountConfig>;

const schemaConfig = z.object({
	ynab: z.object({
		accessToken: z.string().min(1, "YNAB Access Token is required"),
		budgetId: z.string().min(1, "YNAB Budget ID is required"),
	}),
	browser: z
		.object({
			endpoint: z.string(),
		})
		.optional(),
	server: z
		.object({
			port: z.number().int().positive().default(4030),
		})
		.default({ port: 4030 }),
	accounts: accountConfig
		.array()
		.min(1, "At least one account must be configured"),
});

const configPath =
	Bun.env.NODE_ENV === "production"
		? "/config.yaml"
		: path.join(__dirname, "../config.yaml");

// TODO: ensure this only loads once
const config = await loadConfig({
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

export default config;
