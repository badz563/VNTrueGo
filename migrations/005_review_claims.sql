CREATE TABLE IF NOT EXISTS review_claims (
  user_id TEXT NOT NULL REFERENCES users(id),
  destination_id TEXT NOT NULL REFERENCES destinations(id),
  review_id INTEGER NOT NULL REFERENCES reviews(id),
  PRIMARY KEY(user_id,destination_id)
);
INSERT OR IGNORE INTO review_claims(user_id,destination_id,review_id)
SELECT d.user_id,r.destination_id,r.id FROM review_details d
JOIN reviews r ON r.id=d.review_id
WHERE d.status IN ('pending','approved') ORDER BY r.id;
