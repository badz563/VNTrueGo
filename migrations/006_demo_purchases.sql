CREATE TABLE IF NOT EXISTS demo_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  destination_id TEXT NOT NULL REFERENCES destinations(id),
  amount INTEGER NOT NULL CHECK(amount >= 0),
  created_at TEXT NOT NULL,
  UNIQUE(user_id,destination_id)
);
CREATE TABLE IF NOT EXISTS review_demo_purchases (
  review_id INTEGER PRIMARY KEY REFERENCES reviews(id) ON DELETE CASCADE,
  purchase_id TEXT NOT NULL REFERENCES demo_purchases(id)
);
