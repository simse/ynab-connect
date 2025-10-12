import type config from "../config.ts";
import { getTrading212Balance } from "./trading212.ts";
import { getUkStudentLoanBalance } from "./ukStudentLoan.ts";

type AccountType = (typeof config.accounts)[number]["type"];

const connectors: {
	[type in AccountType]: (
		account: Extract<(typeof config.accounts)[number], { type: type }>,
	) => Promise<number>;
} = {
	trading212: async (account) => {
		return getTrading212Balance(
			account.trading212ApiKey,
			account.trading212SecretKey,
		);
	},
	uk_student_loan: async (account) =>
		getUkStudentLoanBalance(
			account.email,
			account.password,
			account.secretAnswer,
		),
};

export { connectors };
