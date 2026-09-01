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

## Support

For issues or questions about the email notification system, please contact the development team.
