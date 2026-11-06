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

## Checkout & MTN MoMo Payments

The storefront checkout (`/customer/checkout`) creates the order on the server.
The server never trusts prices sent by the browser: it prices every item from
`server/data/catalogue.json`.

NKAY collects payments through the **MTN Mobile Money (MoMo) Collections API**.
Checkout accepts **MTN wallets only** — there is no card or bank option. There is
no hosted page or redirect: MTN sends a PIN prompt straight to the customer's
phone. The flow is:

1. Customer fills in delivery details and places the order. The order is created
   with `paymentStatus: "pending"`.
2. The server generates a UUID `X-Reference-Id`, stores it on the order **before**
   charging, and calls
   `POST /collection/v1_0/requesttopay` with the exact order total and the
   customer's MoMo number. The order moves to `paymentStatus: "processing"`.
3. The customer approves the prompt with their MoMo PIN on their phone. The
   browser cannot see the result.
4. MTN optionally calls `/api/payments/momo/callback`. MTN callbacks are **not
   signed**, so the payload is treated as a hint only: the server ignores its
   contents and **queries the status API**.
5. Only a status lookup whose `referenceId`, `externalId` (our reference),
   currency and exact amount all match the order marks the order paid.
6. On a verified payment the order becomes `paid` / `confirmed` and stock is
   decremented exactly once, inside one Firestore transaction.
7. If no callback arrives, the order page polls the server every 5 seconds and a
   background reconciler re-checks live payments every minute.
8. If MTN confirms money but the order cannot be fulfilled automatically (stock
   sold out, amount mismatch, unexpected currency), the order moves to
   `paymentStatus: "attention"` instead. The customer is told not to pay again
   and an admin arranges a refund.

The browser can never mark an order paid. It can only ask the server to
re-check, and the server decides from MTN's status response.

### 1. Regenerate the product catalogue

Prices and stock are generated from the frontend product data:

```bash
npm run sync:catalogue
```

Run this whenever products or prices change in `src/data/marketplaceData.ts` or
`src/data/products.ts`.

### 2. Get MTN MoMo credentials

**Sandbox**

1. Create a developer account at <https://momodeveloper.mtn.com>.
2. Subscribe to the **Collections** product. Copy the **primary subscription
   key** — this is `MOMO_SUBSCRIPTION_KEY`.
3. Create an API user for your app:

   ```bash
   # 1. Pick a UUID and use it as X-Reference-Id (it becomes the API user id)
   curl -X POST https://sandbox.momodeveloper.mtn.com/v1_0/apiuser \
     -H "X-Reference-Id: <uuid>" \
     -H "Ocp-Apim-Subscription-Key: <subscription-key>" \
     -H "Content-Type: application/json" \
     -d '{"providerCallbackHost":"your-callback-host.example"}'

   # 2. Create the API key for that user (returns apiKey)
   curl -X POST https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/<uuid>/apikey \
     -H "Ocp-Apim-Subscription-Key: <subscription-key>"

   # 3. Confirm you can mint an access token
   curl -X POST https://sandbox.momodeveloper.mtn.com/collection/token \
     -H "Authorization: Basic $(printf '%s:%s' '<uuid>' '<apiKey>' | base64)" \
     -H "Ocp-Apim-Subscription-Key: <subscription-key>" \
     -H "X-Target-Environment: sandbox"
   ```

   Set `MOMO_USER_ID` to the UUID and `MOMO_API_KEY` to the returned API key.
   Sandbox settles in **EUR** and uses `X-Target-Environment: sandbox`.

**Production (Ghana)**

1. In the MTN developer portal, request **go-live** for the Collections product
   and complete NKAY's business/KYC verification.
2. Use the production subscription key, API user and API key MTN issues. These
   are different from sandbox credentials.
3. Production Ghana uses `X-Target-Environment: mtnghana` and **GHS**. The
   default API host is `https://momoapi.momo.africa`. Some accounts still use the
   older `https://proxy.momoapi.mtn.com` host — if MTN tells you to use it, set
   `MOMO_BASE_URL` accordingly.
4. Register your callback host with MTN (the `providerCallbackHost` used when the
   API user was created). The callback URL is
   `${PUBLIC_SERVER_URL}/api/payments/momo/callback`.

MTN callback hosts are domain-based; Vercel's dynamic egress IPs are not a
problem for MTN as they are for IP-allowlisted gateways.

### Credentials troubleshooting

Run the diagnostic locally with the same values you put in Vercel:

```powershell
$env:MOMO_SUBSCRIPTION_KEY="..."
$env:MOMO_USER_ID="..."
$env:MOMO_API_KEY="..."
$env:MOMO_ENV="sandbox"
npm run momo:diagnose
```

It prints the resolved mode/host/currency (secrets masked) and the raw MTN
response for `POST /collection/token`. Common results:

| MTN status | Meaning |
|---|---|
| `401` | `MOMO_USER_ID` / `MOMO_API_KEY` wrong, or the API user was created in the other environment |
| `403` | `MOMO_SUBSCRIPTION_KEY` is not the primary key of the **Collections** product |
| `404` | Wrong host/path — token is `/collection/token`, API-user setup is `/v1_0/apiuser` (no `/collection`) |
| `400` | Credential values contain quotes, spaces or newlines |

The most common mistake is mixing environments: sandbox credentials with
`MOMO_ENV=live` (or the default when `MOMO_ENV` is omitted), or the opposite.
Sandbox credentials **cannot** create a token on the production host, and live
credentials cannot create one on `sandbox.momodeveloper.mtn.com`.

To check a full prompt, add `MOMO_TEST_MSISDN=233XXXXXXXXX` (and optionally
`MOMO_TEST_AMOUNT=1.00`). This sends a real RequestToPay; only do it with
sandbox credentials unless you intend to charge.

### 3. Environment variables

Copy `.env.example` to `.env` and fill in:

```env
# Required for checkout to accept payments
MOMO_SUBSCRIPTION_KEY=your-subscription-key
MOMO_USER_ID=your-api-user-uuid
MOMO_API_KEY=your-api-key

# "sandbox" for testing, "live" for real money
MOMO_ENV=live

# Optional overrides (defaults shown)
MOMO_TARGET_ENVIRONMENT=mtnghana
MOMO_CURRENCY=GHS
MOMO_BASE_URL=
MOMO_TIMEOUT_MS=20000
MOMO_PROMPT_MINUTES=10

# Public URL of the storefront, e.g. https://nkay.example
PUBLIC_APP_URL=https://nkay.example

# Public HTTPS base URL of this server, e.g. https://api.nkay.example
# The callback becomes ${PUBLIC_SERVER_URL}/api/payments/momo/callback
# Falls back to PUBLIC_APP_URL when omitted.
PUBLIC_SERVER_URL=https://api.nkay.example

# Optional: full callback override
MOMO_CALLBACK_URL=
```

Secrets are read only on the server and are never sent to the browser. Checkout is
disabled until `MOMO_SUBSCRIPTION_KEY`, `MOMO_USER_ID` and `MOMO_API_KEY` exist.
`/api/health` reports:

```json
{
  "payments": {
    "method": "mtn_momo",
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

The top card shows whether MTN MoMo is configured, whether sandbox or live
credentials are in use, the target environment and currency, the callback URL and
its host, which credentials are set, the API base URL and the prompt window.
Configuration is environment-based, so there is nothing to edit in the dashboard.

For any unpaid order, **Re-check with MTN** asks the status API for the latest
result and applies the same verification rules as the customer flow. Use it when
a customer says they approved the prompt but the page has not updated.

**Needs attention** means MTN confirmed money but automatic fulfilment was not
safe. Never ask that customer to pay again. Compare the amount paid and the order
total, then refund or fulfil manually.

An unanswered prompt expires after `MOMO_PROMPT_MINUTES` (10 by default). The
customer can start a new payment from the order page; the server reuses an
outstanding request instead of sending a second prompt and caps how many prompts
an order can have. A retry reuses the stored `X-Reference-Id`, which MTN treats
as an idempotency key, so a lost response cannot double-charge.

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

`MOMO_BASE_URL` exists so the integration can be exercised against a local stub.
When using a stub, still set `MOMO_SUBSCRIPTION_KEY`, `MOMO_USER_ID`,
`MOMO_API_KEY` and `PUBLIC_APP_URL` so the normal code path runs. Never point that
variable at a third-party server in production.

MTN sandbox credentials are the easiest way to exercise the real prompt flow.
Set `MOMO_ENV=sandbox`, use the sandbox credentials, and pay from an MTN test
number registered for the sandbox.

The integration is also safe to test manually:

- Submitting the same order twice with the same `idempotencyKey` returns the
  original order instead of creating a second one.
- A callback and a page poll arriving together mark the order paid once.
- A callback for an unknown reference is acknowledged and ignored.
- A callback only triggers a status lookup; the body is never trusted.
- A paid amount or currency that does not match the order never decrements stock;
  the order becomes `attention`.
- An expired prompt can be re-sent from the order page without creating a
  duplicate charge.
- Missing or rejected MTN credentials surface as a configuration error, not as a
  customer payment failure.



## Support

For issues or questions about the email notification system, please contact the development team.
