import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: "ynab-connect",
	description: "Tool to sync unsupported sources to YNAB tracking accounts",
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: "Home", link: "/" },
			{ text: "Quick Start", link: "/quick-start" },
		],

		sidebar: [
			{
				text: "Get Started",
				items: [
					{ text: "Quick Start", link: "/quick-start" },
					{ text: "Configuration", link: "/configuration" },
				],
			},
			{
				text: "Features",
				items: [{ text: "Browser", link: "/browser" }],
			},
			{
				text: "Connectors",
				items: [
					{ text: "Trading 212", link: "/connectors/trading-212" },
					{ text: "UK Student Loan", link: "/connectors/uk-student-loan" },
				],
			},
		],

		socialLinks: [
			{ icon: "github", link: "https://github.com/simse/ynab-connect" },
		],
	},
});
