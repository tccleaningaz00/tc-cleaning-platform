CREATE TABLE IF NOT EXISTS gallery_photos (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('Bathroom', 'Kitchen', 'Living Room', 'Whole Home')),
  description TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/webp', 'image/png')),
  image_base64 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_category_created
  ON gallery_photos (category, created_at DESC);
