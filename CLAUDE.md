# Claude Instructions

## Tech Stack

This project uses Bun.

## Useful commands

This projects uses Biome for linting and formatting. You can run it with:

```bash
bun lint
```

and fix with:

```bash
bun lint:fix
```

Prefer fixing with Biome over manually fixing linting errors.

Run type checks with

```bash
bun types
```

## Good Practice

When installing new packages use the `-E` flag to pin the version of the package in `bun.lockb`.

Before implementing a new feature, see if there is an existing implementation in the codebase that you can reuse or extend.

## Testing

Always write unit tests for new features. This projects uses Bun testing. It's very similar to Jest and Vitest. You must import it, describe, etc. from 'bun:test'.

Avoid mocking dependencies, except in cases where the dependency is external (e.g., network requests, database calls).

In cases where you need to mock something external, see if you can mock the network request or database call directly instead of mocking the entire dependency.

## Working with the engineer

Before implementing a new feature, discuss it with the engineer to ensure alignment on the approach and design.

Come up with a plan.

## Coding style

Avoid being too clever. Write code that is easy to read and understand.

E.g. avoid double ternaries, complex one-liners, etc.

Prefer typing out things instead of using advanced TypeScript features that make the code harder to read.

# Writing documentation
This project uses Vitepress for documentation.

When writing documentation, follow the existing style and structure in the docs folder.

Guides go in the `docs/guide` folder.

Connectors go in the `docs/connectors` folder.

Write in a concise and clear manner. Do not use emojis. Do not over explain, but when needed create a guide to explain a concept.

When adding a new guide or connector, update the sidebar in `docs/.vitepress/config.ts` to include the new documentation.