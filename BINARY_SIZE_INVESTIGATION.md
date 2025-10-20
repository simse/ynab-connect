# Binary Size Investigation

## Executive Summary

The compiled binary for ynab-connect is large (estimated 200-300MB+) primarily because **Puppeteer is always bundled**, even when users only need API-based connectors that don't require browser automation.

## Root Cause Analysis

### Primary Issue: Puppeteer Always Bundled (~150-200MB)

Puppeteer is one of the largest npm packages because it includes Chromium browser binaries. It's currently bundled for ALL users due to eager imports throughout the codebase.

**The Import Chain:**

```
src/index.ts (entry point)
  ↓
src/runtime.ts:4
  import { connectors } from "./connectors"
  ↓
src/connectors/index.ts:2-5
  import { standardLifePensionConnector } from "./standardLifePension.ts"
  import { getUkStudentLoanBalance } from "./ukStudentLoan.ts"
  ↓
src/connectors/standardLifePension.ts:2
src/connectors/ukStudentLoan.ts:1
  import { getBrowser } from "../browser"
  ↓
src/browser/index.ts:1
  import puppeteer from "puppeteer"  ← ALWAYS BUNDLED
```

**Impact:** Even users who only configure Trading212 or IG Trading (API-based connectors) get Puppeteer bundled in their binary.

### Secondary Issue: All Connectors Always Bundled (~20-50MB)

`src/connectors/index.ts` uses eager imports for all connectors:

```typescript
import { igTradingConnector } from "./igTrading.ts";
import { standardLifePensionConnector } from "./standardLifePension.ts";
import { getTrading212Balance } from "./trading212.ts";
import { getUkStudentLoanBalance } from "./ukStudentLoan.ts";
```

This means every user gets:
- IG Trading connector + `ig-trading-api` library
- Standard Life connector + browser dependencies
- UK Student Loan connector + browser dependencies
- Trading212 connector

Regardless of which connectors they actually use.

### Dependencies in package.json

```json
"dependencies": {
  "ig-trading-api": "0.13.9",      // ~10-20MB
  "node-cron": "4.2.1",            // ~1MB
  "pino": "10.0.0",                // ~5MB
  "puppeteer": "24.25.0",          // ~150-200MB ← MAIN CULPRIT
  "retry": "0.13.1",               // <1MB
  "yaml": "2.8.1",                 // ~1MB
  "ynab": "2.10.0",                // ~5MB
  "zod": "4.1.12",                 // ~5MB
  "zod-config": "1.3.0",           // <1MB
  "zod-validation-error": "4.0.2"  // <1MB
}
```

## Recommended Solutions

### 🔥 High Priority: Lazy Load Puppeteer

**File:** `src/browser/index.ts`

**Change from:**
```typescript
import puppeteer from "puppeteer";

export const getBrowser = async (): Promise<BrowserAdapter> => {
  const config = await getConfig();
  const endpoint = config.browser?.endpoint;
  const isProduction = Bun.env.NODE_ENV === "production";

  if (!isProduction && !endpoint) {
    const browser = await puppeteer.launch({ headless: false });
    return new PuppeteerAdapter(browser);
  }

  if (!endpoint) {
    throw new Error("Browser endpoint is not configured");
  }

  const browser = await puppeteer.connect({ browserWSEndpoint: endpoint });
  return new PuppeteerAdapter(browser);
};
```

**To:**
```typescript
export const getBrowser = async (): Promise<BrowserAdapter> => {
  const puppeteer = await import("puppeteer");
  const config = await getConfig();
  const endpoint = config.browser?.endpoint;
  const isProduction = Bun.env.NODE_ENV === "production";

  if (!isProduction && !endpoint) {
    const browser = await puppeteer.default.launch({ headless: false });
    return new PuppeteerAdapter(browser);
  }

  if (!endpoint) {
    throw new Error("Browser endpoint is not configured");
  }

  const browser = await puppeteer.default.connect({ browserWSEndpoint: endpoint });
  return new PuppeteerAdapter(browser);
};
```

**Expected Impact:** ~150-200MB reduction for users not using browser-based connectors.

### 🔥 High Priority: Lazy Load Connectors

**File:** `src/connectors/index.ts`

**Change from:**
```typescript
import { igTradingConnector } from "./igTrading.ts";
import { standardLifePensionConnector } from "./standardLifePension.ts";
import { getTrading212Balance } from "./trading212.ts";
import { getUkStudentLoanBalance } from "./ukStudentLoan.ts";

const connectors = {
  trading212: {
    friendlyName: "Trading 212",
    getBalance: async (account) => {
      if (account.type !== "trading212") {
        throw new Error("Invalid account type for Trading 212 connector");
      }
      return getTrading212Balance(account.trading212ApiKey, account.trading212SecretKey);
    },
  },
  // ...
};
```

**To:**
```typescript
const connectors = {
  trading212: {
    friendlyName: "Trading 212",
    getBalance: async (account) => {
      if (account.type !== "trading212") {
        throw new Error("Invalid account type for Trading 212 connector");
      }
      const { getTrading212Balance } = await import("./trading212.ts");
      return getTrading212Balance(account.trading212ApiKey, account.trading212SecretKey);
    },
  },
  uk_student_loan: {
    friendlyName: "UK Student Loan",
    getBalance: async (account) => {
      if (account.type !== "uk_student_loan") {
        throw new Error("Invalid account type for UK Student Loan connector");
      }
      const { getUkStudentLoanBalance } = await import("./ukStudentLoan.ts");
      return getUkStudentLoanBalance(account.email, account.password, account.secretAnswer);
    },
  },
  standard_life_pension: {
    friendlyName: "Standard Life Pension",
    getBalance: async (account) => {
      const { standardLifePensionConnector } = await import("./standardLifePension.ts");
      return standardLifePensionConnector.getBalance(account);
    },
  },
  ig_trading: {
    friendlyName: "IG Trading",
    getBalance: async (account) => {
      const { igTradingConnector } = await import("./igTrading.ts");
      return igTradingConnector.getBalance(account);
    },
  },
};
```

**Expected Impact:** ~20-50MB reduction by only bundling connectors actually used.

### ⚠️ Medium Priority: Switch to puppeteer-core

Consider switching from `puppeteer` to `puppeteer-core` in `package.json`:

```json
"dependencies": {
  "puppeteer-core": "24.25.0"  // instead of "puppeteer"
}
```

**Pros:**
- Much smaller package (~2MB vs ~200MB)
- No bundled Chromium

**Cons:**
- Users MUST provide a browser endpoint via config
- Can't launch local browser in dev mode without additional setup

**Expected Impact:** ~150-200MB reduction (alternative to lazy loading).

### 📊 Medium Priority: Analyze Build Output

Try additional build flags in `package.json`:

```json
"scripts": {
  "build:binary": "bun build src/index.ts --compile --minify --target=bun --outfile ynab-connect"
}
```

Changes:
- Remove `--sourcemaps` (not needed in production)
- Add `--target=bun` (optimize for Bun runtime)

**Expected Impact:** ~5-10MB reduction.

### 💡 Low Priority: Make Dependencies Optional

Consider:
- Making `pino` optional with a simple console logger fallback
- Ensuring `ig-trading-api` is tree-shakeable
- Moving test-only dependencies to devDependencies

**Expected Impact:** ~5-10MB reduction.

## Estimated Size Reductions

| Optimization | Size Reduction | Effort | Priority |
|-------------|----------------|--------|----------|
| Lazy load Puppeteer | 150-200MB | Low | High |
| Lazy load connectors | 20-50MB | Low | High |
| Use puppeteer-core | 150-200MB | Medium | Medium |
| Build optimizations | 5-10MB | Low | Medium |
| Optional dependencies | 5-10MB | Medium | Low |

## Implementation Plan

1. **Lazy load Puppeteer** (`src/browser/index.ts`)
   - Change top-level import to dynamic import
   - Update Puppeteer API calls to use `puppeteer.default`
   - Test with browser-based connectors

2. **Lazy load connectors** (`src/connectors/index.ts`)
   - Convert all connector imports to dynamic imports
   - Update type definitions if needed
   - Test all connector types

3. **Build and measure**
   - Run `bun run build:binary`
   - Measure binary size: `ls -lh ynab-connect`
   - Compare before/after

4. **Test thoroughly**
   - Test each connector type works correctly
   - Verify lazy loading doesn't break functionality
   - Run test suite: `bun test`

5. **Consider puppeteer-core** (follow-up)
   - Evaluate if all users can provide browser endpoint
   - If yes, switch to puppeteer-core
   - Update documentation

## Testing Checklist

After implementing lazy loading:

- [ ] Trading212 connector works (no browser needed)
- [ ] IG Trading connector works (no browser needed)
- [ ] UK Student Loan connector works (requires browser)
- [ ] Standard Life Pension connector works (requires browser)
- [ ] Binary size reduced significantly
- [ ] All unit tests pass
- [ ] Type checking passes (`bun types`)
- [ ] Linting passes (`bun lint`)

## References

- Puppeteer package size: https://bundlephobia.com/package/puppeteer@24.25.0
- Bun build documentation: https://bun.sh/docs/bundler
- Dynamic imports in TypeScript: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-4.html#dynamic-import-expressions
