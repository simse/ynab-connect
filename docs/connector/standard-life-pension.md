---
title: Standard Life Pension
---
# Standard Life Pension

Sync your Standard Life UK pension balance.

This connector uses a [headless browser](/browser) to log in to your account and retrieve your pension balance.

This connector is only available for UK accounts.

## Two-factor authentication

Standard Life requires two-factor authentication via SMS. You will need to set up SMS forwarding to automatically provide the code.

See the [SMS forwarding guide](/guide/sms-forwarding) for instructions on how to set this up.

## Finding your policy number

To find your policy number:

1. Log in to [Standard Life online](https://online.standardlife.com/secure/customer-authentication-client/customer/login)
2. Navigate to your pension dashboard
3. Your policy number will be displayed on your pension plan details

## Sample configuration

```yaml
- name: "Standard Life Pension"
  type: "standard_life_pension"
  interval: "0 0 * * *"
  ynabAccountId: "YOUR_YNAB_ACCOUNT_ID"
  username: "YOUR_STANDARD_LIFE_USERNAME"
  password: "YOUR_STANDARD_LIFE_PASSWORD"
  policyNumber: "YOUR_POLICY_NUMBER"
```
