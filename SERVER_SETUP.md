# Business Registration Email Notification System

This document explains how to set up and run the backend server for the NKAY business registration email notification system.

## Overview

When a new business completes and submits the NKAY business registration form, the system automatically sends an email notification to the administrator with all the business information.

## Prerequisites

- Node.js installed on your system
- A Gmail account (or other SMTP email service)
- Basic knowledge of environment variables

## Installation

1. Install the new dependencies:
```bash
npm install
```

This will install:
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management
- `nodemailer` - Email sending service

## Configuration

### 1. Set up Email Service

#### Option A: Gmail (Recommended)

1. Go to your Google Account settings
2. Enable 2-Factor Authentication
3. Generate an App Password:
   - Go to Security > 2-Step Verification > App passwords
   - Create a new app password for "Mail"
   - Copy the generated password

#### Option B: Other SMTP Services

You can use other email services like SendGrid, Mailgun, or your own SMTP server. Update the `.env` file accordingly.

### 2. Configure Environment Variables

Edit the `.env` file in the project root:

```env
# Server Configuration
PORT=3001

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@nkay.com

# Administrator Email
ADMIN_EMAIL=admin@nkay.com
```

**Important:**
- Replace `your-email@gmail.com` with your Gmail address
- Replace `your-app-password` with the Gmail App Password you generated
- Replace `admin@nkay.com` with the administrator's email address

## Running the Server

### Start the Backend Server

In a separate terminal, run:

```bash
npm run server
```

The server will start on port 3001 (or the port specified in `.env`).

### Start the Frontend

In another terminal, run:

```bash
npm run dev
```

## How It Works

1. **User fills registration form** - Business owner completes the 3-step registration form
2. **Form validation** - Required fields are validated before submission
3. **API call** - Frontend sends POST request to `/api/business/register`
4. **Email notification** - Server sends formatted HTML email to administrator
5. **Success response** - User sees success screen with confirmation

## Email Template

The email sent to the administrator includes:

### Business Information
- Business Name
- Business Type
- Business Category
- Business Description

### Contact Information
- Business Email
- Business Phone
- Preferred Contact Method (Email/Phone/WhatsApp)

### Location Information
- Country
- Region
- City
- Business Address

### Registration Details
- Registration Date
- Status (Pending Review)

## API Endpoint

### POST /api/business/register

**Request Body:**
```json
{
  "businessName": "My Business",
  "businessType": "retail",
  "businessCategory": "electronics",
  "email": "business@example.com",
  "phone": "+233 XX XXX XXXX",
  "address": "123 Main Street",
  "city": "Accra",
  "region": "Greater Accra",
  "country": "Ghana",
  "preferredContactMethod": "email",
  "description": "Business description here",
  "logo": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Business registration submitted successfully"
}
```

## Troubleshooting

### Email Not Sending

1. **Check SMTP credentials** - Verify EMAIL_USER and EMAIL_PASS are correct
2. **Check firewall** - Ensure port 587 is not blocked
3. **Check Gmail settings** - Ensure "Less secure app access" is enabled if using older Gmail accounts
4. **Check logs** - Look for error messages in the server console

### Server Not Starting

1. **Check port availability** - Ensure port 3001 is not in use
2. **Check dependencies** - Run `npm install` to ensure all packages are installed
3. **Check Node.js version** - Ensure you're using a compatible Node.js version

### CORS Errors

If you encounter CORS errors when the frontend tries to connect to the backend:

1. The server is configured to allow CORS from all origins
2. If you need to restrict origins, modify the CORS configuration in `server/index.js`

## Security Notes

- **Never commit `.env` file** to version control
- **Use strong passwords** for email accounts
- **Consider using environment-specific configs** for development and production
- **Implement rate limiting** in production to prevent abuse
- **Add authentication** to protect the API endpoints

## Production Deployment

For production deployment:

1. Use a production-grade email service (SendGrid, Mailgun, AWS SES)
2. Use environment variables for all sensitive data
3. Implement proper error handling and logging
4. Add rate limiting and authentication
5. Use HTTPS for all communications
6. Set up monitoring and alerts

## Checkout & Flutterwave Payments

The storefront checkout (`/customer/checkout`) creates the order on the server.
The server never trusts prices sent by the browser: it prices every item from
`server/data/catalogue.json`.

NKAY collects payments through **Flutterwave Standard hosted checkout**. Customers
can pay with mobile money (MTN MoMo, Telecel Cash, AT Money), debit/credit cards or
bank transfer. The customer never sends money to a personal number, and card or
wallet credentials are only entered on Flutterwave's page. The flow is:

1. Customer fills in delivery details and places the order. The order is created
   with `paymentStatus: "pending"`.
2. The server asks Flutterwave to create a hosted checkout for the exact order
   total, with a unique `tx_ref`. The order moves to
   `paymentStatus: "processing"` and the customer is redirected to Flutterwave's
   payment page.
3. The customer pays on Flutterwave. Flutterwave redirects them back to
   `/order/:orderId` with `status`, `tx_ref` and `transaction_id` in the query
   string.
4. Flutterwave also posts a `charge.completed` webhook to
   `/api/payments/flutterwave/webhook`. The webhook is treated as a hint only:
   the server ignores the body's claimed status and **re-queries Flutterwave's
   transaction verification endpoint**. Only a `successful` result whose `tx_ref`
   matches the order, whose currency is GHS and whose amount equals the order
   total marks the order paid.
5. On a verified payment the order becomes `paid` / `confirmed` and stock is
   decremented exactly once, in the same synchronous step that checks the order.
6. If no webhook arrives, the order page polls the server every 5 seconds and a
   background reconciler re-checks live payments every minute.
7. If Flutterwave confirms money but the order cannot be fulfilled automatically
   (stock sold out, amount mismatch, unexpected currency), the order moves to
   `paymentStatus: "attention"` instead. The customer is told not to pay again
   and an admin arranges a refund.

The browser can never mark an order paid. It can only ask the server to
re-check, and the server decides from Flutterwave's response.

### 1. Regenerate the product catalogue

Prices and stock are generated from the frontend product data:

```bash
npm run sync:catalogue
```

Run this whenever products or prices change in `src/data/marketplaceData.ts` or
`src/data/products.ts`.

### 2. Get Flutterwave API keys

1. Create an account at <https://dashboard.flutterwave.com> and complete business
   verification for NKAY.
2. Open **Settings → API Keys** and copy the **Public key** and **Secret key**.
   Use the test keys while developing and switch to live keys after go-live.
3. Open **Settings → Webhooks**, set the webhook URL to
   `${PUBLIC_SERVER_URL}/api/payments/flutterwave/webhook`, and choose a **secret
   hash**. Flutterwave sends that value in the `verif-hash` header on every
   webhook.
4. Make sure the server and the storefront are reachable over **public HTTPS**.
   Flutterwave cannot redirect customers or deliver webhooks to `localhost`.

### 3. Environment variables

Copy `.env.example` to `.env` and fill in:

```env
# Required for checkout to accept payments
FLW_SECRET_KEY=FLWSECK_TEST-...
FLW_PUBLIC_KEY=FLWPUBK_TEST-...

# Secret hash configured in Settings -> Webhooks
FLW_WEBHOOK_SECRET_HASH=generate-a-long-random-string

# Public URL of the storefront, e.g. https://nkay.example
# Flutterwave returns the customer to ${PUBLIC_APP_URL}/order/:orderId
PUBLIC_APP_URL=https://nkay.example

# Public HTTPS base URL of this server, e.g. https://api.nkay.example
# The webhook becomes ${PUBLIC_SERVER_URL}/api/payments/flutterwave/webhook
# Falls back to PUBLIC_APP_URL when omitted.
PUBLIC_SERVER_URL=https://api.nkay.example

# Optional (defaults shown)
FLW_SESSION_MINUTES=60
FLW_BASE_URL=https://api.flutterwave.com/v3
FLW_TIMEOUT_MS=15000
```

Secrets are read only on the server and are never sent to the browser. Checkout is
disabled until `FLW_SECRET_KEY` and `PUBLIC_APP_URL` (or `PUBLIC_SERVER_URL`) exist.
`/api/health` reports:

```json
{
  "payments": {
    "method": "flutterwave",
    "configured": true,
    "callbackConfigured": true,
    "missing": []
  }
}
```

When something is missing, `missing` lists the variable names and the checkout
shows a setup message instead of accepting money.

### 4. Admin operations

Open **Admin → Orders & payments**. The filters are **Needs attention**,
**In progress**, **Awaiting payment**, **Paid**, **Not confirmed** and
**All orders**.

The top card shows whether Flutterwave is configured and which key mode is in use
(test or live), the webhook URL and whether it is HTTPS, which credentials are set,
the checkout return URL and the checkout session length. Configuration is
environment-based, so there is nothing to edit in the dashboard.

For any unpaid order, **Re-check with Flutterwave** asks Flutterwave for the latest
status and applies the same verification rules as the customer flow. Use it when a
customer says they paid but the page has not updated.

**Needs attention** means Flutterwave confirmed money but automatic fulfilment was
not safe. Never ask that customer to pay again. Compare the amount paid and the
order total, then refund or fulfil manually.

An unpaid checkout link expires after `FLW_SESSION_MINUTES` (60 by default). The
customer can start a new payment from the order page; the server reuses a live link
instead of creating duplicates and caps how many links an order can have.

### 5. Data storage

Orders and stock overrides are stored as JSON under `server/models/data/`
(`orders.json`, `stock.json`). These files are runtime state and are git-ignored.
On Vercel they fall back to `/tmp`, which is ephemeral and not shared between
instances — configure a persistent database (and a persistent stock ledger)
before taking real orders in production.

### 6. Testing without live credentials

`FLW_BASE_URL` exists so the integration can be exercised against a local stub.
When using a stub, still set `FLW_SECRET_KEY` and `PUBLIC_APP_URL` so the normal
code path runs. Never point that variable at a third-party server in production.

Flutterwave test keys are the easiest way to exercise the real hosted checkout:
test transactions are authorised automatically after a few seconds and no real
money moves.

The integration is also safe to test manually:

- Submitting the same order twice with the same `idempotencyKey` returns the
  original order instead of creating a second one.
- A webhook and a page poll arriving together mark the order paid once.
- A webhook with a missing or wrong `verif-hash` is rejected with `401`.
- A webhook for an unknown `tx_ref` is acknowledged and ignored.
- A paid amount that does not match the order total never decrements stock; the
  order becomes `attention`.
- An expired checkout link can be re-issued from the order page without creating a
  duplicate charge.

## Support

For issues or questions about the email notification system, please contact the development team.
