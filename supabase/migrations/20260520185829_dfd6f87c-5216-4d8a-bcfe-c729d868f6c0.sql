-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  email text,
  county text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);

-- Bucket list items (cloud-synced)
CREATE TABLE public.bucket_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  priority_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, location_id)
);

ALTER TABLE public.bucket_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bucket" ON public.bucket_list_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bucket" ON public.bucket_list_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bucket" ON public.bucket_list_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own bucket" ON public.bucket_list_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX bucket_list_items_user_idx ON public.bucket_list_items(user_id, priority_index);

-- Marketing subscribers (banner email capture)
CREATE TABLE public.marketing_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  county text,
  source text NOT NULL DEFAULT 'banner',
  created_at timestamptz NOT NULL DEFAULT now(),
  converted_to_full_account boolean NOT NULL DEFAULT false
);

ALTER TABLE public.marketing_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can submit, with light validation (length + non-empty + basic email shape)
CREATE POLICY "Anyone can subscribe"
  ON public.marketing_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(btrim(email)) BETWEEN 3 AND 255
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND source IN ('banner','signup','manual')
  );

-- No client-side SELECT/UPDATE/DELETE (service role only)

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile from signup metadata, and mark marketing subscriber as converted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, email, county)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.email,
    NEW.raw_user_meta_data ->> 'county'
  )
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.marketing_subscribers
  SET converted_to_full_account = true,
      county = COALESCE(marketing_subscribers.county, NEW.raw_user_meta_data ->> 'county')
  WHERE email = NEW.email;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();