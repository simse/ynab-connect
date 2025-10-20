import { defineConfig } from "vitepress";
import { generateSidebar } from "vitepress-sidebar";

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

		sidebar: generateSidebar({
			documentRootPath: "docs",
			useTitleFromFrontmatter: true,
			hyphenToSpace: true,
			capitalizeFirst: true,
			manualSortFileNameByPriority: ["quick-start.md", "config-reference.md"],
			useFolderTitleFromIndexFile: true,
			sortMenusByFrontmatterOrder: true,
		}),

		socialLinks: [
			{ icon: "github", link: "https://github.com/simse/ynab-connect" },
		],
	},
	cleanUrls: true,
});
