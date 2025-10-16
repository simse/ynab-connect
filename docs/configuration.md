---
title: Overview
---
# Configuration Overview

ynab-connect uses a YAML configuration file to define which accounts to sync and how to connect to YNAB.

## Configuration File Location

- **Production**: `/config.yaml`

## Basic Structure

The configuration file has three main sections:

### YNAB Configuration

Configure your YNAB API access token and budget ID. See the [Create YNAB Token](/guide/create-ynab-token) guide for instructions.

```yaml
ynab:
  accessToken: "your-ynab-access-token"
  budgetId: "your-ynab-budget-id"
```

### Accounts

Define the accounts you want to sync. Each account requires:
- A unique name
- The connector type (e.g., `trading212`, `uk_student_loan`)
- A sync interval (cron expression)
- The YNAB account ID to sync to
- Connector-specific credentials

```yaml
accounts:
  - name: "My Trading 212"
    type: "trading212"
    interval: "0 * * * *"  # Every hour
    ynabAccountId: "your-ynab-account-id"
    trading212ApiKey: "your-api-key"
    trading212SecretKey: "your-api-secret"
```

### Browser (Optional)

Some connectors require browser automation. See [Browser Setup](/browser) for details.

```yaml
browser:
  endpoint: "wss://chrome.browserless.io?token=YOUR_TOKEN"
```

## Next Steps

- See the [Configuration Reference](/config-reference) for a complete list of all configuration options
- Check out the [Connectors](/connectors/trading-212) section for connector-specific setup guides
- Use [crontab.guru](https://crontab.guru/) to create cron expressions for sync intervals

## Notes

- You can configure multiple accounts of the same type
- Each account must have a unique name
- The configuration file is validated on startup