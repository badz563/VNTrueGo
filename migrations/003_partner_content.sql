CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, destination_id TEXT NOT NULL REFERENCES destinations(id),
  title TEXT NOT NULL, description TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
  ticket_price INTEGER, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled')),
  created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_destination_dates ON events(destination_id,ends_at,status);
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY, destination_id TEXT NOT NULL REFERENCES destinations(id),
  title TEXT NOT NULL, terms TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
  promo_code TEXT, booking_url TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled')),
  created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offers_destination_dates ON offers(destination_id,starts_at,ends_at,status);
CREATE TABLE IF NOT EXISTS seasonal_information (
  id TEXT PRIMARY KEY, destination_id TEXT NOT NULL REFERENCES destinations(id),
  title TEXT NOT NULL, body TEXT NOT NULL, source TEXT NOT NULL,
  updated_by TEXT NOT NULL REFERENCES users(id), updated_at TEXT NOT NULL
);
