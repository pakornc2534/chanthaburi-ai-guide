import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "th" | "en";

type Dict = Record<string, { th: string; en: string }>;

const dict = {
  appName: { th: "เที่ยวจันท์", en: "TripChan" },
  tagline: {
    th: "ผู้ช่วย AI แนะนำที่เที่ยวจันทบุรี",
    en: "Your AI guide to Chanthaburi",
  },
  heroTitle: {
    th: "ค้นพบจันทบุรีในแบบของคุณ",
    en: "Discover Chanthaburi your way",
  },
  heroSubtitle: {
    th: "ทะเล ภูเขา น้ำตก ของกิน คาเฟ่ — ให้ AI ช่วยวางแผนเที่ยวให้คุณ",
    en: "Sea, mountains, waterfalls, food, cafés — let AI plan your trip.",
  },
  ctaChat: { th: "แชทกับ AI", en: "Chat with AI" },
  ctaPlanner: { th: "สร้างแผนเที่ยว", en: "Create a trip plan" },
  navHome: { th: "หน้าแรก", en: "Home" },
  navPlaces: { th: "สถานที่", en: "Places" },
  navChat: { th: "แชท AI", en: "Chat" },
  navPlanner: { th: "วางแผน", en: "Plan" },
  navFavorites: { th: "โปรด", en: "Saved" },
  topPicks: { th: "สถานที่แนะนำ", en: "Top picks" },
  browseByCategory: { th: "เลือกตามหมวด", en: "Browse by category" },
  allPlaces: { th: "สถานที่ทั้งหมด", en: "All places" },
  search: { th: "ค้นหา...", en: "Search..." },
  filter: { th: "กรอง", en: "Filter" },
  category: { th: "หมวดหมู่", en: "Category" },
  district: { th: "อำเภอ", en: "District" },
  free: { th: "เข้าฟรี", en: "Free entry" },
  paid: { th: "มีค่าเข้า", en: "Paid" },
  all: { th: "ทั้งหมด", en: "All" },
  beach: { th: "ทะเล", en: "Beach" },
  nature: { th: "ธรรมชาติ", en: "Nature" },
  temple: { th: "วัด/ศักดิ์สิทธิ์", en: "Temples" },
  history: { th: "ประวัติศาสตร์", en: "History" },
  food: { th: "อาหารพื้นเมือง", en: "Local food" },
  cafe: { th: "คาเฟ่", en: "Café" },
  nightlife: { th: "บาร์/ปาร์ตี้", en: "Nightlife" },
  fruit: { th: "สวนผลไม้", en: "Fruit farms" },
  openingHours: { th: "เวลาเปิด", en: "Hours" },
  priceInfo: { th: "ค่าเข้า", en: "Entry" },
  address: { th: "ที่อยู่", en: "Address" },
  phone: { th: "เบอร์โทร", en: "Phone" },
  openInMaps: { th: "เปิดใน Google Maps", en: "Open in Google Maps" },
  saveToFavorites: { th: "บันทึกโปรด", en: "Save" },
  saved: { th: "บันทึกแล้ว", en: "Saved" },
  askAI: { th: "ถาม AI เกี่ยวกับที่นี่", en: "Ask AI about this" },
  chatTitle: { th: "แชทกับไกด์ AI", en: "Chat with AI guide" },
  chatPlaceholder: {
    th: "ถามอะไรก็ได้เกี่ยวกับจันทบุรี...",
    en: "Ask anything about Chanthaburi...",
  },
  send: { th: "ส่ง", en: "Send" },
  thinking: { th: "กำลังคิด...", en: "Thinking..." },
  exampleQuestions: { th: "ตัวอย่างคำถาม", en: "Try asking" },
  ex1: { th: "ที่เที่ยวธรรมชาติ 1 วัน", en: "1-day nature trip" },
  ex2: { th: "คาเฟ่ริมทะเลที่ห้ามพลาด", en: "Best beachfront cafés" },
  ex3: { th: "ของกินขึ้นชื่อจันทบุรี", en: "Famous local food" },
  ex4: { th: "วัดและสถานที่ประวัติศาสตร์", en: "Temples & history sites" },
  plannerTitle: { th: "วางแผนเที่ยวจันทบุรี", en: "Plan your Chanthaburi trip" },
  days: { th: "จำนวนวัน", en: "Days" },
  budget: { th: "งบประมาณ", en: "Budget" },
  budgetLow: { th: "ประหยัด", en: "Budget" },
  budgetMid: { th: "ปานกลาง", en: "Mid-range" },
  budgetHigh: { th: "พรีเมียม", en: "Premium" },
  interests: { th: "ความสนใจ", en: "Interests" },
  travelStyle: { th: "ลักษณะการเดินทาง", en: "Travel style" },
  family: { th: "ครอบครัว", en: "Family" },
  couple: { th: "คู่รัก", en: "Couple" },
  friends: { th: "เพื่อน", en: "Friends" },
  solo: { th: "คนเดียว", en: "Solo" },
  generatePlan: { th: "สร้างแผน", en: "Generate plan" },
  regenerate: { th: "สร้างใหม่", en: "Regenerate" },
  saveTrip: { th: "บันทึกแผน", en: "Save plan" },
  shareTrip: { th: "แชร์แผน", en: "Share plan" },
  copied: { th: "คัดลอกลิงก์แล้ว!", en: "Link copied!" },
  morning: { th: "เช้า", en: "Morning" },
  noon: { th: "กลางวัน", en: "Noon" },
  afternoon: { th: "บ่าย", en: "Afternoon" },
  evening: { th: "เย็น", en: "Evening" },
  day: { th: "วันที่", en: "Day" },
  favoritesTitle: { th: "รายการโปรด", en: "Saved" },
  emptyFavorites: {
    th: "ยังไม่มีรายการโปรด ลองกดหัวใจที่สถานที่ที่ชอบ",
    en: "No saved places yet. Tap the heart on places you love.",
  },
  loading: { th: "กำลังโหลด...", en: "Loading..." },
  errorRateLimit: {
    th: "มีคำขอเยอะเกินไป กรุณารอสักครู่",
    en: "Too many requests, please wait a moment.",
  },
  errorPayment: {
    th: "เครดิต AI หมด กรุณาเติมเครดิตใน Workspace",
    en: "AI credits exhausted. Please top up your workspace.",
  },
  errorGeneric: {
    th: "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง",
    en: "Something went wrong, please try again.",
  },
  nearbyPlaces: { th: "ที่เที่ยวใกล้เคียง", en: "Nearby places" },
  backHome: { th: "กลับหน้าแรก", en: "Back home" },
  notFound: { th: "ไม่พบหน้านี้", en: "Page not found" },
  generating: { th: "กำลังสร้างแผน...", en: "Generating plan..." },
  shareDesc: { th: "แผนเที่ยวที่แชร์", en: "Shared trip plan" },
  publicPlan: { th: "แผนเที่ยวสาธารณะ", en: "Public trip plan" },
  newChat: { th: "เริ่มใหม่", en: "New chat" },
  recommendedPlaces: { th: "สถานที่ที่เกี่ยวข้อง", en: "Related places" },
  followupTitle: { th: "ลองถามต่อ", en: "Try asking" },
  resultPlan: { th: "แผนเที่ยวของคุณ", en: "Your trip plan" },
  noResults: { th: "ไม่พบสถานที่ที่ค้นหา", en: "No matching places" },
  about: { th: "เกี่ยวกับ", en: "About" },
  language: { th: "ภาษา", en: "Language" },

  // POC: check-in / review / points / rewards
  navRewards: { th: "รางวัล", en: "Rewards" },
  pointsLabel: { th: "แต้ม", en: "pts" },
  myPoints: { th: "แต้มของฉัน", en: "My points" },
  checkInBtn: { th: "เช็คอินที่นี่", en: "Check in here" },
  checkedInToday: { th: "เช็คอินแล้ววันนี้", en: "Checked in today" },
  earnedPoints: { th: "ได้รับ {n} แต้ม! 🎉", en: "Earned {n} points! 🎉" },
  reviewSection: { th: "รีวิวของคุณ", en: "Your review" },
  writeReview: { th: "เขียนรีวิว", en: "Write a review" },
  editReview: { th: "แก้ไขรีวิว", en: "Edit review" },
  rating: { th: "ให้คะแนน", en: "Rating" },
  comment: { th: "ความคิดเห็น", en: "Comment" },
  commentPlaceholder: { th: "เล่าประสบการณ์ของคุณที่นี่...", en: "Share your experience..." },
  submitReview: { th: "ส่งรีวิว", en: "Submit" },
  saveReview: { th: "บันทึก", en: "Save" },
  cancel: { th: "ยกเลิก", en: "Cancel" },
  rewardsTitle: { th: "แลกของรางวัล", en: "Redeem rewards" },
  rewardsSubtitle: {
    th: "สะสมแต้มจากการ check-in และ review เพื่อแลกส่วนลดกับ partner",
    en: "Earn points by checking in and reviewing places to redeem partner discounts",
  },
  partnerHotels: { th: "โรงแรมพันธมิตร", en: "Partner hotels" },
  partnerShops: { th: "ร้านค้าพันธมิตร", en: "Partner shops" },
  recommendedHotels: {
    th: "โรงแรมพันธมิตรแนะนำสำหรับทริปนี้",
    en: "Recommended partner hotels for this trip",
  },
  redeem: { th: "แลกใช้", en: "Redeem" },
  redeemed: { th: "แลกแล้ว", en: "Redeemed" },
  notEnoughPoints: { th: "แต้มไม่พอ", en: "Not enough points" },
  redemptionCode: { th: "โค้ดของคุณ", en: "Your code" },
  myRedemptions: { th: "ประวัติการแลก", en: "My redemptions" },
  noRedemptions: { th: "ยังไม่มีประวัติการแลก", en: "No redemptions yet" },
  earnMorePoints: { th: "สะสมแต้มเพิ่ม", en: "Earn more points" },
  hotelType: { th: "โรงแรม", en: "Hotel" },
  shopType: { th: "ร้านค้า", en: "Shop" },
  pocBadge: { th: "Mock-up — ระบบสะสมแต้มจำลอง", en: "Mock-up — Demo loyalty system" },
  pointsBreakdown: { th: "รายละเอียดแต้ม", en: "Points breakdown" },
  fromCheckIns: { th: "จาก check-in", en: "From check-ins" },
  fromReviews: { th: "จากรีวิว", en: "From reviews" },
  spentOnRewards: { th: "ใช้แลกของรางวัล", en: "Spent on rewards" },
  resetData: { th: "รีเซ็ตข้อมูลทั้งหมด", en: "Reset all data" },
  confirmReset: {
    th: "ยืนยันการลบประวัติทั้งหมด? (เช็คอิน รีวิว แต้ม)",
    en: "Reset all history? (check-ins, reviews, points)",
  },
  pointCost: { th: "{n} แต้ม", en: "{n} pts" },
  ratingStars: { th: "ดาว", en: "stars" },
} satisfies Dict;

type Key = keyof typeof dict;

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
    if (stored === "th" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (key: Key) => dict[key][lang];

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

const EXAMPLE_QUESTIONS: ReadonlyArray<{ th: string; en: string }> = [
  { th: "ที่เที่ยวธรรมชาติ 1 วัน", en: "1-day nature trip" },
  { th: "คาเฟ่ริมทะเลที่ห้ามพลาด", en: "Best beachfront cafés" },
  { th: "ของกินขึ้นชื่อจันทบุรี", en: "Famous local food" },
  { th: "วัดและสถานที่ประวัติศาสตร์", en: "Temples & history sites" },
  { th: "หาดทรายขาวที่สวยที่สุด", en: "Best white-sand beaches" },
  { th: "น้ำตกใกล้เมืองจันท์", en: "Waterfalls near town" },
  { th: "สวนผลไม้น่าไป", en: "Fruit orchards to visit" },
  { th: "ทริปครอบครัว 2 วัน", en: "2-day family trip" },
  { th: "คาเฟ่ย่านเมืองเก่า", en: "Cafés in the old town" },
  { th: "ของฝากเด็ดๆ", en: "Best souvenirs" },
  { th: "ที่เที่ยวเข้าฟรี", en: "Free attractions" },
  { th: "ทริปคู่รักโรแมนติก", en: "Romantic couple trip" },
  { th: "อาหารทะเลร้านดัง", en: "Famous seafood spots" },
  { th: "พิพิธภัณฑ์น่าไป", en: "Museums worth visiting" },
  { th: "ตลาดเช้าจันทบุรี", en: "Morning markets" },
  { th: "เที่ยวจันท์หน้าฝน", en: "Visiting in the rainy season" },
];

export const examplePool = (lang: Lang): string[] => EXAMPLE_QUESTIONS.map((q) => q[lang]);

export const categoryLabel = (cat: string, lang: Lang): string => {
  const map: Record<string, { th: string; en: string }> = {
    beach: { th: "ทะเล", en: "Beach" },
    nature: { th: "ธรรมชาติ", en: "Nature" },
    temple: { th: "วัด/ศักดิ์สิทธิ์", en: "Temples" },
    history: { th: "ประวัติศาสตร์", en: "History" },
    food: { th: "อาหารพื้นเมือง", en: "Local food" },
    cafe: { th: "คาเฟ่", en: "Café" },
    nightlife: { th: "บาร์/ปาร์ตี้", en: "Nightlife" },
    fruit: { th: "สวนผลไม้", en: "Fruit farms" },
  };
  return map[cat]?.[lang] ?? cat;
};
