# ReadyLocal WhatsApp — How go-live works (simple)

## What the customer experiences (real world)

1. Customer opens **WhatsApp** on their phone.  
2. They save / message the **ReadyLocal business number** (the number we connect).  
3. They type **Hi**.  
4. ReadyLocal replies with a menu: Book a Service, My Bookings, Help…  
5. They tap buttons and book (plumbing, nursing, AC repair, etc.) — same flow you already saw in the simulator.  
6. They pay, get updates, get OTPs, rate the service — all inside WhatsApp.

**No app install. No website needed for the customer. Just WhatsApp → that number → book.**

The simulator you tested is a practice screen.  
After go-live, that same brain runs on the **real WhatsApp number**.

---

## What “go live” means

Today: practice mode (computer simulator).  
Go live: customer’s phone talks to **our ReadyLocal system** through WhatsApp’s official business channel (Meta).

```
Customer phone (WhatsApp)
        ↓
ReadyLocal business number
        ↓
Our ReadyLocal booking system  ← this app
        ↓
Booking / payment / professional updates
```

---

## Two situations for the business owner

### Situation A — They already have WhatsApp Business API / Meta set up
They already use official WhatsApp Business messaging (not only the phone app).

**We only need them to share:**
- The business WhatsApp number  
- Login / API keys from Meta (like a password for our system to send/receive messages)  
- Permission to point WhatsApp messages to our server  
- Approved message templates (ready-made message formats Meta must approve)

Then we paste those into the app settings and turn live mode **ON**.

### Situation B — New / only using WhatsApp on a phone today
Having WhatsApp Business **on a mobile phone** is **not enough** for automatic booking bots.

They must first:
1. Register the business with Meta (Business Manager)  
2. Connect that phone number to WhatsApp **Cloud API** (official business messaging)  
3. Get Meta to approve templates  
4. Share the keys with us (same as Situation A)

After that → same “open WhatsApp → Hi → book” experience.

---

## Simple go-live steps (story order)

| Step | Who | What happens |
|------|-----|----------------|
| 1 | Business | Decide the WhatsApp number customers will message |
| 2 | Business + Meta | Get that number on official WhatsApp Business API (if not already) |
| 3 | Business | Share number + API keys + template names with ReadyLocal team |
| 4 | ReadyLocal | Put those into the app settings, turn **live** on |
| 5 | ReadyLocal | Connect Meta “doorbell” (webhook) so every customer message reaches our app |
| 6 | Team | Test from a real phone: send **Hi** to the number |
| 7 | Live | Customers book from WhatsApp like a normal chat |

---

## What we must get from the customer (plain list)

Think of these as the “keys to the shop”:

1. **Business WhatsApp number** — the number people will chat  
2. **Phone Number ID** — Meta’s internal ID for that number  
3. **Access token** — password so our app can send replies  
4. **App secret** — security key for Meta  
5. **Approved templates** — official message formats for updates/OTPs (names after Meta says “Approved”)  
6. **Public website address of our server** — so WhatsApp knows where to deliver messages  

Until 1–4 are ready, customers cannot book on the real number through this bot.  
Until templates are approved, some automatic updates (especially after 24 hours of silence) may not send.

---

## What customers do **not** need

- They do **not** download ReadyLocal to book  
- They do **not** learn a new app  
- They only need WhatsApp and the business number  

---

## One-line summary for your manager

> Customers open WhatsApp, message our ReadyLocal number, and book by tapping chat buttons. To make that real, the business must put their WhatsApp number on Meta’s official API and give us the keys and approved templates; we switch the existing app from practice mode to live — no new booking product to build.

---

## Customer message you can forward

```
Hi — to go live with ReadyLocal WhatsApp booking:

Customers will simply WhatsApp our business number, say Hi, and book in chat.

Please share:
1) Business WhatsApp number
2) Meta Phone Number ID
3) Permanent access token + App secret (securely)
4) Permission to set webhook to our server
5) Approved template names (booking update, assignment, start OTP, completion OTP)

If you don’t have WhatsApp Cloud API yet, we need to register the number with Meta first — then the same steps.

After that, we turn live on and you can test from any phone.
```
