# Product Requirement Document (PRD): Dual-Platform CP Retention Tracker (LeetCode + Codeforces)

## 1. Core Mission & Objectives
To build a high-reliability, data-driven Competitive Programming (CP) and Data Structures & Algorithms (DSA) retention engine. The platform aggregates user activity across LeetCode and Codeforces, computes topic-level decay indices based on spaced repetition principles, identifies critical cognitive blind spots, and auto-generates daily revision queues.

---

## 2. Platform Architecture & Stack
- **Frontend / Application Framework:** React + Vite + TypeScript + Tailwind CSS
- **Authentication & Database:** Supabase (Postgres, Row Level Security, Supabase Auth with Google OAuth)
- **UI Components & Visualization:** Shadcn UI, Lucide Icons, Recharts
- **External Interfaces:**
  - Codeforces REST API (`https://codeforces.com/api/`)
  - LeetCode GraphQL API (`https://leetcode.com/graphql`)
  - Manifest V3 Browser Extension (Stage 7)

---

## 3. Functional Requirements (FR)

### Module A: Identity, Verification & Problem Ingestion
- **FR-A1: Profile Verification & Identity Binding**
  - **FR-A1.1:** Google OAuth login via Supabase.
  - **FR-A1.2:** Multi-handle binding for Codeforces and LeetCode.
  - **FR-A1.3:** Handle verification for Codeforces via the "Compile Error" submission technique (user submits a specific compilation error token to a designated problem within a 5-minute window).
  - **FR-A1.4:** Handle verification fallback for LeetCode via bio-string match token validation.
- **FR-A2: Universal Problem Vault & Normalization**
  - **FR-A2.1:** Ingest submission streams from both Codeforces and LeetCode into a single normalized schema.
  - **FR-A2.2:** Difficulty scale mapping:
    - Codeforces Rating ($800 - 3500$)
    - LeetCode Difficulty ($Easy, Medium, Hard$) $\rightarrow$ Normalized Rating Equivalent ($1000, 1600, 2200$).
  - **FR-A2.3:** Universal Taxonomy Alignment: Map external tags (e.g., CF `dp`, `trees` vs. LC `dynamic-programming`, `tree`) to a canonical internal taxonomy.

### Module B: Retention, Mastery & Spaced Repetition Engine
- **FR-B1: Retention Decay Engine**
  - Compute a continuous **Topic Health Index** ($0\% - 100\%$) using half-life decay mathematics:
    $$H(t) = H_0 \cdot \left(\frac{1}{2}\right)^{\frac{\Delta t}{\lambda}}$$
    Where $H_0$ is initial mastery, $\Delta t$ is days elapsed since last practice, and $\lambda$ is the topic stability half-life (in days).
- **FR-B2: Mastery Scoring**
  - Compute item-level and topic-level mastery scores factoring in:
    - Recency of successful accepted submission.
    - Independence factor (whether solved on first attempt or required multiple submissions/hints).
    - Difficulty delta (rating relative to user's baseline skill).
- **FR-B3: SM-2 Spaced-Repetition Scheduler**
  - **FR-B3.1:** Implement an adapted SuperMemo-2 (SM-2) algorithm for problem re-solving intervals based on user feedback ratings (1 = Complete blackout, 5 = Flawless recall).
  - **FR-B3.2:** Daily Review Queue generation auto-populated with problems due for review or belonging to decaying topics ($Health < 40\%$).
  - **FR-B3.3:** Manual override tagging during post-mortems: `[Must Re-visit]`, `[Tricky Trick]`, `[Flaky Logic]`, `[Optimal Solution Missed]`.

### Module C: Diagnostics & Predictive Analytics
- **FR-C1: Red Flags Detection**
  - *Topic Neglect:* Topic unvisited for $> 21$ days with decaying health.
  - *Easy-Difficulty Trap:* High volume of low-rated problems solved without progression to higher ratings over a 14-day window.
  - *Unresolved Churn:* Problems attempted $\ge 3$ times within 48 hours without an Accepted verdict.
- **FR-C2: Blind Spot & Gap Matrix**
  - 2D grid matrix mapping Taxonomy Topic vs. Rating Tier (800–1200, 1200–1600, 1600–2000, 2000+), highlighting areas with high attempt counts but low acceptance rates.
- **FR-C3: Opportunity & Readiness Ranking**
  - Compute a **Company-Weighted Readiness Score** weighting topic mastery against target topic frequencies (e.g., high weight on Dynamic Programming and Graphs for target companies).
- **FR-C4: Snapshot Reports**
  - Automated weekly digest generating progress velocity, retention delta, and top 3 recommended focus areas.

---

## 4. Non-Functional Requirements (NFR)

- **NFR-1: System Performance & Rate Limits**
  - Client-side caching and DB rate-limiting proxies to ensure Codeforces REST API ($5\text{ req/sec}$) and LeetCode GraphQL endpoints are not throttled or IP-blocked.
  - First Contentful Paint (FCP) $< 1.2\text{s}$ for core UI routes.
- **NFR-2: Pure Engine Architecture**
  - All scoring, decay calculation, and scheduling algorithms must be isolated as pure, deterministic functions (`src/lib/scoring/**`, `src/lib/scheduler/**`) with 100% unit test coverage.
- **NFR-3: Offline Resilience & Optimistic UI**
  - Post-mortem entries and tag modifications must persist locally if offline and sync gracefully with Supabase upon reconnection.
- **NFR-4: Security & RLS**
  - Supabase Row Level Security (RLS) enforced on all user tables: users can only read and mutate their own profile, submissions, and post-mortems.

---

## 5. Normalized Database Schema (Postgres / Supabase)

```sql
-- Profiles table linked to Supabase Auth
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  codeforces_handle TEXT UNIQUE,
  leetcode_handle TEXT UNIQUE,
  cf_verified BOOLEAN DEFAULT FALSE,
  lc_verified BOOLEAN DEFAULT FALSE
);

-- Taxonomy Nodes (Topics)
CREATE TABLE public.taxonomy_nodes (
  id TEXT PRIMARY KEY, -- e.g., 'dp', 'graphs', 'trees'
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES public.taxonomy_nodes(id),
  company_weight JSONB DEFAULT '{}'::jsonb -- e.g., {"google": 0.9, "meta": 0.85}
);

-- Normalized Problems
CREATE TABLE public.problems (
  id TEXT PRIMARY KEY, -- Unique string key: 'CF-1234A' or 'LC-72'
  platform TEXT NOT NULL CHECK (platform IN ('codeforces', 'leetcode')),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  normalized_rating INT NOT NULL, -- Scaled 800-3500
  taxonomy_tags TEXT[] DEFAULT '{}'
);

-- Submissions Log
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verdict TEXT NOT NULL, -- 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', etc.
  execution_time_ms INT,
  memory_bytes INT,
  raw_payload JSONB
);

-- Spaced Repetition Item States
CREATE TABLE public.review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  easiness_factor REAL DEFAULT 2.5,
  interval INT DEFAULT 0, -- Days until next review
  repetitions INT DEFAULT 0,
  due_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  user_tags TEXT[] DEFAULT '{}',
  UNIQUE(user_id, problem_id)
);

-- Problem Post-Mortems
CREATE TABLE public.post_mortems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  key_pattern_missed TEXT,
  time_complexity TEXT,
  space_complexity TEXT,
  notes_md TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, problem_id)
);