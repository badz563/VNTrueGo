CREATE TABLE IF NOT EXISTS favorite_destinations (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id,destination_id)
);
CREATE TABLE IF NOT EXISTS saved_itineraries (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL, title TEXT NOT NULL, trip_json TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id,id)
);
CREATE INDEX IF NOT EXISTS idx_saved_itineraries_user ON saved_itineraries(user_id,updated_at);
CREATE TABLE IF NOT EXISTS auth_attempts (
  email TEXT PRIMARY KEY, failures INTEGER NOT NULL, locked_until TEXT,
  updated_at TEXT NOT NULL
);
