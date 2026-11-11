-- TubeMetrix Server-Side Auth, Quota & Payment Verification Schema (Cloudflare D1)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  given_name TEXT NOT NULL,
  picture TEXT,
  tier TEXT NOT NULL DEFAULT 'free',
  pro_plan TEXT,
  pro_expires_at TEXT,
  dodo_customer_id TEXT,
  dodo_subscription_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_dodo_sub ON users(dodo_subscription_id);

CREATE TABLE IF NOT EXISTS daily_usage (
  subject_key TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (subject_key, usage_date)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT,
  plan TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'dodo',
  session_id TEXT,
  payment_id TEXT,
  subscription_id TEXT,
  status TEXT NOT NULL,
  raw_event_type TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(session_id);

CREATE TABLE IF NOT EXISTS webhook_events (
  webhook_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

