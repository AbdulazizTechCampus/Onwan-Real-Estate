# Test Credentials – Onwan

## OTP Login (Dev Mode)
- **Phone**: `0500000000`
- **OTP**: Returned in response (DEV_MODE=true) – e.g. surfaced as `otp_code` in `/api/auth/send-otp` JSON.
- After OTP verify, the user is prompted to pick a role: `property_owner`, `individual_broker`, `company_broker`, `photographer`, or stays as `guest`.

## Admin Access
- Phone: `0500000000` (admin role is assigned to this seeded test user; if not, login then select role).
- Path `/admin` triggers the admin dashboard for admin users.

## Notes
- Backend env var `DEV_MODE` must be `true` to surface OTP in responses.
- `/api/auth/send-otp` body: `{"phone_number":"0500000000"}`
- `/api/auth/verify-otp` body: `{"phone_number":"0500000000","otp_code":"<code>","user_type":"individual_broker"}`

## Broker Test Account (for "عقاراتي" / My Properties page)
- **Phone**: `0501234567`
- **Role**: individual_broker (وسيط عقاري فرد)
- OTP shown on screen in Dev Mode (same flow as admin account)
- Note: admin account (0500000000) does NOT see "عقاراتي" in its menu

## Finance / Subscriptions Testing
- Broker 0501234567: currently on SILVER plan, has points + PARTNER badge, multiple transactions
- Demo promo codes: WELCOME20 (20%), ONWAN50 (50 SAR fixed, subscriptions only)
- Admin finance UI: Admin Dashboard -> "الإدارة المالية"
- Backend tests: /app/backend/tests/test_finance.py

## Properties DB (10 Sep 2026)
- Properties now in MongoDB (db.properties). Seeded ids 1-6 (owner_id=null). New listings get uuid ids.
- Broker 0501234567 owns test listing(s); silver plan max_listings=20
- Add property: user menu -> "إضافة عقار". My listings: "عقاراتي"
