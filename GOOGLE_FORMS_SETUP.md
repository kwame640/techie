# Google Forms Integration Setup

This guide explains how to set up Google Forms for business registration submissions.

## Step 1: Create a Google Form

1. Go to [Google Forms](https://forms.google.com)
2. Click "Blank" to create a new form
3. Add the following questions (use "Short answer" for most fields):

### Required Fields:

1. **Business Name** (Short answer)
2. **Business Type** (Dropdown or Short answer)
3. **Business Category** (Dropdown or Short answer)
4. **Business Email** (Short answer)
5. **Business Phone** (Short answer)
6. **Business Address** (Short answer)
7. **City** (Short answer)
8. **Region** (Dropdown with Ghana regions)
9. **Country** (Dropdown)
10. **Preferred Contact Method** (Dropdown: Email, Phone, WhatsApp)
11. **Business Description** (Paragraph)

## Step 2: Get the Form URL and Entry IDs

### Get the Form URL:
1. Click "Send" in the top right
2. Click the link icon (short URL)
3. Copy the URL - it will look like:
   ```
   https://docs.google.com/forms/d/e/1FAIpQLSdXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/viewform
   ```

### Get the Entry IDs:
1. Open your form in preview mode
2. Right-click on each field and select "Inspect"
3. Look for `data-item-id` or `name="entry.XXXXXX"` in the HTML
4. The entry ID will be a number like `123456789`

**Alternative method to get entry IDs:**
1. Submit a test response to your form
2. Go to the "Responses" tab
3. Click "Link to Sheets" to create a Google Sheet
4. The column headers will show the entry IDs

## Step 3: Update the Backend Code

Update `server/services/emailService.js` with your actual entry IDs:

```javascript
const params = new URLSearchParams({
  'entry.YOUR_BUSINESS_NAME_ID': businessData.businessName,
  'entry.YOUR_BUSINESS_TYPE_ID': businessData.businessType,
  'entry.YOUR_BUSINESS_CATEGORY_ID': businessData.businessCategory,
  'entry.YOUR_EMAIL_ID': businessData.email,
  'entry.YOUR_PHONE_ID': businessData.phone,
  'entry.YOUR_ADDRESS_ID': businessData.address,
  'entry.YOUR_CITY_ID': businessData.city,
  'entry.YOUR_REGION_ID': businessData.region,
  'entry.YOUR_COUNTRY_ID': businessData.country,
  'entry.YOUR_CONTACT_METHOD_ID': businessData.preferredContactMethod,
  'entry.YOUR_DESCRIPTION_ID': businessData.description || '',
});
```

## Step 4: Update .env File

Update the `.env` file with your Google Form URL:

```env
GOOGLE_FORM_URL=https://docs.google.com/forms/d/e/YOUR_ACTUAL_FORM_ID/viewform
```

## Step 5: Restart the Server

1. Stop the current server (Ctrl+C in the terminal)
2. Run: `npm run server`

## How It Works

When a business submits the registration form:

1. The backend generates a pre-filled Google Forms URL with all the business data
2. The URL is logged in the server console
3. You can open the URL to see the pre-filled form
4. The business owner could also be redirected to this URL to confirm their submission

## Testing

1. Submit a registration form from the frontend
2. Check the server console for the generated Google Forms URL
3. Open the URL in your browser to verify the data is pre-filled correctly

## Advantages of Google Forms

- No email authentication required
- Easy to view and manage responses
- Can export to Google Sheets
- Free to use
- No server-side email configuration needed
