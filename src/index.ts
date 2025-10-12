import Baker from "cronbake";
import config from "./config.ts";
import { connectors } from "./connectors";
import { adjustBalance } from "./ynab.ts";

// scheduler
const baker = new Baker({
	enableMetrics: true,
	/*persistence: {
		enabled: true,
		autoRestore: false,
		strategy: "file",
		provider: new FilePersistenceProvider("./cronbake-state.json"),
	},*/
	schedulerConfig: {
		maxHistoryEntries: 10000,
		useCalculatedTimeouts: true,
	},
});

// schedule summary job
baker.add({
	name: "summary-job",
	cron: "@hourly",
	callback: async () => {
		console.log("Summary job running... (TO BE IMPLEMENTED)");
	},
	persist: false,
	start: true,
});

// dynamically add jobs based on config
for (const account of config.accounts) {
	baker.add({
		name: `sync-${account.name}`,
		cron: account.interval,
		callback: async () => {
			console.log(
				`[${account.name}] Starting sync job with provider: ${account.type}`,
			);

			// get balance
			let balance = 0;

			try {
				balance = await connectors[account.type](account);
			} catch (e) {
				console.error(`[${account.name}] Error fetching balance:`, e);
				return;
			}
			console.log(`[${account.name}] Fetched balance: ${balance}`);

			// adjust YNAB account balance
			try {
				await adjustBalance(account.ynabAccountId, balance);
				console.log(
					`[${account.name}] Adjusted YNAB account ${account.ynabAccountId} to balance: ${balance}`,
				);
			} catch (e) {
				console.error(
					`[${account.name}] Error adjusting YNAB account ${account.ynabAccountId}:`,
					e,
				);
			}
		},
		persist: true,
		start: true,
		immediate: true,
	});
}
