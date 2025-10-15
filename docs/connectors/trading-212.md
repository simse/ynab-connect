---
title: Trading 212
---
# Trading 212

This connector uses the Trading 212 API to sync the value of your Trading 212 Stocks ISA.

It is only available in the UK.

## Obtaining an API key
See the [following guide](https://helpcentre.trading212.com/hc/en-us/articles/14584770928157-Trading-212-API-key) for how to get your API key and secret.

### Notes on the API key
You may restrict the API key to your own IP address for increased security.

The only required permission on the key is "Account".

## Sample configuration
```yaml
- name: "Stocks ISA" # Friendly name for the account
  type: "trading212"
  interval: "0 * * * *" # Cron expression for how often to sync
  ynabAccountId: "YOUR_YNAB_ACCOUNT_ID" # YNAB account to sync to
  trading212ApiKey: "YOUR_TRADING_212_API_KEY" 
  trading212ApiSecret: "YOUR_TRADING_212_API_SECRET"
```