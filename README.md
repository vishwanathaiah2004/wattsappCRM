# 📱 WhatsApp AI CRM — Multi-Tenant SaaS

A production-ready, multi-tenant WhatsApp CRM SaaS.  
Each business client gets their own isolated account, leads, conversations, AI personality, and dashboard.

---

## 📁 Project Structure

```
whatsapp-crm-saas/
├── public/
│   └── index.html              ← Full SaaS frontend (auth + dashboard + admin)
├── src/
│   ├── config/
│   │   ├── database.js         ← PostgreSQL pool
│   │   ├── gemini.js           ← Gemini AI client
│   │   └── twilio.js           ← Twilio client
│   ├── middleware/
│   │   └── auth.js             ← JWT auth (tenant + super admin)
│   ├── models/
│   │   ├── tenant.model.js     ← Tenant CRUD + default AI prompts
│   │   ├── lead.model.js       ← Multi-tenant lead operations
│   │   └── conversation.model.js
│   ├── controllers/
│   │   ├── webhook.controller.js   ← Routes WhatsApp messages to correct tenant
│   │   ├── auth.controller.js      ← Register / login
│   │   ├── leads.controller.js     ← Lead management API
│   │   └── tenant.controller.js    ← Settings + admin panel
│   ├── routes/
│   │   └── index.js            ← All routes
│   ├── services/
│   │   ├── gemini.service.js   ← AI with per-tenant custom prompts
│   │   ├── twilio.service.js   ← WhatsApp send/receive
│   │   └── followup.service.js ← Hourly cron for ALL tenants
│   ├── utils/
│   │   ├── logger.js
│   │   └── migrate.js          ← DB setup + super admin seed
│   └── app.js
├── server.js
├── schema.sql
├── package.json
├── .env.example
└── README.md
```

---

## ✅ Quick Setup (5 steps)

### 1. Install & configure

```bash
unzip whatsapp-crm-saas.zip
cd whatsapp-crm-saas
npm install
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_crm_saas
JWT_SECRET=a_very_long_random_secret_string_here
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx
GEMINI_API_KEY=AIzaSyxxxxxxxxx
APP_URL=https://your-domain.com
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=yourAdminPassword
```

### 2. Setup PostgreSQL

```bash
psql -U postgres -c "CREATE DATABASE whatsapp_crm_saas;"
psql -U postgres -c "CREATE USER crm_user WITH PASSWORD 'yourpassword';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE whatsapp_crm_saas TO crm_user;"

npx prisma db push
```

### 3. Run migration

```bash
npm run migrate
```

This creates all tables AND seeds your super admin account.

### 4. Start server

```bash
npm run dev        # development
npm start          # production
```

### 5. Configure Twilio webhook

In Twilio Console → Messaging → WhatsApp number settings:
```
Webhook URL: https://your-domain.com/api/webhook
Method: HTTP POST
```

For local dev, use ngrok:
```bash
ngrok http 3000
# Then use: https://abc123.ngrok.io/api/webhook
```

---

## 🔑 How Multi-Tenancy Works

### Routing by WhatsApp Number

Every Twilio number points to ONE webhook: `/api/webhook`

When a message comes in, the system:
1. Reads the `To` number from Twilio payload
2. Looks up which tenant owns that number in the DB
3. Routes the message to that tenant's leads + AI prompt
4. Replies using that tenant's WhatsApp number

### Data Isolation

Every table has `tenant_id`. No cross-tenant data leakage is possible.

```sql
SELECT * FROM leads WHERE tenant_id = $1 AND phone = $2
```

---

## 👥 User Roles

| Role | What they can do |
|------|-----------------|
| **Tenant** | See their own leads, conversations, settings, trigger follow-ups |
| **Super Admin** | See all tenants, create/deactivate accounts, change plans |

---

## 🌐 API Reference

### Public
```
POST /api/auth/register         Register new tenant
POST /api/auth/login            Tenant login
POST /api/auth/admin/login      Super admin login
POST /api/webhook               Twilio WhatsApp webhook
GET  /health                    Health check
```

### Tenant (requires Bearer token)
```
GET    /api/auth/me             Get own profile
GET    /api/leads               List leads (?limit=&offset=&stage=&search=)
GET    /api/leads/stats         Lead stats + AI usage
GET    /api/leads/:id           Lead + conversation history
PATCH  /api/leads/:id           Update lead stage/name/etc
POST   /api/leads/followup/trigger  Trigger follow-ups now
PATCH  /api/settings            Update business profile + WhatsApp number + AI prompt
```

### Super Admin (requires admin Bearer token)
```
GET   /api/admin/tenants            List all tenants
POST  /api/admin/tenants            Create new tenant
PATCH /api/admin/tenants/:id/toggle Toggle active/inactive
PATCH /api/admin/tenants/:id/plan   Change plan
```

---

## 💰 Business Plans

| Plan | AI Replies/month | Price suggestion |
|------|-----------------|-----------------|
| Starter | 500 | ₹2,999 |
| Growth | Unlimited | ₹6,999 |
| Agency | Unlimited | ₹14,999 |

Modify `monthly_limit` per tenant in DB or via admin panel.

---

## 🤖 Industry AI Prompts (built-in)

The system ships with pre-built AI personalities for:
- **General Business** — Universal sales assistant
- **Real Estate** — Asks about BHK, budget, possession timeline
- **Coaching/EdTech** — Handles admissions, demo class offers
- **Clinic/Healthcare** — Appointment booking, empathetic tone
- **E-Commerce** — Product finding, offers, return policy
- **Travel** — Itinerary planning, package suggestions
- **Legal/CA** — Professional inquiry handling, consultation booking
- **Car Dealership** — EMI calculator, test drive booking

Each client can further customize their AI prompt in Settings.

---

## 🚀 Production Deployment

### Railway (recommended)
1. Push to GitHub
2. Connect at railway.app
3. Add environment variables
4. Get domain → update Twilio webhook

### With PM2 (VPS)
```bash
npm install -g pm2
pm2 start server.js --name whatsapp-crm
pm2 startup && pm2 save
```

---

## 🔧 Troubleshooting

**No reply coming from WhatsApp**
- Check `whatsapp_number` is set for the tenant in Settings
- Verify Twilio webhook URL points to `/api/webhook`
- Check logs: `tail -f logs/combined.log`

**"No active tenant found for number"**
- The incoming Twilio number isn't matched to any tenant
- Go to Settings → set the WhatsApp Number

**JWT expired errors**
- Token lasts 7 days. Just log in again.

**Follow-ups not sending**
- Tenant must have `whatsapp_number` set
- Use the ⚡ button to trigger manually and check logs
