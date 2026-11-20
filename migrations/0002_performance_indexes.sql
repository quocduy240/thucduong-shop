-- Performance composite indexes for Cloudflare D1 & local SQLite.
-- Safe & idempotent: can be applied repeatedly via:
--   npx wrangler d1 execute thucduong-shop-db --remote --file=migrations/0002_performance_indexes.sql --yes

-- Product catalog & storefront listings
CREATE INDEX IF NOT EXISTS idx_products_cat_pub_feat ON products(category_id, is_published, featured DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_products_pub_id ON products(is_published, featured DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_product_categories_active_sort ON product_categories(is_active, sort, id);

-- Comments & product ratings (eliminates correlated subquery full scans in PRODUCT_COLS)
CREATE INDEX IF NOT EXISTS idx_comments_product_id ON comments(product_id, id DESC);

-- Posts & blog navigation
CREATE INDEX IF NOT EXISTS idx_posts_cat_created ON posts(category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_categories_section ON post_categories(section_slug, id);

-- Orders & order lookup / admin reporting
CREATE INDEX IF NOT EXISTS idx_orders_phone_created ON orders(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Sessions cleanup & lookup
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_member_sessions_expires ON member_sessions(expires_at);

-- Flash sales
CREATE INDEX IF NOT EXISTS idx_flash_sale_items_product_active ON flash_sale_items(product_id, active);
CREATE INDEX IF NOT EXISTS idx_flash_sale_items_slot_sort ON flash_sale_items(slot_id, active, sort);

-- Loyalty & CRM profiles / point ledger
CREATE INDEX IF NOT EXISTS idx_member_profiles_phone_status ON member_profiles(phone, status);
CREATE INDEX IF NOT EXISTS idx_member_profiles_email_status ON member_profiles(email, status);
CREATE INDEX IF NOT EXISTS idx_member_profiles_user_status ON member_profiles(user_id, status);
CREATE INDEX IF NOT EXISTS idx_member_profiles_status_points ON member_profiles(status, current_points DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_member_created ON point_transactions(member_id, created_at DESC, id DESC);

-- Videos & Wards
CREATE INDEX IF NOT EXISTS idx_videos_video_id ON videos(video_id);
CREATE INDEX IF NOT EXISTS idx_wards_province ON wards(province_code);
