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

## Checkout & ExpressPay Payments

The storefront checkout (`/customer/checkout`) creates the order on the server.
The server never trusts prices sent by the browser: it prices every item from
`server/data/catalogue.json`.

NKAY collects payments through the **ExpressPay (Ghana) Merchant API** hosted
checkout. Customers can pay with mobile money (MTN MoMo, Telecel Cash, AT Money),
debit/credit cards or bank transfer. The customer never sends money to a personal
number, and card or wallet credentials are only entered on ExpressPay's page. The
flow is:

1. Customer fills in delivery details and places the order. The order is created
   with `paymentStatus: "pending"`.
2. The server calls `POST /api/submit.php` with the exact order total and a unique
   `order-id`. ExpressPay returns a checkout `token`. The order moves to
   `paymentStatus: "processing"` and the customer is redirected to
   `https://expresspaygh.com/api/checkout.php?token=…` (or the sandbox host).
3. The customer pays on ExpressPay. ExpressPay redirects them back to
   `/order/:orderId?order-id=…&token=…` in the browser.
4. ExpressPay also sends a `post-url` callback to
   `/api/payments/expresspay/callback` with just `order-id` and `token`.
   ExpressPay callbacks are **not signed**, so the payload is treated as a hint
   only: the server ignores it and **queries the ExpressPay Query API**.
5. Only a Query API `result: 1` whose token and `order-id` match the order, whose
   currency is GHS and whose amount equals the order total marks the order paid.
6. On a verified payment the order becomes `paid` / `confirmed` and stock is
   decremented exactly once, in the same synchronous step that checks the order.
7. If no callback arrives, the order page polls the server every 5 seconds and a
   background reconciler re-checks live payments every minute.
8. If ExpressPay confirms money but the order cannot be fulfilled automatically
   (stock sold out, amount mismatch, unexpected currency), the order moves to
   `paymentStatus: "attention"` instead. The customer is told not to pay again
   and an admin arranges a refund.

The browser can never mark an order paid. It can only ask the server to
re-check, and the server decides from ExpressPay's Query API response.

### 1. Regenerate the product catalogue

Prices and stock are generated from the frontend product data:

```bash
npm run sync:catalogue
```

Run this whenever products or prices change in `src/data/marketplaceData.ts` or
`src/data/products.ts`.

### 2. Get ExpressPay credentials

1. Create a merchant account at <https://expresspaygh.com> and complete the
   business/KYC verification for NKAY.
2. Ask ExpressPay for your **merchant ID** and **API key**. Sandbox credentials
   use <https://sandbox.expresspaygh.com>; live credentials use
   <https://expresspaygh.com>.
3. **Allowlisting (important):** ExpressPay often restricts API calls to
   allowlisted merchant server IPs and returns `status: 4` (Invalid IP)
   otherwise. Ask ExpressPay to allow this deployment's egress IPs — Vercel
   serverless egress IPs are dynamic and change — or route the submit/query calls
   through a fixed-IP proxy (for example a small VPS).
4. Register the callback URL with ExpressPay if your account requires it:
   `${PUBLIC_SERVER_URL}/api/payments/expresspay/callback`. The checkout request
   also sends it as `post-url` on every payment.
5. Make sure the server and the storefront are reachable over **public HTTPS**.
   ExpressPay cannot redirect customers or deliver callbacks to `localhost`.

### 3. Environment variables

Copy `.env.example` to `.env` and fill in:

```env
# Required for checkout to accept payments
EXPAY_MERCHANT_ID=your-merchant-id
EXPAY_API_KEY=your-api-key

# "sandbox" for testing, "live" for real money
EXPAY_ENV=live

# Public URL of the storefront, e.g. https://nkay.example
# ExpressPay returns the customer to ${PUBLIC_APP_URL}/order/:orderId
PUBLIC_APP_URL=https://nkay.example

# Public HTTPS base URL of this server, e.g. https://api.nkay.example
# The callback becomes ${PUBLIC_SERVER_URL}/api/payments/expresspay/callback
# Falls back to PUBLIC_APP_URL when omitted.
PUBLIC_SERVER_URL=https://api.nkay.example

# Optional (defaults shown)
EXPAY_SESSION_MINUTES=60
# Leave empty to use the sandbox/live URL selected by EXPAY_ENV.
EXPAY_BASE_URL=
EXPAY_TIMEOUT_MS=15000
```

Secrets are read only on the server and are never sent to the browser. Checkout is
disabled until `EXPAY_MERCHANT_ID`, `EXPAY_API_KEY` and `PUBLIC_APP_URL` (or
`PUBLIC_SERVER_URL`) exist. `/api/health` reports:

```json
{
  "payments": {
    "method": "expresspay",
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

The top card shows whether ExpressPay is configured and whether sandbox or live
credentials are in use, the callback URL and whether it is HTTPS, which
credentials are set, the checkout return URL, the checkout session length and an
IP-allowlist warning. Configuration is environment-based, so there is nothing to
edit in the dashboard.

For any unpaid order, **Re-check with ExpressPay** asks ExpressPay's Query API for
the latest status and applies the same verification rules as the customer flow.
Use it when a customer says they paid but the page has not updated.

**Needs attention** means ExpressPay confirmed money but automatic fulfilment was
not safe. Never ask that customer to pay again. Compare the amount paid and the
order total, then refund or fulfil manually.

An unpaid checkout expires after `EXPAY_SESSION_MINUTES` (60 by default). The
customer can start a new payment from the order page; the server reuses a live
checkout instead of creating duplicates and caps how many tokens an order can
have.

### 5. Data storage

Orders and stock live in **Cloud Firestore** so they survive redeploys and are
shared by every serverless instance. The app reuses the Firebase service account
already used for OTPs and business registrations.

Set these environment variables (a Firebase service account key):

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The private key can be pasted with literal `\n` sequences; the server normalises
it. Create the key in Firebase Console → **Project settings** → **Service
accounts** → **Generate new private key**.

Firestore collections:

| Collection | Document | Purpose |
|---|---|---|
| `orders` | one document per order id | Full order and payment record |
| `stock` | one document per product id, field `value` | Remaining units after sales |

No composite indexes are required.

**Fail-closed behaviour:** when `VERCEL` is set and Firebase is not configured,
`POST /api/orders` returns `503 ORDER_STORAGE_NOT_CONFIGURED` instead of writing
the order to `/tmp`. This prevents taking money for an order that could vanish.
`GET /api/health` reports it:

```json
"storage": { "mode": "local-json", "durable": false }
```

Set the three Firebase variables and redeploy until it reads
`{ "mode": "firestore", "durable": true }`.

Local development without Firebase still uses the JSON files under
`server/models/data/` (`orders.json`, `stock.json`), which are git-ignored. This
fallback is single-process only — never use it in production.

Stock is decremented inside the same Firestore transaction that marks the order
paid, so two callbacks arriving on different instances cannot both reduce stock.

### 6. Testing without live credentials

`EXPAY_BASE_URL` exists so the integration can be exercised against a local
stub. When using a stub, still set `EXPAY_MERCHANT_ID`, `EXPAY_API_KEY` and
`PUBLIC_APP_URL` so the normal code path runs. Never point that variable at a
third-party server in production.

ExpressPay sandbox credentials are the easiest way to exercise the real hosted
checkout. Set `EXPAY_ENV=sandbox` and use the sandbox merchant ID/API key.

The integration is also safe to test manually:

- Submitting the same order twice with the same `idempotencyKey` returns the
  original order instead of creating a second one.
- A callback and a page poll arriving together mark the order paid once.
- A callback for an unknown `order-id` or `token` is acknowledged and ignored.
- A callback only triggers a Query API lookup; the body is never trusted.
- A paid amount that does not match the order total never decrements stock; the
  order becomes `attention`.
- An expired checkout can be re-issued from the order page without creating a
  duplicate charge.
- `status: 4` / Invalid IP from ExpressPay is surfaced as an allowlist error
  instead of being treated as a payment failure.


## Support

For issues or questions about the email notification system, please contact the development team.
