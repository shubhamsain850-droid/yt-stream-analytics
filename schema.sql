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
  credits_balance INTEGER NOT NULL DEFAULT 0,
  total_purchased_credits INTEGER NOT NULL DEFAULT 0,
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


CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_id TEXT UNIQUE,
  meta_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id, created_at);

CREATE TABLE IF NOT EXISTS user_backups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool_kind TEXT NOT NULL,
  mode TEXT NOT NULL,
  title TEXT NOT NULL,
  backup_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  completed_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  items_count INTEGER NOT NULL DEFAULT 0,
  stream_keys_json TEXT,
  resume_key TEXT,
  zip_key TEXT,
  zip_size_bytes INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_backups_user_date ON user_backups(user_id, backup_date DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_backups_expires ON user_backups(expires_at);

CREATE TABLE IF NOT EXISTS user_backup_chunks (
  backup_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  data_b64 TEXT NOT NULL,
  PRIMARY KEY (backup_id, kind, chunk_index)
);
