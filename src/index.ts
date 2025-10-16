import cron, { type ScheduledTask } from "node-cron";
import { z } from "zod";
import { start2FAServer, stop2FAServer } from "./2fa.ts";
import logger, { createLogger } from "./logger.ts";
import { runSyncJob } from "./runtime.ts";
import { ensureBudgetExists } from "./ynab.ts";

// parse command line arguments
const args = Bun.argv.slice(2);
const command = args[0];
const connectorName = args[1];

// handle "export-schema" command before loading config
if (command === "export-schema") {
	const { schemaConfig } = await import("./config.ts");
	const jsonSchema = z.toJSONSchema(schemaConfig);
	console.log(JSON.stringify(jsonSchema, null, 2));
	process.exit(0);
}

logger.info("Welcome to ynab-connect");

// load config only when needed
const config = (await import("./config.ts")).default;

// check YNAB budget exists
const budgetExists = await ensureBudgetExists(config.ynab.budgetId);

if (!budgetExists) {
	logger.error(
		`Budget with ID ${config.ynab.budgetId} does not exist or is inaccessible with the provided access token.`,
	);
	process.exit(1);
}

logger.info(`Using YNAB budget ID: ${config.ynab.budgetId}`);

// handle "run <connector_name>" command
if (command === "run") {
	if (!connectorName) {
		logger.error("Please provide a connector name: run <connector_name>");
		process.exit(1);
	}

	const account = config.accounts.find((acc) => acc.name === connectorName);

	if (!account) {
		logger.error(
			`Connector "${connectorName}" not found. Available connectors: ${config.accounts.map((acc) => acc.name).join(", ")}`,
		);
		process.exit(1);
	}

	logger.info(`Running connector "${connectorName}"`);
	await runSyncJob(account);
	logger.info(`Connector "${connectorName}" completed`);
	process.exit(0);
}

// start 2FA server
if (config.server) {
	start2FAServer(config.server.port);
}

// schedule jobs for each account
const jobs: Map<string, ScheduledTask> = new Map();

for (const account of config.accounts) {
	const task = cron.schedule(
		account.interval,
		async () => {
			await runSyncJob(account);
		},
		{
			noOverlap: true,
		},
	);
	jobs.set(account.name, task);

	logger.info(
		{
			account: account.name,
			schedule: account.interval,
			next_run: task.getNextRun()?.toISOString(),
		},
		`Scheduled job successfully`,
	);
}

// schedule summary job
const summaryJob = cron.schedule("0 * * * *", () => {
	const log = createLogger("Summary");

	for (const [name, job] of jobs) {
		log.info(
			{
				account: name,
				next_run: job.getNextRun()?.toISOString(),
			},
			`Next run scheduled`,
		);
	}
});

await summaryJob.execute();

// handle graceful shutdown
const shutdown = () => {
	logger.info("Shutting down...");

	stop2FAServer();

	for (const [name, job] of jobs) {
		logger.info(`Stopping job for account "${name}"`);
		job.stop();
	}

	process.exit(0);
};

process.on("SIGINT", shutdown);
