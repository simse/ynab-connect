---
title: Browser Setup
---
# Browser Setup

Some connectors require browser automation to access your data. `ynab-connect` uses Puppeteer for browser automation.

## When is this needed?

Some financial institutions do not provide an API to access your data. In these cases, `ynab-connect` can use a headless browser to log in to your account and retrieve your balance.

Connectors that require browser automation will indicate this in their documentation.

## Configuration

Set up a headless browser service like [Browserless](https://github.com/browserless/browserless) and add the following to your configuration:

```yaml
browser:
  endpoint: "wss://your-browserless-endpoint"
```

### Using Browserless Cloud

The easiest way to get started is with [Browserless Cloud](https://www.browserless.io/):

1. Sign up for a free account
2. Get your connection URL (includes your token)
3. Add it to your configuration:

```yaml
browser:
  endpoint: "wss://chrome.browserless.io?token=YOUR_TOKEN"
```

### Self-Hosting Browserless

You can also run Browserless yourself using Docker:

```bash
docker run -d -p 3000:3000 browserless/chrome
```

Then configure:

```yaml
browser:
  endpoint: "ws://localhost:3000"
```

See the [Browserless documentation](https://docs.browserless.io/) for more details on self-hosting.