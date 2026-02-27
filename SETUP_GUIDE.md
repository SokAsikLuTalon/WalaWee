# King Vypers Premium Key Store - Setup Guide

## Quick Start

### Step 1: Environment Configuration

Your Supabase database is already configured. Add the following to your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_TEMANQRIS_API_KEY=your_temanqris_api_key
TEMANQRIS_WEBHOOK_SECRET=your_webhook_secret
DISCORD_API_SECRET=your_discord_bot_secret
VITE_BASE_URL=http://localhost:5173
```

### Step 2: Create Your Admin Account

1. Register a new account in the application
2. Open Supabase Dashboard > Table Editor > user_profiles
3. Find your user and set `is_admin = true`

### Step 3: Configure TemanQRIS Webhook

In your TemanQRIS dashboard, set the webhook URL to:

```
https://[your-project-id].supabase.co/functions/v1/temanqris-webhook
```

### Step 4: Generate Your First Keys

1. Log in as admin
2. Navigate to Admin > Generate Keys
3. Select a product (e.g., King Vypers 30 Days)
4. Choose quantity and click Generate

## Database Schema

The following tables are already created:

### products
Pre-seeded with 12 products (30-360 days):
- King Vypers 30 Days (IDR 20,000)
- King Vypers 60 Days (IDR 40,000)
- ... up to 360 Days (IDR 240,000)

### keys
Stores all license keys with:
- Key code (XXXX-XXXX-XXXX-XXXX format)
- Status (active/used/blocked/expired)
- HWID binding
- User assignment
- Expiration dates

### orders
Tracks all purchases:
- User and product linkage
- Payment status
- TemanQRIS payment ID
- QRIS URL for payment

### user_profiles
User information:
- Display name
- Admin flag
- Creation date

## Edge Functions Deployed

### 1. create-payment
Creates a new payment request with TemanQRIS

**Endpoint**: `/functions/v1/create-payment`
**Method**: POST
**Auth**: Required (JWT)

**Request**:
```json
{
  "product_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "order_id": "uuid",
  "payment_id": "temanqris_id",
  "qris_url": "https://...",
  "amount": 20000
}
```

### 2. temanqris-webhook
Handles payment confirmations from TemanQRIS

**Endpoint**: `/functions/v1/temanqris-webhook`
**Method**: POST
**Auth**: Signature verification

Automatically assigns keys when payment is confirmed.

### 3. reset-hwid
Resets hardware ID binding for a key

**Endpoint**: `/functions/v1/reset-hwid`
**Method**: POST
**Auth**: JWT or Discord secret

**Request**:
```json
{
  "key_code": "XXXX-XXXX-XXXX-XXXX",
  "secret": "optional_for_discord_bot"
}
```

**Limitations**:
- Can only reset once per 30 days
- Cannot reset blocked or expired keys

### 4. generate-keys
Generates keys in bulk (Admin only)

**Endpoint**: `/functions/v1/generate-keys`
**Method**: POST
**Auth**: Required (Admin JWT)

**Request**:
```json
{
  "product_id": "uuid",
  "quantity": 100
}
```

## User Flow

### Customer Purchase Flow
1. Browse products on landing page
2. Click "Buy Now" (redirects to login if not authenticated)
3. Proceed to checkout
4. Scan QRIS code to pay
5. Wait for payment confirmation (automatic via webhook)
6. Receive key instantly in dashboard

### Admin Key Management Flow
1. Login as admin
2. Navigate to Admin Panel
3. Choose "Generate Keys"
4. Select product and quantity
5. Click generate
6. Download generated keys as CSV
7. Keys are immediately available for sale

## Security Features

### Row Level Security (RLS)
All tables have RLS enabled:
- Users can only see their own orders and keys
- Products are publicly readable
- Admin operations checked via user_profiles.is_admin

### Payment Security
- HMAC-SHA256 signature verification for webhooks
- Payment confirmation before key assignment
- Secure token handling with Supabase Auth

### HWID Protection
- Keys bind to first device used
- 30-day cooldown on HWID resets
- Prevents key sharing

## Admin Panel Features

### Dashboard
- Total keys count
- Active keys count
- Used keys count
- Total revenue (IDR)

### Manage Keys
- View all keys with pagination (20 per page)
- Filter by status (active/used/blocked/expired)
- Multi-select for bulk operations
- Individual HWID reset
- Delete or block keys

### Generate Keys
- Bulk generation (10-1000 keys)
- Auto-linking to products
- CSV export of generated keys
- Automatic stock updates

## Discord Bot Integration

To integrate with your Discord bot for HWID resets:

```javascript
const response = await fetch(
  'https://[project].supabase.co/functions/v1/reset-hwid',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key_code: userKeyCode,
      secret: process.env.DISCORD_API_SECRET
    })
  }
);

const result = await response.json();
if (result.success) {
  console.log('HWID reset successfully');
}
```

## Troubleshooting

### Issue: Payment not confirming
- Check TemanQRIS webhook is configured correctly
- Verify TEMANQRIS_WEBHOOK_SECRET matches in both systems
- Check Supabase Edge Function logs

### Issue: Can't access admin panel
- Verify is_admin flag is set to true in user_profiles table
- Log out and log back in after changing admin status

### Issue: Keys not showing in stock
- Generate keys via Admin > Generate Keys
- Check keys table for product_id match
- Verify status is 'active' and user_id is null

## Next Steps

1. Configure your `.env` file with actual credentials
2. Create your admin account
3. Generate initial key inventory
4. Configure TemanQRIS webhook
5. Test the complete purchase flow
6. Monitor orders and revenue in admin dashboard

## Support

For technical issues, check:
- Supabase Dashboard > Edge Functions > Logs
- Browser console for frontend errors
- Network tab for API call failures
