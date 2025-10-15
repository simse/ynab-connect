---
title: Configuration
---
# Configuration
Here's a full example configuration file with all available options:

```yaml
ynab:
  accessToken: "<YNAB_ACCESS_TOKEN>"
  budgetId: "<YNAB_BUDGET_ID>"
browser:
  endpoint: "<BROWSERLESS_ENDPOINT>" # Optional
accounts:
   - name: "Student Loan"
     type: "uk_student_loan"
     interval: "0 2 * * *"
     ynabAccountId: "<YNAB_ACCOUNT_ID>"
     email: "<SLC_EMAIL>"
     password: "<SLC_PASSWORD>"
     secretAnswer: "<SLC_SECRET_ANSWER>"
   - name: "Trading 212"
     type: "trading212"
     interval: "0 * * * *"
     ynabAccountId: "<YNAB_ACCOUNT_ID>"
     trading212ApiKey: "<TRADING_212_API_KEY>"
     trading212SecretKey: "<TRADING_212_API_SECRET>"
```

## Notes
You may configure multiple accounts of the same type.