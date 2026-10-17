CREATE TABLE IF NOT EXISTS destinations (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, name_en TEXT,
  category TEXT NOT NULL, description TEXT NOT NULL, description_en TEXT,
  lat REAL NOT NULL, lng REAL NOT NULL, address TEXT NOT NULL, image TEXT NOT NULL,
  tags_json TEXT NOT NULL, duration INTEGER NOT NULL, price INTEGER NOT NULL,
  opening_json TEXT NOT NULL, closed_days_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown', status_rev INTEGER NOT NULL DEFAULT 1,
  status_updated_at TEXT, status_source TEXT NOT NULL DEFAULT 'demo',
  crowd TEXT NOT NULL DEFAULT 'unknown', crowd_updated_at TEXT, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS destination_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT, destination_id TEXT NOT NULL REFERENCES destinations(id),
  status TEXT NOT NULL, crowd TEXT NOT NULL, note TEXT, source TEXT NOT NULL,
  revision INTEGER NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS destination_announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT, destination_id TEXT NOT NULL REFERENCES destinations(id),
  message TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS crowd_forecasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, destination_id TEXT NOT NULL REFERENCES destinations(id),
  date TEXT NOT NULL, level TEXT NOT NULL, source TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT, destination_id TEXT NOT NULL REFERENCES destinations(id),
  author TEXT NOT NULL, body TEXT NOT NULL, verification TEXT NOT NULL DEFAULT 'demo',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS verification_evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT, destination_id TEXT NOT NULL REFERENCES destinations(id),
  source_url TEXT, evidence_type TEXT NOT NULL, checked_at TEXT
);
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT, destination_id TEXT NOT NULL REFERENCES destinations(id),
  message TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS partner_organizations (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, demo_only INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, input_json TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS trip_days (
  id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES trips(id), date TEXT NOT NULL, position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS trip_activities (
  id TEXT PRIMARY KEY, day_id TEXT NOT NULL REFERENCES trip_days(id), destination_id TEXT NOT NULL REFERENCES destinations(id),
  position INTEGER NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, travel_minutes INTEGER NOT NULL, locked INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS travel_preferences (
  id TEXT PRIMARY KEY, payload_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notification_events (
  id TEXT PRIMARY KEY, trip_id TEXT NOT NULL, destination_id TEXT NOT NULL, status_revision INTEGER NOT NULL,
  created_at TEXT NOT NULL, decision TEXT NOT NULL DEFAULT 'pending'
);
