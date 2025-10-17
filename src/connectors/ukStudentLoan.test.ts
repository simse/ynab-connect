import { describe, expect, it } from "bun:test";
import {
	createMockBrowser,
	type MockPageScenario,
} from "../browser/mockBrowser.ts";
import {
	getUkStudentLoanBalance,
	parseBalanceString,
} from "./ukStudentLoan.ts";

describe("UK Student Loan Connector", () => {
	it("should successfully retrieve balance", async () => {
		const mockScenario: MockPageScenario = {
			currentUrl: "about:blank",
			selectorValues: {
				"#balanceId_1": "£45,678.90",
			},
			interactions: [],
			urlTransitions: [
				{
					trigger: {
						type: "goto",
						url: "https://www.gov.uk/sign-in-to-manage-your-student-loan-balance",
					},
					newUrl:
						"https://www.gov.uk/sign-in-to-manage-your-student-loan-balance",
				},
				{
					trigger: { type: "locator.click", selector: "text/Start now" },
					newUrl: "https://www.gov.uk/manage-student-loan/select-option",
				},
				{
					trigger: { type: "locator.click", selector: "text/Continue" },
					newUrl: "https://www.gov.uk/manage-student-loan/login",
				},
				{
					trigger: { type: "locator.click", selector: "text/Login to account" },
					newUrl: "https://www.gov.uk/manage-student-loan/dashboard",
				},
			],
		};

		const mockBrowser = createMockBrowser(mockScenario);

		const result = await getUkStudentLoanBalance(
			"test@example.com",
			"testpassword",
			"testsecret",
			async () => mockBrowser,
		);

		// Verify the result - balance should be negative (it's a loan)
		expect("balance" in result).toBe(true);
		if ("balance" in result) {
			expect(result.balance).toBe(-45678.9);
		}

		// Verify interactions happened in correct order
		expect(mockScenario.interactions).toContainEqual({
			type: "goto",
			url: "https://www.gov.uk/sign-in-to-manage-your-student-loan-balance",
		});
		expect(mockScenario.interactions).toContainEqual({
			type: "locator.click",
			selector: "text/Start now",
		});
		expect(mockScenario.interactions).toContainEqual({
			type: "locator.click",
			selector: "#textForSignIn1",
		});
		expect(mockScenario.interactions).toContainEqual({
			type: "locator.fill",
			selector: "input#userId",
			value: "test@example.com",
		});
		expect(mockScenario.interactions).toContainEqual({
			type: "locator.fill",
			selector: "input#password",
			value: "testpassword",
		});
		expect(mockScenario.interactions).toContainEqual({
			type: "locator.fill",
			selector: "input#secretAnswer",
			value: "testsecret",
		});
	});

	it("should return error when balance element is not found", async () => {
		const mockScenario: MockPageScenario = {
			currentUrl: "about:blank",
			selectorValues: {},
			interactions: [],
			urlTransitions: [
				{
					trigger: {
						type: "goto",
						url: "https://www.gov.uk/sign-in-to-manage-your-student-loan-balance",
					},
					newUrl:
						"https://www.gov.uk/sign-in-to-manage-your-student-loan-balance",
				},
				{
					trigger: { type: "locator.click", selector: "text/Start now" },
					newUrl: "https://www.gov.uk/manage-student-loan/select-option",
				},
				{
					trigger: { type: "locator.click", selector: "text/Continue" },
					newUrl: "https://www.gov.uk/manage-student-loan/login",
				},
				{
					trigger: { type: "locator.click", selector: "text/Login to account" },
					newUrl: "https://www.gov.uk/manage-student-loan/dashboard",
				},
			],
		};

		const mockBrowser = createMockBrowser(mockScenario);

		const result = await getUkStudentLoanBalance(
			"test@example.com",
			"testpassword",
			"testsecret",
			async () => mockBrowser,
		);

		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.error).toBe(
				"Could not find balance element on UK Student Loan page",
			);
			expect(result.canRetry).toBe(false);
		}
	});

	it("should parse various balance formats correctly", async () => {
		const testCases = [
			{ input: "£45,678.90", expected: -45678.9 },
			{ input: "£1,234.56", expected: -1234.56 },
			{ input: "£100", expected: -100 },
			{ input: "£1,000,000.00", expected: -1000000 },
		];

		for (const testCase of testCases) {
			const mockScenario: MockPageScenario = {
				currentUrl: "about:blank",
				selectorValues: {
					"#balanceId_1": testCase.input,
				},
				interactions: [],
				urlTransitions: [
					{
						trigger: {
							type: "goto",
							url: "https://www.gov.uk/sign-in-to-manage-your-student-loan-balance",
						},
						newUrl:
							"https://www.gov.uk/sign-in-to-manage-your-student-loan-balance",
					},
					{
						trigger: { type: "locator.click", selector: "text/Start now" },
						newUrl: "https://www.gov.uk/manage-student-loan/select-option",
					},
					{
						trigger: { type: "locator.click", selector: "text/Continue" },
						newUrl: "https://www.gov.uk/manage-student-loan/login",
					},
					{
						trigger: {
							type: "locator.click",
							selector: "text/Login to account",
						},
						newUrl: "https://www.gov.uk/manage-student-loan/dashboard",
					},
				],
			};

			const mockBrowser = createMockBrowser(mockScenario);

			const result = await getUkStudentLoanBalance(
				"test@example.com",
				"testpassword",
				"testsecret",
				async () => mockBrowser,
			);

			expect("balance" in result).toBe(true);
			if ("balance" in result) {
				expect(result.balance).toBe(testCase.expected);
			}
		}
	});

	it("should handle parseBalanceString edge cases", () => {
		expect(parseBalanceString("£45,678.90")).toBe(45678.9);
		expect(parseBalanceString("£1,234.56")).toBe(1234.56);
		expect(parseBalanceString("£100")).toBe(100);
		expect(parseBalanceString("invalid")).toBe(0);
		expect(parseBalanceString("")).toBe(0);
	});
});
