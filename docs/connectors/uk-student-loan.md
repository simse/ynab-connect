---
title: Bruh
---
# UK Student Loan
Sync your UK Student Loan balance from the Student Loans Company website.

This connection uses a [headless browser](/browser) to log in to your account and retrieve your balance.

## Sample configuration
```yaml
- name: "Student Loan"
  type: "uk_student_loan"
  interval: "0 0 * * *"
  ynabAccountId: "YOUR_YNAB_ACCOUNT_ID"
  email: "YOUR_SLC_EMAIL"
  password: "YOUR_SLC_PASSWORD"
  secretAnswer: "YOUR_SLC_SECRET_ANSWER"
```