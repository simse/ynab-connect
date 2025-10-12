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

## Browser
Some sources require a browser to be configured. `ynab-connect` uses Puppeteer for browser automation.

Set up a headless browser like [Browserless](https://github.com/browserless/browserless) and add the following to your configuration:
```yaml
browser:
  endpoint: "ws://your-browserless-endpoint:3000"
```

---
## Sources

🌐 = [BROWSER](#browser) REQUIRED

<details>
<summary><h3>Trading 212 <strong>Stocks ISA</strong> 🇬🇧</h3></summary>

Sync the value of your Trading 212 Stocks ISA using the beta API.

See the [following guide](https://helpcentre.trading212.com/hc/en-us/articles/14584770928157-Trading-212-API-key) for how to get your API key and secret.

#### Notes on the API key
You may restrict the API key to your own IP address for increased security.

The only required permission on the key is "Portfolio".

#### Required configuration

```yaml
- name: "Stocks ISA" # Friendly name for the account
  type: "trading212"
  interval: "@daily" # Cron expression for how often to sync
  ynabAccountId: "YOUR_YNAB_ACCOUNT_ID" # YNAB account to sync to
  trading212ApiKey: "YOUR_TRADING_212_API_KEY" 
  trading212ApiSecret: "YOUR_TRADING_212_API_SECRET"
```
</details>

<details>
<summary><h3>UK Student Loan 🇬🇧🌐</h3></summary>

Sync your UK Student Loan balance from the Student Loans Company website.

This sources requires a [browser](#browser) to be configured.

#### Required configuration

```yaml
- name: "Student Loan"
  type: "uk_student_loan"
  interval: "@weekly"
  ynabAccountId: "YOUR_YNAB_ACCOUNT_ID"
  email: "YOUR_SLC_EMAIL"
  password: "YOUR_SLC_PASSWORD"
  secretAnswer: "YOUR_SLC_SECRET_ANSWER"
```

</details>