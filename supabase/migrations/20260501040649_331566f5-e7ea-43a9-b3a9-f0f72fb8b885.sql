
-- Places (catalog ของสถานที่ท่องเที่ยวจันทบุรี)
CREATE TABLE public.places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category TEXT NOT NULL,
  district TEXT,
  description_th TEXT NOT NULL,
  description_en TEXT NOT NULL,
  image_url TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  opening_hours TEXT,
  price_info TEXT,
  address TEXT,
  phone TEXT,
  tags TEXT[] DEFAULT '{}',
  rating NUMERIC(2,1) DEFAULT 4.5,
  is_free BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "places are viewable by everyone"
  ON public.places FOR SELECT USING (true);

-- Favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, place_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own favorites"
  ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own favorites"
  ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own favorites"
  ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Trips (AI-generated plans)
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  user_id UUID,
  title TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  plan JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public trips viewable by all"
  ON public.trips FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "anyone can create trips"
  ON public.trips FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "owners update own trips"
  ON public.trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owners delete own trips"
  ON public.trips FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_places_category ON public.places(category);
CREATE INDEX idx_places_featured ON public.places(featured);
CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_trips_share ON public.trips(share_id);
