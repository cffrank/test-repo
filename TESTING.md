# Testing Checklist

## 1. Authentication Flow

- [ ] Visit http://localhost:3000 - Landing page should load
- [ ] Click "Get Started" → redirects to `/auth/sign-in`
- [ ] Try email/password signup or Google OAuth
- [ ] Verify session persists after page refresh
- [ ] Verify `/dashboard` route is protected (redirects if not authenticated)

## 2. Dashboard Features

- [ ] Create a project with name and description
- [ ] Select project from dropdown
- [ ] Upload sample CSV billing data
- [ ] Verify expenses appear in the chart

## 3. AI Analysis

- [ ] Upload CSV or use existing data
- [ ] Trigger AI analysis
- [ ] Verify optimization tasks appear
- [ ] Test "Complete" and "Dismiss" actions on tasks

## 4. Account Management

- [ ] Visit `/account/profile` - View account details
- [ ] Visit `/account/sessions` - View active sessions
- [ ] Visit `/account/mfa` - Enable 2FA (optional)

## CSV Test Data

Use this sample CSV format for testing:

```csv
Date,Service,Account,Region,Category,Amount
2025-01-01,AWS EC2,main-account,us-east-1,Computing,120.50
2025-01-01,AWS S3,main-account,us-east-1,Storage,45.00
2025-01-02,AWS RDS,main-account,us-east-1,Database,89.00
2025-01-03,AWS Lambda,main-account,us-east-1,Computing,23.75
2025-01-04,AWS CloudFront,main-account,global,Content Delivery,67.00
```
