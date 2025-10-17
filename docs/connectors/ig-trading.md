---
title: IG Trading
---
# IG Trading

This connector uses the IG Trading API to sync the balance of your IG trading account.

## Obtaining API credentials

To use this connector, you need to obtain API credentials from IG:

1. Log in to your IG account
2. Navigate to your account settings or API management section
3. Generate an API key for your account
4. Note down your username, password, and API key
5. Find your account ID from your account details

### Notes on the API key

The API key provides access to your IG account data. Keep it secure and do not share it.

The connector requires read access to account information to retrieve your balance.

### Finding your account ID

Your account ID can be found in your IG account details. If you have multiple accounts (e.g., CFD and Spread Betting), you will need to specify which account ID to sync.

## Sample configuration

```yaml
- name: "IG Trading Account" # Friendly name for the account
  type: "ig_trading"
  interval: "0 * * * *" # Cron expression for how often to sync
  ynabAccountId: "YOUR_YNAB_ACCOUNT_ID" # YNAB account to sync to
  igUsername: "YOUR_IG_USERNAME"
  igPassword: "YOUR_IG_PASSWORD"
  igApiKey: "YOUR_IG_API_KEY"
  igAccountId: "YOUR_IG_ACCOUNT_ID" # The specific account to sync
```
