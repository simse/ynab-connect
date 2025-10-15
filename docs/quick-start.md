---
title: Quick Start
---
# Quick Start

The only way to run `ynab-connect` is via Docker or Podman.

## YNAB API Token
Obtain a Personal Access Token from the [developer settings](https://app.ynab.com/settings/developer).

Use [this guide](./guide/create-ynab-token) if you need help.

## YNAB Budget ID

You can find your Budget ID in the URL when viewing your budget in YNAB. It is the long string of letters and numbers after `app.ynab.com`.

`https://app.ynab.com/<THIS_IS_YOUR_BUDGET_ID>/budget`.

## Create a config file

Save the following as `config.yaml`:
```yaml
ynab:
  accessToken: "YOUR_YNAB_ACCESS_TOKEN"
  budgetId: "YOUR_YNAB_BUDGET_ID"
accounts:
  - name: "Stocks ISA" # Friendly name for the account
    type: "trading212"
    interval: "0 * * * *" # Cron expression for how often to sync
    ynabAccountId: "YOUR_YNAB_ACCOUNT_ID" # YNAB account to sync to
    trading212ApiKey: "YOUR_TRADING_212_API_KEY" 
    trading212ApiSecret: "YOUR_TRADING_212_API_SECRET"
```

This config syncs the value of a Trading 212 Stocks ISA to YNAB every hour. There are other connectors available, see the list in the sidebar.

## Start the `ynab-connect` Docker container

```bash
docker run -d --name ynab-connect \
  --mount type=bind,src=./config.yaml,dst=/config.yaml \
  ghcr.io/simse/ynab-connect:latest
```