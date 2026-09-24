# Online payments & order emails: your part (about 15 minutes, free)

Until this is done, checkout offers **Cash on delivery** and **Order on WhatsApp** only, and emails are skipped. Everything else already works.

You'll add 7 settings in **Vercel → order-priority → Settings → Environment Variables** (Production + Preview), then redeploy. **Never paste these values into a chat.**

## A. Razorpay (test mode, free)
1. Sign up at **dashboard.razorpay.com** (email, phone and business name "Wynoak"). You can stay in **Test Mode** without KYC.
2. Make sure the toggle at the top says **Test Mode**.
3. **Account & Settings → API Keys → Generate Test Key.** Copy the **Key Id** (`rzp_test_…`) and the **Key Secret** (shown once).
4. **Account & Settings → Webhooks → + Add New Webhook:**
   - Webhook URL: `https://order-priority.vercel.app/api/pay-webhook`
   - Secret: make up a long random password (e.g. from a password manager) and keep it
   - Active events: tick **payment.captured**, **payment.failed**, **order.paid**
   - Save
5. In Vercel, add:

| Name | Value |
|---|---|
| `RAZORPAY_KEY_ID` | the Key Id (`rzp_test_…`) |
| `RAZORPAY_KEY_SECRET` | the Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | the webhook secret you made up |

**Testing:** at checkout choose *Pay online*. In the Razorpay window use UPI ID `success@razorpay` (or card `4111 1111 1111 1111`, any future expiry, any CVV). No real money moves in test mode.

**Going live later** (after the business details and KYC): generate **Live** keys, add a live-mode webhook with the same URL, and replace the 3 values.

## B. Order emails through Gmail (free, about 500/day)
1. Turn on **2-Step Verification** for yugayugarg5@gmail.com: myaccount.google.com → Security.
2. Go to **myaccount.google.com/apppasswords**, create an app password named "Wynoak", and copy the 16-character password.
3. In Vercel, add:

| Name | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `yugayugarg5@gmail.com` |
| `SMTP_PASS` | the 16-character app password (no spaces) |

Optionally also add `MAIL_FROM` = `Wynoak <yugayugarg5@gmail.com>`.

4. **Deployments → latest → ⋯ → Redeploy.**

Then tell Claude "payments and email are set up". Claude will run a live test-mode order end to end.

**Later:** once you own wynoak.com, switch to a free Resend account with an address like orders@wynoak.com. Only the SMTP values change.

---

## Prompt for the Claude Chrome extension (optional)

The extension can do the clicking. You'll still copy the secrets yourself, and it must not print them.

```text
Help me set up Razorpay test mode and Gmail sending for my store, and add the settings to Vercel. Pause for me whenever a login, OTP, captcha or password is needed. NEVER type or repeat any key, secret or password in this chat. Copy values directly between browser tabs and form fields only. Don't enable anything paid, don't start KYC, and don't change settings I haven't listed. Ask me if anything unexpected comes up.

1. Razorpay: go to https://dashboard.razorpay.com (let me sign in or sign up myself, business name "Wynoak"). Make sure TEST MODE is on.
   a. Account & Settings → API Keys → Generate Test Key. Keep the tab open; I'll need the Key Id and Key Secret for step 3.
   b. Account & Settings → Webhooks → Add New Webhook. URL: https://order-priority.vercel.app/api/pay-webhook. Events: payment.captured, payment.failed, order.paid. For the Secret, STOP and ask me to type a secret myself into the field (don't generate or show it). Save.
2. Gmail: open https://myaccount.google.com/apppasswords (signed in as yugayugarg5@gmail.com). If it says 2-Step Verification is needed, guide me to turn it on (I'll do the steps). Create an app password named "Wynoak" and keep that tab open. Don't show the password in chat.
3. Vercel: https://vercel.com/dashboard → project "order-priority" → Settings → Environment Variables. Add each of these for Production AND Preview (edit it if it already exists), pasting secret values straight from the other tabs:
   RAZORPAY_KEY_ID = Razorpay test Key Id
   RAZORPAY_KEY_SECRET = Razorpay test Key Secret (mark Sensitive)
   RAZORPAY_WEBHOOK_SECRET = ask me to type the same webhook secret I used in 1b (mark Sensitive)
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 465
   SMTP_USER = yugayugarg5@gmail.com
   SMTP_PASS = the Gmail app password, without spaces (mark Sensitive)
   MAIL_FROM = Wynoak <yugayugarg5@gmail.com>
4. Deployments → most recent Production deployment → ⋯ → Redeploy. Wait until Ready.
5. Open https://order-priority.vercel.app/api/catalog and tell me whether the "settings" section shows "onlinePayments": true.
6. Summarise with ✅/❌ for each step and any problems, without showing any secret values.
```
