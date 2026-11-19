-- Standardized schema migration snapshot for thucduong-shop (D1 / SQLite)
CREATE TABLE IF NOT EXISTS quick_consult_cache (
  cache_key TEXT PRIMARY KEY,
  article_html TEXT NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
