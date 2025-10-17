import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitepress";

// Helper function to extract title from markdown frontmatter
function extractTitle(filePath: string): string {
	const content = fs.readFileSync(filePath, "utf-8");
	const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

	if (frontmatterMatch) {
		const titleMatch = frontmatterMatch[1].match(/title:\s*(.+?)(?:\r?\n|$)/);
		if (titleMatch) {
			return titleMatch[1].trim().replace(/['"]/g, "");
		}
	}

	// Fallback to filename
	return path
		.basename(filePath, ".md")
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

// Generate sidebar items from directory
function generateSidebarItems(dir: string, urlPrefix: string) {
	const fullPath = path.join(__dirname, "..", dir);

	if (!fs.existsSync(fullPath)) {
		return [];
	}

	return fs
		.readdirSync(fullPath)
		.filter((file) => file.endsWith(".md"))
		.map((file) => {
			const filePath = path.join(fullPath, file);
			const title = extractTitle(filePath);
			const link = `/${urlPrefix}/${path.basename(file, ".md")}`;
			return { text: title, link };
		})
		.sort((a, b) => a.text.localeCompare(b.text));
}

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
				items: [{ text: "Quick Start", link: "/quick-start" }],
			},
			{
				text: "Configuration",
				items: [
					{ text: "Overview", link: "/configuration" },
					{ text: "Configuration Reference", link: "/config-reference" },
					{ text: "Browser Setup", link: "/browser" },
					{ text: "SMS Forwarding for 2FA", link: "/guide/sms-forwarding" },
				],
			},
			{
				text: "Guides",
				items: [
					{ text: "Create YNAB Token", link: "/guide/create-ynab-token" },
				],
			},
			{
				text: "Connectors",
				items: generateSidebarItems("connectors", "connectors"),
			},
		],

		socialLinks: [
			{ icon: "github", link: "https://github.com/simse/ynab-connect" },
		],
	},
});
