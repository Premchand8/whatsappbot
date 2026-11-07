# ReadyLocal WhatsApp — Customer Go-Live Checklist

**For:** Manager / Ops / Customer onboarding  
**Product:** ReadyLocal WhatsApp Booking Bot  
**Purpose:** Collect what we need from the customer so the app can switch from simulator to live WhatsApp.

Once these items are provided, we paste them into configuration and the **same app runs on the customer’s WhatsApp Business number** — no rebuild required.

---

## Two cases

| Case | Who this is | What changes |
|------|-------------|--------------|
| **A — Already in Meta / WhatsApp Business** | Customer already has a WhatsApp Business Account (WABA), Cloud API number, or BSP (360dialog / Twilio / etc.) | Collect existing IDs, tokens, templates |
| **B — New registration** | Customer has only a normal phone / WhatsApp Business *app* number, not connected to Cloud API yet | Register business + number with Meta first, then same collection as Case A |

---

## Case A — Customer already in database (existing WABA / Cloud API)

Ask the customer (or their Meta admin) for the following.

### 1. Business & account access
- [ ] Meta Business Manager ID / Business name  
- [ ] WhatsApp Business Account (WABA) ID  
- [ ] Admin access (or temporary System User) for ReadyLocal / implementation team  
- [ ] Confirmation that messaging is on **Cloud API** (or which BSP: Meta direct / 360dialog / Twilio / other)

### 2. Phone number (live WhatsApp line customers will message)
- [ ] Display phone number (E.164, e.g. `+91XXXXXXXXXX`)  
- [ ] **Phone Number ID** (from Meta → WhatsApp → API setup)  
- [ ] Number display name (as shown in WhatsApp, e.g. ReadyLocal)  
- [ ] Number quality / messaging limit status (if known)

### 3. API credentials (required to go live in our app)
- [ ] **Permanent Access Token** (System User token preferred; not a short-lived test token)  
- [ ] **App ID**  
- [ ] **App Secret**  
- [ ] Webhook verify token (we can set ours, e.g. `readylocal_verify` — customer must allow us to configure webhook)

### 4. Webhook (Meta must call our server)
Customer / Meta admin must allow this webhook subscription:

| Field | Value |
|-------|--------|
| Callback URL | `https://<our-public-host>/webhook/whatsapp` |
| Verify token | As agreed (must match our config) |
| Subscribed fields | `messages` |

- [ ] Public HTTPS host confirmed (our hosting / customer hosting)  
- [ ] Webhook verified successfully in Meta

### 5. Message templates (Meta-approved names)
Needed for outbound messages outside the 24-hour customer-care window (booking updates, assignment, OTPs).

| Our config key | Purpose | Customer provides approved **template name** |
|----------------|---------|-----------------------------------------------|
| `TEMPLATE_BOOKING_UPDATE` | Booking / status updates | ________________ |
| `TEMPLATE_ASSIGNMENT` | Professional / coordinator assigned | ________________ |
| `TEMPLATE_START_OTP` | Start OTP to customer | ________________ |
| `TEMPLATE_COMPLETION_OTP` | Completion OTP to customer | ________________ |
| Template language code | e.g. `en` or `en_US` / `te` | ________________ |

- [ ] Templates **Approved** in Meta (not Pending / Rejected)  
- [ ] Exact template **names** and **languages** shared (names are case-sensitive)  
- [ ] Sample body / variables shared so we map correctly

### 6. Languages & brand
- [ ] Primary languages (ReadyLocal bot supports **English + Telugu**)  
- [ ] Brand display name for chat header  
- [ ] Service areas / cities to enable at launch  

### 7. Optional but recommended before production traffic
- [ ] Payment provider details (Razorpay / UPI) — current V1 uses mock checkout until wired  
- [ ] Support handoff contact / process when user asks “Talk to a person”  
- [ ] Test phone numbers for UAT before public launch  

---

## Case B — New registration (not yet on Cloud API)

Customer starts from scratch. Complete Meta onboarding first, then collect **everything in Case A**.

### Step 1 — Business registration
- [ ] Legal business name + address  
- [ ] GST / business registration docs (as required by Meta for India)  
- [ ] Business website or public Facebook Page  
- [ ] Meta Business Manager created and verified  
- [ ] Business verification status (Unverified / Pending / Verified)

### Step 2 — WhatsApp product setup
- [ ] Create Meta App with **WhatsApp** product  
- [ ] Create / link WhatsApp Business Account (WABA)  
- [ ] Add and verify the business phone number (OTP via SMS/voice)  
- [ ] Complete display name approval  

### Step 3 — API & webhook
- [ ] Generate System User + permanent token with WhatsApp permissions  
- [ ] Note **Phone Number ID** and **WABA ID**  
- [ ] Configure webhook (same as Case A §4)

### Step 4 — Templates
- [ ] Submit the four templates (booking update, assignment, start OTP, completion OTP) in EN and TE if needed  
- [ ] Wait for Meta approval  
- [ ] Share approved names with us (Case A §5)

### Step 5 — Go live in ReadyLocal app
We set:

```env
WHATSAPP_MODE=live
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_APP_SECRET=...
PUBLIC_BASE_URL=https://...
TEMPLATE_BOOKING_UPDATE=...
TEMPLATE_ASSIGNMENT=...
TEMPLATE_START_OTP=...
TEMPLATE_COMPLETION_OTP=...
TEMPLATE_LANGUAGE=en
```

Restart app → customer messages the business number → booking flows run live.

---

## Minimum set to switch the app to live (summary)

| # | Item | Case A | Case B |
|---|------|--------|--------|
| 1 | Phone Number ID | Required | After number registration |
| 2 | Permanent Access Token | Required | After System User created |
| 3 | App Secret | Required | After Meta App created |
| 4 | Webhook HTTPS URL + verify token | Required | Required |
| 5 | Approved template names | Required for outbound outside 24h | Submit then approve |
| 6 | Business verification | Usually already done | Must complete |

**Without 1–4:** app stays in simulator / cannot send on real WhatsApp.  
**Without 5:** chat inside 24h session still works; proactive OTPs/updates outside session will fail until templates are approved.

---

## What ReadyLocal already has (no customer action)

- Full booking conversation engine (Instant / Assisted / Variable price)  
- English + Telugu flows  
- Simulator for UAT without Meta  
- Webhook + Cloud API integration ready — **config paste only** to go live  

---

## Customer reply template (copy-paste)

```
Business name:
Case: [ A – Existing WABA / B – New registration ]

Phone number (E.164):
Phone Number ID:
WABA ID:
Meta App ID:
App Secret: (share securely)
Permanent Access Token: (share securely)

Webhook: we will use https://________/webhook/whatsapp
Verify token: ________

Approved templates:
- booking_update name + language:
- assignment name + language:
- start_otp name + language:
- completion_otp name + language:

Test numbers for UAT:
Support contact for human handoff:
```

**Security note:** Token and App Secret must be shared via secure channel (password manager / encrypted mail), never in plain WhatsApp/email threads if avoidable.
