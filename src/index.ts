import cron, { type ScheduledTask } from "node-cron";
import { start2FAServer, stop2FAServer } from "./2fa.ts";
import config from "./config.ts";
import logger, { createLogger } from "./logger.ts";
import { runSyncJob } from "./runtime.ts";
import { ensureBudgetExists } from "./ynab.ts";

logger.info("Welcome to ynab-connect");

// check YNAB budget exists
const budgetExists = await ensureBudgetExists(config.ynab.budgetId);

if (!budgetExists) {
	logger.error(
		`Budget with ID ${config.ynab.budgetId} does not exist or is inaccessible with the provided access token.`,
	);
	process.exit(1);
}

logger.info(`Using YNAB budget ID: ${config.ynab.budgetId}`);

// start 2FA server
start2FAServer(config.server.port);

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

	// await task.execute();
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
