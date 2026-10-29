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

## Checkout & Hubtel Mobile Money Payments

The storefront checkout (`/customer/checkout`) creates the order on the server.
The server never trusts prices sent by the browser: it prices every item from
`server/data/catalogue.json`.

NKAY collects **MTN MoMo, Telecel Cash and AT Money** through Hubtel's Direct
Receive Money API. The customer never types a transaction ID or sends money to a
personal number. The flow is:

1. Customer picks a wallet, enters the mobile money number, and places the order.
   The order is created with `paymentStatus: "pending"`.
2. The server asks Hubtel to prompt that wallet for the exact order total, using
   the order number as the Hubtel `ClientReference`.
3. The order moves to `paymentStatus: "processing"` and the customer approves the
   prompt on their handset with their MoMo PIN.
4. Hubtel calls the server's callback. The server ignores the callback's claimed
   status and **re-queries Hubtel's transaction status endpoint**. Only a `Paid`
   result with the exact GHS total marks the order paid.
5. On a verified payment the order becomes `paid` / `confirmed` and stock is
   decremented exactly once, in the same synchronous step that checks the order.
6. If no callback arrives, the order page polls the server every 5 seconds and a
   background reconciler re-checks live payments every minute.
7. If Hubtel confirms money but the order cannot be fulfilled automatically
   (stock sold out, amount mismatch, unexpected currency), the order moves to
   `paymentStatus: "attention"` instead. The customer is told not to pay again
   and an admin arranges a refund.

The browser can never mark an order paid. It can only ask the server to
re-check, and the server decides from Hubtel's response.

### 1. Regenerate the product catalogue

Prices and stock are generated from the frontend product data:

```bash
npm run sync:catalogue
```

Run this whenever products or prices change in `src/data/marketplaceData.ts` or
`src/data/products.ts`.

### 2. Get Hubtel merchant credentials

1. Complete Hubtel merchant onboarding for NKAY.
2. In the Hubtel dashboard open **API & Integrations → API Credentials** and copy
   the **Client ID** and **Client Secret**.
3. Note the **merchant account number** (Hubtel also calls it the **POS Sales
   ID**). Every charge is made to this account.
4. Make sure the server has a **public HTTPS URL**. Hubtel callbacks cannot reach
   `localhost`. For local development, use a tunnel or the stub described below.

If Hubtel asks you to allow-list an egress IP, add your server's static outbound
IP to the merchant account before going live.

### 3. Environment variables

Copy `.env.example` to `.env` and fill in:

```env
# Required for checkout to accept payments
HUBTEL_CLIENT_ID=your-client-id
HUBTEL_CLIENT_SECRET=your-client-secret
HUBTEL_MERCHANT_ACCOUNT_NUMBER=123456

# Public HTTPS base URL of this server, e.g. https://api.nkay.example
# The callback becomes ${PUBLIC_SERVER_URL}/api/payments/hubtel/callback
PUBLIC_SERVER_URL=https://api.nkay.example

# Optional shared secret appended to the callback URL as ?token=...
# Recommended: without it anyone who knows the URL can trigger a re-check.
HUBTEL_CALLBACK_TOKEN=generate-a-long-random-string

# Optional overrides (defaults shown)
HUBTEL_RECEIVE_BASE_URL=https://rmp.hubtel.com
HUBTEL_STATUS_BASE_URL=https://api-txnstatus.hubtel.com
HUBTEL_TIMEOUT_MS=15000
```

`HUBTEL_CALLBACK_URL` may be set instead of `PUBLIC_SERVER_URL` if the callback
lives on a different host. Secrets are read only on the server and are never
sent to the browser.

Checkout is disabled until every required value exists. `/api/health` reports:

```json
{
  "payments": {
    "method": "hubtel",
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

The top card shows whether Hubtel is configured, the callback URL, whether it is
HTTPS, and the wallet channels. Configuration is environment-based, so there is
nothing to edit in the dashboard.

For any unpaid order, **Re-check with Hubtel** asks Hubtel for the latest status
and applies the same verification rules as the customer flow. Use it when a
customer says they approved a prompt but the page has not updated.

**Needs attention** means Hubtel confirmed money but automatic fulfilment was
not safe. Never ask that customer to pay again. Compare the amount paid and the
order total, then refund or fulfil manually.

### 5. Data storage

Orders and stock overrides are stored as JSON under `server/models/data/`
(`orders.json`, `stock.json`). These files are runtime state and are git-ignored.
On Vercel they fall back to `/tmp`, which is ephemeral and not shared between
instances — configure a persistent database (and a persistent stock ledger)
before taking real orders in production.

### 6. Testing without live credentials

`HUBTEL_RECEIVE_BASE_URL` and `HUBTEL_STATUS_BASE_URL` exist so the integration
can be exercised against a local stub. When using a stub, still set all required
Hubtel variables (including `PUBLIC_SERVER_URL`) so the normal code path runs.
Never point those variables at a third-party server in production.

The integration is also safe to test manually:

- Submitting the same order twice with the same `idempotencyKey` returns the
  original order instead of creating a second one.
- Approving the same prompt twice (callback + poll) marks the order paid once.
- A callback for an unknown reference is acknowledged and ignored.
- A paid amount that does not match the order total never decrements stock; the
  order becomes `attention`.

## Support

For issues or questions about the email notification system, please contact the development team.
