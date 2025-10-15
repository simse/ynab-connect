---
title: Browser
---
# Set up a browser
Some sources require a browser to be configured. `ynab-connect` uses Puppeteer for browser automation.

Set up a headless browser like [Browserless](https://github.com/browserless/browserless) and add the following to your configuration:
```yaml
browser:
  endpoint: "ws://your-browserless-endpoint:3000"
```

## Why might a browser be needed?
Some sources do not provide an API to access your data. In these cases, `ynab-connect` can use a headless browser to log in to your account and retrieve your data.