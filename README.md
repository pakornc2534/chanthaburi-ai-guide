# TripChan — เที่ยวจันท์ AI Guide

แอป AI แนะนำสถานที่ท่องเที่ยวจังหวัดจันทบุรี รองรับแชทถาม-ตอบ สร้างแผนเดินทางอัตโนมัติ และระบบ check-in/review/รางวัล (POC)

## Stack

- TanStack Start (React 19 + Router) + Vite 7 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Supabase (PostgreSQL + Auth + RLS)
- OpenRouter (AI gateway) — model: `google/gemini-2.0-flash-lite-001` (เปลี่ยนได้)
- Cloudflare Workers (deploy target)

## Quick Start (สำหรับ collaborators)

### 1. Clone + install

```bash
git clone https://github.com/pakornc2534/chanthaburi-ai-guide.git
cd chanthaburi-ai-guide
bun install
# หรือ npm install
```

### 2. ตั้งค่า `.env`

```bash
cp .env.example .env
```

แล้วเปิด `.env` แก้ค่าตามนี้:

**Supabase (ทีมใช้ project เดียวกัน)**
- ขอ `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_*` จาก project owner
- `SUPABASE_SERVICE_ROLE_KEY` — ขอ owner ส่งให้ทาง DM (อย่าส่งใน chat สาธารณะ) หรือ:
  - เข้า [Supabase Dashboard](https://supabase.com/dashboard) (ต้องถูกเชิญเป็น collaborator)
  - Settings → API → `service_role` → Reveal → Copy

**OpenRouter (แต่ละคนคีย์ตัวเอง)**
- สมัครฟรีที่ https://openrouter.ai/keys → สร้าง API key
- Free tier ก็ใช้ Gemini Flash Lite ได้สบาย

### 3. Database (ถ้าตั้ง project ใหม่)

ทีม dev ใช้ shared Supabase project — ปกติไม่ต้อง run migrations ซ้ำ

ถ้าตั้ง local Supabase หรือ project ใหม่ ให้รัน migration files ตามลำดับ:

```bash
# ผ่าน Supabase CLI
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# หรือ paste SQL ใน supabase/migrations/*.sql เข้า Dashboard SQL Editor ตามลำดับเวลา
```

Migrations:
- `20260501040649_*.sql` — schema (places, favorites, trips + RLS)
- `20260501052000_seed_places.sql` — superseded (no-op)
- `20260501060000_reseed_places_8_categories.sql` — 49 places ใน 8 หมวด
- `20260501070000_add_partners_rewards.sql` — partners + rewards (POC)

### 4. Run dev

```bash
bun run dev
```

เปิด http://localhost:8080

## ฟีเจอร์

| Route | คำอธิบาย |
|-------|---------|
| `/` | หน้าแรก — Hero + featured + categories |
| `/places` | รวมสถานที่ + filter 8 หมวด + search |
| `/places/$id` | รายละเอียด + check-in + review + แผนที่ |
| `/chat` | แชท AI streaming (OpenRouter Gemini) |
| `/planner` | สร้างแผนเที่ยวด้วย AI + slidebar โรงแรม partner |
| `/rewards` | สะสมแต้ม + แลกส่วนลดกับ partner (POC) |
| `/favorites` | รายการโปรด (localStorage) |
| `/trip/$shareId` | ดูแผนที่แชร์มา |

### Check-in / Review / Points (POC)

ระบบสะสมแต้มแบบจำลอง state เก็บใน `localStorage`:
- Check-in สถานที่: **+10 แต้ม** (วันละ 1 ครั้ง/สถานที่)
- Review สถานที่: **+25 แต้ม** (1 ครั้ง/สถานที่ แก้ไขทีหลังได้)
- ใช้แต้มแลกส่วนลดที่ partner (โรงแรม 6 + ร้านค้า 3 + ส่วนลด 22 รายการ)

โค้ดที่เกี่ยวข้อง: `src/lib/local-state.ts`

## Architecture

```
src/
├── routes/
│   ├── __root.tsx
│   ├── index.tsx, places.tsx (layout), places.index.tsx (list), places.$id.tsx,
│   │   chat.tsx, planner.tsx, rewards.tsx, favorites.tsx, trip.$shareId.tsx
│   └── api/chat.ts          # streaming endpoint
├── server-fns/
│   ├── places.functions.ts  # listPlaces, getPlaceById, listPartners, listRewards, ...
│   └── ai.functions.ts      # generateTripPlan (function calling)
├── components/               # PointsBadge, CheckInButton, ReviewForm, PartnerCard, HotelPartnerSlider, ...
├── lib/
│   ├── i18n.tsx             # bilingual TH/EN strings
│   ├── local-state.ts       # POC state for check-ins/reviews/redemptions
│   └── local-favorites.ts
├── hooks/
└── integrations/supabase/   # client + admin + types (auto-generated)
```

## AI Provider

OpenAI-compatible endpoint: `https://openrouter.ai/api/v1/chat/completions`

เปลี่ยนโมเดลผ่าน env var `OPENROUTER_MODEL` เช่น:
- `google/gemini-2.0-flash-lite-001` (ปัจจุบัน — เร็ว+ถูก)
- `google/gemini-2.0-flash-001` (แม่นกว่าถ้า structured output มีปัญหา)
- `anthropic/claude-3.5-haiku`
- `openai/gpt-4o-mini`

## ⚠️ Security

**อย่า commit `.env` เด็ดขาด** — ไฟล์นี้อยู่ใน `.gitignore` แล้ว

- `SUPABASE_SERVICE_ROLE_KEY` — bypass RLS, ใช้ฝั่ง server เท่านั้น
- `OPENROUTER_API_KEY` — เสียเงินตามการใช้

ถ้า key หลุด: revoke ทันที + สร้างใหม่
- Supabase: Dashboard → Settings → API → "Reset service_role"
- OpenRouter: https://openrouter.ai/keys → Delete + Create new

## ค่าใช้จ่าย

- Supabase free tier: 500MB DB + 50k MAU
- OpenRouter Gemini Flash Lite: ~$0.075 / 1M input tokens (ใช้น้อยมากในแอปนี้)
- Cloudflare Workers free: 100k requests/day

## Deploy

โปรเจกต์ตั้งค่าสำหรับ Cloudflare Workers (`wrangler.jsonc`) แต่จะ deploy บน Vercel/Netlify ก็ได้ — TanStack Start รองรับทุกแพลตฟอร์ม อย่าลืมตั้ง env vars บนเซิร์ฟเวอร์ด้วย

## License

MIT
