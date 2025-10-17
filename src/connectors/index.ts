import type { Config } from "../config.ts";
import { igTradingConnector } from "./igTrading.ts";
import { standardLifePensionConnector } from "./standardLifePension.ts";
import { getTrading212Balance } from "./trading212.ts";
import { getUkStudentLoanBalance } from "./ukStudentLoan.ts";

type AccountType = Config["accounts"][number]["type"];

const connectors: {
	[type in AccountType]: {
		friendlyName: string;
		getBalance: (account: Config["accounts"][number]) => Promise<AccountResult>;
	};
} = {
	trading212: {
		friendlyName: "Trading 212",
		getBalance: async (account) => {
			if (account.type !== "trading212") {
				throw new Error("Invalid account type for Trading 212 connector");
			}

			return getTrading212Balance(
				account.trading212ApiKey,
				account.trading212SecretKey,
			);
		},
	},
	uk_student_loan: {
		friendlyName: "UK Student Loan",
		getBalance: async (account) => {
			if (account.type !== "uk_student_loan") {
				throw new Error("Invalid account type for UK Student Loan connector");
			}

			return getUkStudentLoanBalance(
				account.email,
				account.password,
				account.secretAnswer,
			);
		},
	},
	standard_life_pension: standardLifePensionConnector,
	ig_trading: igTradingConnector,
};

type AccountTransaction = {
	date: Date;
	amount: number;
	type: "WITHDRAWAL" | "DEPOSIT" | "INTEREST";
};

type AccountResult =
	| {
			// Balance in the account's native currency
			balance: number;
			transactions?: AccountTransaction[];
	  }
	| {
			// Error handling
			error: string;
			canRetry: boolean;
	  };

interface Connector {
	friendlyName: string;

	getBalance: (account: Config["accounts"][number]) => Promise<AccountResult>;
}

export { connectors };

export type { AccountResult, AccountTransaction, Connector };
