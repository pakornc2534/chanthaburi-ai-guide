-- Partners (hotels + shops, public catalog for rewards/redemption mockup)
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hotel', 'shop')),
  description_th TEXT,
  description_en TEXT,
  image_url TEXT,
  district TEXT,
  address TEXT,
  rating NUMERIC(2,1) DEFAULT 4.5,
  url TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners viewable by everyone" ON public.partners FOR SELECT USING (true);

-- Rewards (point-redeemable offers from each partner)
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title_th TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_th TEXT,
  description_en TEXT,
  point_cost INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rewards viewable by everyone" ON public.rewards FOR SELECT USING (true);

CREATE INDEX idx_rewards_partner ON public.rewards(partner_id);
CREATE INDEX idx_partners_type ON public.partners(type);

-- Seed partners
INSERT INTO public.partners (slug, name_th, name_en, type, description_th, description_en, image_url, district, address, rating, url, lat, lng) VALUES

('maneechan-resort', 'มณีจันทร์ รีสอร์ท แอนด์ สปอร์ตคลับ', 'Maneechan Resort & Sport Club', 'hotel',
  'รีสอร์ทใหญ่กลางเมืองจันท์ ห่างชายหาดเจ้าหลาวประมาณ 20 นาที มีสระว่ายน้ำ สนามเทนนิส และห้องอาหารคุณภาพ',
  'A spacious resort in central Chanthaburi, ~20 min from Chao Lao Beach. Pool, tennis courts, and quality dining.',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200',
  'เมืองจันทบุรี', '110 หมู่ 9 ต.พลับพลา อ.เมือง จ.จันทบุรี', 4.6,
  'https://maneechan.com', 12.6020, 102.0850),

('kasemsarn-hotel', 'โรงแรมเกษมศานต์', 'Kasemsarn Hotel', 'hotel',
  'โรงแรมขนาดเล็กในตัวเมืองที่เปิดมานาน บรรยากาศบ้านๆ ราคาเป็นมิตร เดินเล่นชุมชนริมน้ำได้',
  'A long-running boutique hotel in town with friendly prices and atmosphere. Walking distance to the riverside community.',
  'https://images.unsplash.com/photo-1551776235-dde6d4829808?w=1200',
  'เมืองจันทบุรี', '98/1 ถ.เบญจมราชูทิศ อ.เมือง จ.จันทบุรี', 4.3,
  null, 12.6075, 102.1100),

('kp-grand-hotel', 'เคพี แกรนด์ จันทบุรี', 'KP Grand Chanthaburi', 'hotel',
  'โรงแรมระดับ 4 ดาวใหญ่ที่สุดในเมืองจันทบุรี มีสระน้ำ ฟิตเนส ห้องประชุม และร้านอาหาร เหมาะนักท่องเที่ยวและนักธุรกิจ',
  'The largest 4-star hotel in Chanthaburi city. Pool, gym, conference rooms, and restaurant — suitable for both leisure and business travelers.',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200',
  'เมืองจันทบุรี', '35/200-201 ถ.ตรีรัตน์ อ.เมือง จ.จันทบุรี', 4.5,
  null, 12.6082, 102.1098),

('eve-resort', 'อีฟ รีสอร์ท แอนด์ สปา', 'Eve Resort & Spa Chao Lao', 'hotel',
  'รีสอร์ทริมหาดเจ้าหลาวที่เน้นการพักผ่อน มีสปา สระว่ายน้ำ ห้องพักวิวทะเล เหมาะกับคู่รักและฮันนีมูน',
  'A relaxation-focused beachfront resort at Chao Lao. Spa, pool, and sea-view rooms — ideal for couples and honeymooners.',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200',
  'ท่าใหม่', '76 หมู่ 9 ต.คลองขุด อ.ท่าใหม่ จ.จันทบุรี', 4.7,
  null, 12.4525, 101.8520),

('the-tide-resort', 'เดอะ ไทด์ รีสอร์ท', 'The Tide Resort Chao Lao', 'hotel',
  'รีสอร์ทสไตล์โมเดิร์นริมหาดเจ้าหลาว มีสระน้ำริมทะเล ห้องพักดีไซน์ทันสมัย เหมาะกับครอบครัวและกลุ่มเพื่อน',
  'A modern beachfront resort at Chao Lao with a seaside pool and contemporary rooms — great for families and groups.',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200',
  'ท่าใหม่', 'หาดเจ้าหลาว ต.คลองขุด อ.ท่าใหม่ จ.จันทบุรี', 4.6,
  null, 12.4530, 101.8500),

('chanthapha-resort', 'จันทผา รีสอร์ท', 'Chanthapha Resort', 'hotel',
  'รีสอร์ทเรียบง่ายใกล้น้ำตกพลิ้ว ล้อมด้วยสวนผลไม้ บรรยากาศธรรมชาติเงียบสงบ เหมาะคนชอบความสันโดษ',
  'A simple resort near Phlio Waterfall surrounded by fruit orchards. Peaceful natural setting — ideal for solitude seekers.',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200',
  'แหลมสิงห์', 'ใกล้น้ำตกพลิ้ว อ.แหลมสิงห์ จ.จันทบุรี', 4.4,
  null, 12.5400, 102.2300),

-- Shops (partner shops for redemption)
('saichol-gem', 'ใจช่อ พลอยจันทบุรี', 'Saichol Gems Chanthaburi', 'shop',
  'ร้านพลอยจริงเก่าแก่ในตลาดพลอย เน้นทับทิม ไพลิน และพลอยพื้นเมือง การันตีคุณภาพ มีใบรับรอง',
  'A long-established gem shop in the gem market specializing in rubies, sapphires, and local stones — quality guaranteed with certificates.',
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200',
  'เมืองจันทบุรี', 'ตลาดพลอย ถ.ศรีจันทร์ อ.เมือง', 4.7,
  null, 12.6094, 102.1119),

('mu-chamuang-deli', 'หมูชะมวง by ครัวบ้านสวน', 'Mu Chamuang Deli', 'shop',
  'ร้านขายของฝากแปรรูปจากหมูชะมวง อาหารพื้นเมืองจันทบุรี ที่บรรจุพร้อมหิ้วกลับ',
  'A take-home shop selling processed mu-chamuang and local Chanthaburi specialties — perfect souvenirs.',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200',
  'เมืองจันทบุรี', 'ชุมชนริมน้ำจันทบูร อ.เมือง', 4.5,
  null, 12.6080, 102.1085),

('durian-tarn-jai', 'ทุเรียนทานใจ', 'Durian Tarn Jai', 'shop',
  'ร้านทุเรียนสด ทุเรียนแปรรูป ทุเรียนทอด ทุเรียนกวน รับส่งทั่วประเทศในฤดูทุเรียน',
  'A fresh and processed durian shop selling fried durian, durian paste, and more — nationwide delivery in season.',
  'https://images.unsplash.com/photo-1591868307826-2adcb7b46c2d?w=1200',
  'มะขาม', 'อ.มะขาม จ.จันทบุรี', 4.6,
  null, 12.7000, 102.2100);

-- Seed rewards (2-3 per partner)
INSERT INTO public.rewards (partner_id, title_th, title_en, description_th, description_en, point_cost) VALUES
((SELECT id FROM partners WHERE slug='maneechan-resort'), 'เครื่องดื่มต้อนรับฟรี', 'Free welcome drink', 'เช็คอินรับเครื่องดื่มต้อนรับ 1 แก้ว', 'Receive 1 welcome drink on check-in', 50),
((SELECT id FROM partners WHERE slug='maneechan-resort'), 'ส่วนลดห้องพัก 5%', '5% off room', 'ใช้ได้กับห้องพักทุกประเภท จองตรง', '5% off all room types when booking direct', 100),
((SELECT id FROM partners WHERE slug='maneechan-resort'), 'ส่วนลดห้องพัก 10% + อาหารเช้าฟรี', '10% off + free breakfast', 'ห้องพักลด 10% พร้อมอาหารเช้าฟรี 2 ท่าน', '10% off room + free breakfast for 2', 250),
((SELECT id FROM partners WHERE slug='kasemsarn-hotel'), 'ส่วนลด 5% ห้องพัก', '5% off room', 'ใช้ได้กับการจองตรงเท่านั้น', 'Direct booking only', 80),
((SELECT id FROM partners WHERE slug='kasemsarn-hotel'), 'อัปเกรดห้องฟรี', 'Free room upgrade', 'อัปเกรดเป็นห้องระดับสูงกว่า ตามความพร้อม', 'Upgrade to higher room category, subject to availability', 150),
((SELECT id FROM partners WHERE slug='kp-grand-hotel'), 'ส่วนลด 10% ค่าห้อง', '10% off room', 'ใช้ได้ทุกประเภทห้อง วันธรรมดา', '10% off any room, weekdays only', 150),
((SELECT id FROM partners WHERE slug='kp-grand-hotel'), 'บุฟเฟ่ต์อาหารเช้าฟรี 2 ท่าน', 'Free breakfast buffet for 2', 'ใช้ในวันที่เข้าพัก', 'Use during stay', 200),
((SELECT id FROM partners WHERE slug='kp-grand-hotel'), 'ส่วนลด 20% + Late Checkout', '20% off + late checkout', 'ลดราคา 20% และ checkout 14:00', '20% off + late 14:00 checkout', 400),
((SELECT id FROM partners WHERE slug='eve-resort'), 'นวดสปาฟรี 30 นาที', 'Free 30-min spa massage', 'ใช้ที่สปาของรีสอร์ท', 'Use at the resort spa', 200),
((SELECT id FROM partners WHERE slug='eve-resort'), 'ส่วนลด 15% ห้องพัก', '15% off room', 'จองตรงเท่านั้น', 'Direct booking only', 300),
((SELECT id FROM partners WHERE slug='eve-resort'), 'แพ็กเกจฮันนีมูน 30% off', '30% off honeymoon package', 'แพ็กเกจห้อง + อาหารเย็น + สปาคู่', 'Room + dinner + couple spa package', 800),
((SELECT id FROM partners WHERE slug='the-tide-resort'), 'ส่วนลด 10% ห้องพัก', '10% off room', 'ลดทุกประเภทห้อง', '10% off any room', 180),
((SELECT id FROM partners WHERE slug='the-tide-resort'), 'ฟรีอาหารเช้า 2 ท่าน', 'Free breakfast for 2', 'ใช้ในวันที่เข้าพัก', 'Use during stay', 220),
((SELECT id FROM partners WHERE slug='the-tide-resort'), 'ห้องพัก 1 คืนฟรี (ซื้อ 2 แถม 1)', 'Free 1 night (buy 2 get 1)', 'ใช้กับการจองอย่างน้อย 2 คืน', 'Requires minimum 2-night booking', 1500),
((SELECT id FROM partners WHERE slug='chanthapha-resort'), 'ทัวร์น้ำตกพลิ้วฟรี', 'Free Phlio Waterfall tour', 'ทัวร์ครึ่งวันพร้อมไกด์ท้องถิ่น', 'Half-day tour with local guide', 150),
((SELECT id FROM partners WHERE slug='chanthapha-resort'), 'ส่วนลด 10% ห้องพัก', '10% off room', 'ลดทุกประเภทห้อง', '10% off any room', 180),
((SELECT id FROM partners WHERE slug='saichol-gem'), 'ส่วนลด 5% เครื่องประดับ', '5% off jewelry', 'ใช้ได้ทุกชิ้น ยกเว้นพลอยพิเศษ', 'All items except premium gems', 100),
((SELECT id FROM partners WHERE slug='saichol-gem'), 'ส่วนลด 15% เครื่องประดับ', '15% off jewelry', 'ใช้ได้ทุกชิ้น ยกเว้นพลอยพิเศษ', 'All items except premium gems', 350),
((SELECT id FROM partners WHERE slug='mu-chamuang-deli'), 'แถมหมูชะมวง 1 กระป๋อง', 'Free can of mu-chamuang', 'เมื่อซื้อครบ 500฿', 'With purchase 500฿+', 80),
((SELECT id FROM partners WHERE slug='mu-chamuang-deli'), 'ส่วนลด 10% ของฝาก', '10% off souvenirs', 'ใช้ได้ทุกรายการ', 'All items', 120),
((SELECT id FROM partners WHERE slug='durian-tarn-jai'), 'ส่วนลดทุเรียนสด 10%', '10% off fresh durian', 'ใช้ในฤดูทุเรียน พ.ค.-ก.ค.', 'In durian season May-July', 150),
((SELECT id FROM partners WHERE slug='durian-tarn-jai'), 'ทุเรียนทอด 1 กระป๋องฟรี', 'Free fried durian can', 'เมื่อซื้อครบ 800฿', 'With purchase 800฿+', 200);
