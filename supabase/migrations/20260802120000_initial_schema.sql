-- Initial schema: profiles, taxonomy, problems, submissions, review_items, post_mortems
-- Spec sections D (NFR-4 RLS) and E (Data Model)

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  codeforces_handle TEXT UNIQUE,
  leetcode_handle TEXT UNIQUE,
  cf_verified BOOLEAN NOT NULL DEFAULT FALSE,
  lc_verified BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE public.taxonomy_nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES public.taxonomy_nodes(id) ON DELETE SET NULL,
  company_weight JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.problems (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('codeforces', 'leetcode')),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  normalized_rating INT NOT NULL CHECK (normalized_rating BETWEEN 800 AND 3500),
  taxonomy_tags TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE (platform, external_id)
);

CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL,
  verdict TEXT NOT NULL,
  execution_time_ms INT,
  memory_bytes INT,
  raw_payload JSONB
);

CREATE TABLE public.review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  easiness_factor REAL NOT NULL DEFAULT 2.5,
  interval INT NOT NULL DEFAULT 0,
  repetitions INT NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ,
  user_tags TEXT[] NOT NULL DEFAULT '{}',
  UNIQUE (user_id, problem_id)
);

CREATE TABLE public.post_mortems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  key_pattern_missed TEXT,
  time_complexity TEXT,
  space_complexity TEXT,
  notes_md TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, problem_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX submissions_user_id_submitted_at_idx
  ON public.submissions (user_id, submitted_at DESC);

CREATE INDEX submissions_problem_id_idx
  ON public.submissions (problem_id);

CREATE INDEX review_items_user_id_due_date_idx
  ON public.review_items (user_id, due_date);

CREATE INDEX post_mortems_user_id_idx
  ON public.post_mortems (user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security (NFR-4)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_mortems ENABLE ROW LEVEL SECURITY;

-- profiles: users manage their own row
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- taxonomy_nodes & problems: read-only reference data for authenticated users
CREATE POLICY taxonomy_nodes_select_authenticated
  ON public.taxonomy_nodes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY problems_select_authenticated
  ON public.problems
  FOR SELECT
  TO authenticated
  USING (true);

-- submissions: users manage their own rows
CREATE POLICY submissions_select_own
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY submissions_insert_own
  ON public.submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY submissions_update_own
  ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY submissions_delete_own
  ON public.submissions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- review_items: users manage their own rows
CREATE POLICY review_items_select_own
  ON public.review_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY review_items_insert_own
  ON public.review_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY review_items_update_own
  ON public.review_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY review_items_delete_own
  ON public.review_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- post_mortems: users manage their own rows
CREATE POLICY post_mortems_select_own
  ON public.post_mortems
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY post_mortems_insert_own
  ON public.post_mortems
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY post_mortems_update_own
  ON public.post_mortems
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY post_mortems_delete_own
  ON public.post_mortems
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
