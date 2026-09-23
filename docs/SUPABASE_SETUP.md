# Admin setup: your part (about 10 minutes, once)

The admin dashboard is built and tested. It needs a free Supabase account (the database) in **your** name. Do steps 1–5, tell Claude "Supabase is ready", then do step 6 when asked.

Until this is done, the live shop keeps working as before, with the built-in catalogue and WhatsApp-only orders, and `/admin` shows "Admin not set up yet".

## 1. Create the Supabase project
1. Go to **supabase.com** → **Start your project**, then sign up (with GitHub, or with yugayugarg5@gmail.com).
2. Click **New project**:
   - Organization: your personal one (Free plan)
   - Name: `wynoak`
   - Database password: click **Generate**, then **copy it somewhere safe** (you need it in step 3)
   - Region: **South Asia (Mumbai)**
3. Click **Create new project** and wait about 2 minutes until it's ready.

## 2. Copy the keys
In the project, open **Project Settings → API Keys**:
- **Publishable key** (starts with `sb_publishable_`)
- **Secret key** (starts with `sb_secret_`; click *Reveal*). **Keep this secret. Never paste it in chat, email or code.**

If you only see "anon" and "service_role" keys (under *Legacy API keys*), use those instead: anon in place of the publishable key, service_role in place of the secret key.

Then open **Project Settings → Data API** (or *API*) and copy the **Project URL**, which looks like `https://abcdxyz.supabase.co`.

## 3. Copy the database connection string
Click **Connect** at the top of the project → **Connection string** → **Session pooler** → copy the URI. Replace `[YOUR-PASSWORD]` in it with the database password from step 1.

## 4. Put the values in the `.env` file
Open `~/Documents/ClothingWebsite/site/.env` (already created from the template) and fill in:

```
SUPABASE_URL=https://abcdxyz.supabase.co
SUPABASE_ANON_KEY=sb_publishable_…
SUPABASE_SERVICE_ROLE_KEY=sb_secret_…
DATABASE_URL=postgresql://postgres.abcdxyz:YOUR-PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
SITE_URL=https://order-priority.vercel.app
```

This file stays on your Mac. It's excluded from git and from the website.

## 5. Set the login link address
In Supabase, open **Authentication → URL Configuration**:
- **Site URL:** `https://order-priority.vercel.app/admin/`
- **Redirect URLs** → *Add URL*: `https://order-priority.vercel.app/admin/`

Save. Then tell Claude **"Supabase is ready"**. Claude will create the tables, copy in all products, and give you a one-time link to set your admin password.

## 6. Add the keys to Vercel (when Claude asks)
In **vercel.com** → your *order-priority* project → **Settings → Environment Variables**, add these three for **Production** and **Preview**:

| Name | Value |
|---|---|
| `SUPABASE_URL` | the Project URL |
| `SUPABASE_ANON_KEY` | the publishable (or anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret (or service_role) key |

Then go to **Deployments**, open the latest one, choose **⋯ → Redeploy**.

Done. Open **https://order-priority.vercel.app/admin/** and log in.
