# TripChan — เที่ยวจันท์ AI Guide

> แอป AI ไกด์ท่องเที่ยวจังหวัดจันทบุรี สองภาษา (ไทย/อังกฤษ) — แชทถาม-ตอบแบบ agentic RAG, สร้างแผนทริปอัตโนมัติ, และระบบ check-in / รีวิว / รางวัล (POC)

**🌐 Live demo:** https://trip.ipongs.com
**📦 Repo:** https://github.com/pakornc2534/chanthaburi-ai-guide

---

## ✨ Highlights

- **Agentic RAG chat** — AI แนะนำได้ "เฉพาะ" สถานที่ที่อยู่ใน catalog 49 รายการเท่านั้น (ป้องกัน hallucination) พร้อมแสดง place cards + suggested follow-ups
- **AI trip planner** — สร้างแผนเที่ยว 1–3 วันด้วย structured output (function calling) แชร์เป็นลิงก์ได้
- **Bilingual TH/EN** — สลับภาษาทั้ง UI และ AI prompt ได้ทันที
- **Check-in & Rewards POC** — เช็คอิน + รีวิว + สะสมแต้ม + แลกส่วนลดกับ partner (โรงแรม 6 + ร้านค้า 3 + 22 รางวัล)
- **Mobile-first** — ออกแบบให้ใช้บนมือถือเป็นหลัก (bottom nav, hero carousel, partner slider)
- **Production-ready deploy** — Docker + Nginx + Let's Encrypt บน Ubuntu (รัน live อยู่ที่ `trip.ipongs.com`)

---

## 🎯 Problem & Solution

**ปัญหา:** ข้อมูลท่องเที่ยวจันทบุรีกระจัดกระจาย, ส่วนใหญ่เป็นภาษาไทย, นักท่องเที่ยวต่างชาติเข้าถึงยาก, และไม่มีตัวช่วยวางแผนแบบ personalized

**ทางออก — TripChan:**
1. รวมสถานที่ท่องเที่ยว 49 แห่งใน 8 หมวด (ทะเล, ภูเขา, คาเฟ่, อาหาร, ประวัติศาสตร์, อัญมณี, ธรรมชาติ, ผลไม้)
2. AI ตอบเป็นภาษาที่ผู้ใช้เลือก โดย **อ้างอิงเฉพาะ catalog จริง** (grounded) — ลดความเสี่ยงข้อมูลมั่ว
3. AI วางแผนทริปเป็น JSON ที่ structured (มีเวลา, สถานที่, หมายเหตุ) นำไปแสดงเป็น UI ได้ทันที
4. เพิ่ม engagement ผ่าน gamification — check-in / review / รางวัล

---

## 🤖 AI Architecture

```
User → Chat UI (TH/EN)
  │
  ├─► /api/chat (TanStack Start server route)
  │     │
  │     ├─ 1. Agentic pre-call: classify intent (places/chat) + pick place IDs from catalog
  │     │     └─ OpenRouter (tool calling) → returns { intent, placeIds[], followups[] }
  │     │
  │     ├─ 2. Fetch matched places from Supabase (RLS via publishable key)
  │     │
  │     └─ 3. Stream response (SSE) ← OpenRouter chat completions
  │           system prompt: "answer ONLY using the place catalog provided"
  │
  └─► Renders: markdown reply + place cards + clickable followup chips
```

**โมเดลที่ใช้:** `google/gemini-2.0-flash-lite-001` (default — เร็ว, ถูก, free tier ใช้ได้)
เปลี่ยนผ่าน env `OPENROUTER_MODEL` → รองรับ Claude, GPT, Llama ทุกตัวที่ OpenRouter มี

**ทำไมถึง grounded ดี:**
- System prompt บังคับให้อ้างอิงเฉพาะรายการที่ส่งให้
- Pre-call agent กรอง catalog เหลือเฉพาะที่เกี่ยวข้องก่อน → ประหยัด token + ลด noise
- ทุก place card ที่โผล่ใน chat ลิงก์กลับไปที่ `/places/$id` จริง

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TanStack Router (file-based) + Vite 7 + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix-based) |
| Server | TanStack Start server functions + SSE streaming |
| Database | Supabase (Postgres + Auth + RLS) |
| AI | OpenRouter (multi-model gateway) — default Gemini 2.0 Flash Lite |
| Deploy | Cloudflare Workers (default) **หรือ** Docker + Nginx บน Ubuntu (production) |

---

## 🚀 Quick Start (เปิดให้กรรมการรันเองได้ใน 5 นาที)

### 1. Clone + install

```bash
git clone https://github.com/pakornc2534/chanthaburi-ai-guide.git
cd chanthaburi-ai-guide
npm install
```

> ใช้ `npm` เป็น source of truth (committed `package-lock.json`) — `bun` ก็รันได้ถ้าติดตั้งไว้

### 2. ตั้ง Supabase ของตัวเอง (สำหรับกรรมการ)

1. สร้างโปรเจกต์ฟรีที่ https://supabase.com/dashboard
2. รัน migrations (เลือกวิธีใดวิธีหนึ่ง):
   - **CLI:** `supabase link --project-ref <ref> && supabase db push`
   - **Web:** เปิด SQL Editor → paste ไฟล์ใน `supabase/migrations/*.sql` ตามลำดับเวลา (4 ไฟล์)
3. คัด keys จาก **Settings → API**

### 3. ตั้งค่า `.env`

```bash
cp .env.example .env
```

แก้ค่าใน `.env`:

```ini
# Supabase (server)
SUPABASE_URL="https://<your-ref>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"   # server-only — bypasses RLS

# Supabase (client — baked into bundle, publishable เท่านั้น)
VITE_SUPABASE_PROJECT_ID="<your-ref>"
VITE_SUPABASE_URL="https://<your-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."

# OpenRouter — สมัครฟรีที่ https://openrouter.ai/keys
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_MODEL="google/gemini-2.0-flash-lite-001"
```

### 4. รัน

```bash
npm run dev
```

เปิด http://localhost:8080

---

## 📍 Routes & Features

| Route | Feature |
|---|---|
| `/` | หน้าแรก — Hero carousel + featured places + 8 categories |
| `/places` | รวมสถานที่ + filter หมวด + search |
| `/places/$id` | รายละเอียดสถานที่ + แผนที่ + check-in + รีวิว |
| `/chat` | AI chat (streaming, agentic RAG, place cards, follow-up chips) |
| `/planner` | AI trip planner + slider โรงแรม partner |
| `/rewards` | สะสมแต้ม + แลกส่วนลด partner |
| `/favorites` | รายการโปรด (localStorage) |
| `/trip/$shareId` | ดูแผนเที่ยวที่แชร์ลิงก์มา |

### Check-in / Review / Points (POC)

ระบบสะสมแต้มจำลอง state ใน `localStorage` (ไม่ผูก auth — เพื่อให้กรรมการลองได้ทันที):
- Check-in สถานที่: **+10 แต้ม** (1 ครั้ง/วัน/สถานที่)
- รีวิว: **+25 แต้ม** (1 ครั้ง/สถานที่ แก้ไขได้)
- ใช้แต้มแลกส่วนลดกับ partner

โค้ด: `src/lib/local-state.ts`

---

## 📁 Project Structure

```
src/
├── routes/                    # File-based routes (TanStack Router)
│   ├── __root.tsx             # Layout + providers + BottomNav
│   ├── index.tsx              # Home
│   ├── places.{tsx,index.tsx,$id.tsx}
│   ├── chat.tsx               # AI chat UI
│   ├── planner.tsx            # AI trip planner UI
│   ├── rewards.tsx, favorites.tsx, trip.$shareId.tsx
│   └── api/chat.ts            # SSE streaming endpoint (agentic RAG)
├── server-fns/
│   ├── places.functions.ts    # listPlaces, getPlaceById, listPartners, listRewards
│   └── ai.functions.ts        # generateTripPlan (structured output)
├── components/                # PlaceCard, CheckInButton, ReviewForm, PointsBadge,
│                              # PartnerCard, HotelPartnerSlider, BottomNav, ...
│   └── ui/                    # shadcn/ui primitives
├── lib/
│   ├── i18n.tsx               # bilingual TH/EN strings + LangProvider
│   ├── local-state.ts         # POC: check-ins / reviews / redemptions
│   └── local-favorites.ts
├── hooks/                     # use-mobile, use-favorite, ...
└── integrations/supabase/     # client (browser) + client.server (admin) + types

supabase/migrations/           # 4 SQL files — schema + seed (49 places, 8 categories, partners, rewards)
```

---

## 🔐 Security Notes

- **`.env` อยู่ใน `.gitignore`** — ไม่เคย commit
- `SUPABASE_SERVICE_ROLE_KEY` และ `OPENROUTER_API_KEY` ใช้ฝั่ง server เท่านั้น (ไม่อยู่หลัง prefix `VITE_`)
- `client.server.ts` (admin Supabase client) ห้าม import จาก component หรือ client-side module
- RLS เปิดทุกตารางใน Supabase — publishable key bypass ไม่ได้
- ระบบ chat รับ user input โดยตรง → **TODO: rate limiting** ก่อน production scale

ถ้า key หลุด:
- Supabase → Settings → API → Reset `service_role`
- OpenRouter → https://openrouter.ai/keys → Delete + Create

---

## 🚢 Deployment

**Production live:** `https://trip.ipongs.com` — Docker + Nginx + Let's Encrypt บน Ubuntu

วิธี deploy แบบเต็ม → ดู [`DEPLOY.md`](./DEPLOY.md) (มี runbook ครบ: DNS, certbot, docker-compose, nginx config)

---

## 📄 License

MIT
