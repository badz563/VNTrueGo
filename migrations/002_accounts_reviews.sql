CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'traveler'
    CHECK(role IN ('traveler','partner_manager','partner_staff','admin')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS partner_members (
  user_id TEXT NOT NULL REFERENCES users(id), destination_id TEXT NOT NULL REFERENCES destinations(id),
  role TEXT NOT NULL CHECK(role IN ('partner_manager','partner_staff')),
  PRIMARY KEY(user_id,destination_id)
);
CREATE TABLE IF NOT EXISTS review_details (
  review_id INTEGER PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  rating_tenths INTEGER NOT NULL CHECK(rating_tenths BETWEEN 0 AND 50),
  experienced_on TEXT NOT NULL,
  evidence_kind TEXT NOT NULL CHECK(evidence_kind IN ('booking','receipt','checkin')),
  evidence_ciphertext TEXT NOT NULL,
  evidence_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  decided_by TEXT REFERENCES users(id), decided_at TEXT, decision_note TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_review_moderation ON review_details(status,review_id);
CREATE INDEX IF NOT EXISTS idx_review_user ON review_details(user_id,review_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_evidence_unique ON review_details(evidence_hash);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL,
  before_json TEXT, after_json TEXT, created_at TEXT NOT NULL
);
