<div>
    <h1 align="center">ynab-connect</h1>
    <p align="center">Tool to sync unsupported sources to YNAB tracking accounts.</p>
</div>

---

> [!WARNING]  
> `ynab-connect` is still in early development. You may encounter bugs or missing features. Please report any issues you find right here on Github.

## Supported Sources
- Trading 212
- UK Student Loans

## Quick start

#### Create a config file

```yaml
ynab:
  accessToken: "YOUR_YNAB_ACCESS_TOKEN"
  budgetId: "YOUR_YNAB_BUDGET_ID"
accounts:
  - name: "Stocks ISA" # Friendly name for the account
    type: "trading212"
    interval: "@daily" # Cron expression for how often to sync
    ynabAccountId: "YOUR_YNAB_ACCOUNT_ID" # YNAB account to sync to
    trading212ApiKey: "YOUR_TRADING_212_API_KEY" 
    trading212ApiSecret: "YOUR_TRADING_212_API_SECRET"
```

#### Start `ynab-connect` Docker container

```bash
docker run -d --name ynab-connect \
  --mount type=bind,src=./config.yaml,dst=/config.yaml \
  ghcr.io/simse/ynab-connect:latest
```