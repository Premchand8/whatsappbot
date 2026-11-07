# ReadyLocal WhatsApp Booking Bot (V1)

WhatsApp booking backend for ReadyLocal. Implements Instant, Assisted, and Variable-price flows (English + Telugu) from the product prototype.

**Develop without Meta.** Run in `simulate` mode and use the local chat UI.  
**Go live later** by pasting Cloud API credentials and approved template names into `.env`.

## Quick start (simulator)

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:3000/simulate](http://localhost:3000/simulate).

## Go live (paste and run)

1. Create a Meta app with WhatsApp Cloud API and a business phone number.
2. Copy **Access token** and **Phone number ID** into `.env`.
3. Set webhook URL to `https://YOUR_HOST/webhook/whatsapp` and verify token to match `WHATSAPP_VERIFY_TOKEN`.
4. After templates are approved, set `TEMPLATE_*` names in `.env`.
5. Switch mode and restart:

```env
WHATSAPP_MODE=live
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=readylocal_verify
WHATSAPP_APP_SECRET=...
PUBLIC_BASE_URL=https://YOUR_HOST
```

```bash
npm run dev
```

Inbound customer messages hit the same conversation engine used by the simulator.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start with tsx watch |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled `dist` |
| `npm run db:migrate` | Prisma migrate |
| `npm run smoke` | Smoke-test the three booking paths |

## Architecture

- `src/engine` — conversation state machine (shared)
- `src/whatsapp` — Meta Cloud API client + webhook
- `src/simulate` — local chat UI adapter
- `src/domain` — bookings, mock payments, OTPs
- `prisma` — SQLite by default; point `DATABASE_URL` at Postgres when ready

## Payments

V1 uses `MockPaymentProvider`. Checkout links under `/simulate/pay/:id`. Replace the provider interface later with Razorpay without rewriting the engine.
