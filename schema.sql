
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- Users ----------
CREATE TABLE users (
  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  profile_image_url VARCHAR(255),
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Note: UNIQUE already creates indexes for username/email, so extra indexes are usually redundant.

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ---------- Categories ----------
CREATE TABLE categories (
  category_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_category_id BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_parent_category
    FOREIGN KEY (parent_category_id)
    REFERENCES categories(category_id)
    ON DELETE SET NULL
);

CREATE INDEX idx_categories_name ON categories (name);
CREATE INDEX idx_categories_parent ON categories (parent_category_id);

-- ---------- Posts ----------
CREATE TABLE posts (
  post_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(255),
  transcribed_text TEXT,
  audio_url VARCHAR(255) NOT NULL,
  audio_duration_seconds INT,
  image_url VARCHAR(255),
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Postgres full-text search column (stored generated)
  search_tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(transcribed_text,''))
  ) STORED,

  CONSTRAINT fk_posts_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE
);

CREATE TRIGGER posts_set_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_posts_user_id ON posts (user_id);
CREATE INDEX idx_posts_created_at ON posts (created_at);
CREATE INDEX idx_posts_is_private ON posts (is_private);

-- Full-text GIN index (replaces MySQL FULLTEXT)
CREATE INDEX idx_posts_search_tsv ON posts USING GIN (search_tsv);

-- ---------- Post Categories (Many-to-Many) ----------
CREATE TABLE post_categories (
  post_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  PRIMARY KEY (post_id, category_id),
  CONSTRAINT fk_pc_post
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
  CONSTRAINT fk_pc_category
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);

CREATE INDEX idx_post_categories_category_id ON post_categories (category_id);

-- ---------- User Category Follows ----------
CREATE TABLE user_category_follows (
  user_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category_id),
  CONSTRAINT fk_ucf_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_ucf_category
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);

CREATE INDEX idx_ucf_user_id ON user_category_follows (user_id);
CREATE INDEX idx_ucf_category_id ON user_category_follows (category_id);

-- ---------- User Follows ----------
CREATE TABLE user_follows (
  follower_id BIGINT NOT NULL,
  following_id BIGINT NOT NULL,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT fk_uf_follower
    FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_uf_following
    FOREIGN KEY (following_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_follows_follower_id ON user_follows (follower_id);
CREATE INDEX idx_user_follows_following_id ON user_follows (following_id);

-- ---------- Post Likes ----------
CREATE TABLE post_likes (
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  liked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id),
  CONSTRAINT fk_pl_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_pl_post
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE
);

CREATE INDEX idx_post_likes_post_id ON post_likes (post_id);
CREATE INDEX idx_post_likes_liked_at ON post_likes (liked_at);

-- ---------- Comments ----------
CREATE TABLE comments (
  comment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_comments_post
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TRIGGER comments_set_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_comments_post_id ON comments (post_id);
CREATE INDEX idx_comments_user_id ON comments (user_id);
CREATE INDEX idx_comments_created_at ON comments (created_at);

-- ---------- Audio Listening History ----------
CREATE TABLE audio_listening_history (
  history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  listened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  listen_duration_seconds INT,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_alh_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_alh_post
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE
);

CREATE INDEX idx_alh_user_id ON audio_listening_history (user_id);
CREATE INDEX idx_alh_post_id ON audio_listening_history (post_id);
CREATE INDEX idx_alh_listened_at ON audio_listening_history (listened_at);

-- ---------- Search History ----------
CREATE TABLE search_history (
  search_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL,
  search_query VARCHAR(255) NOT NULL,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_search_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_search_user_id ON search_history (user_id);
CREATE INDEX idx_search_searched_at ON search_history (searched_at);
CREATE INDEX idx_search_query ON search_history (search_query);

-- ---------- Bookmarks ----------
CREATE TABLE bookmarks (
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  bookmarked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id),
  CONSTRAINT fk_bookmarks_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmarks_post
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE
);

CREATE INDEX idx_bookmarks_user_id ON bookmarks (user_id);
CREATE INDEX idx_bookmarks_bookmarked_at ON bookmarks (bookmarked_at);

-- ============================================
-- SAMPLE SEED DATA
-- ============================================

INSERT INTO categories (name, description) VALUES
('Historical Events', 'Posts about significant historical events and eras'),
('Cultural Traditions', 'Cultural practices, traditions, and heritage'),
('Personal Stories', 'Individual memories and personal narratives'),
('Oral History', 'Recorded oral histories and interviews'),
('Family History', 'Family stories and genealogy'),
('Local History', 'Community and local historical accounts');

-- ============================================
-- USEFUL QUERIES (Postgres parameter style: $1, $2, ...)
-- ============================================

-- Query 1: Personalized feed
/*
SELECT DISTINCT p.*, u.username, u.display_name
FROM posts p
JOIN users u ON p.user_id = u.user_id
LEFT JOIN post_categories pc ON p.post_id = pc.post_id
LEFT JOIN user_category_follows ucf ON pc.category_id = ucf.category_id AND ucf.user_id = $1
LEFT JOIN user_follows uf ON p.user_id = uf.following_id AND uf.follower_id = $1
WHERE p.is_private = FALSE
  AND (ucf.user_id IS NOT NULL OR uf.follower_id IS NOT NULL OR p.user_id = $1)
ORDER BY p.created_at DESC
LIMIT 50;
*/

-- Query 2: Full-text search (replaces MySQL MATCH ... AGAINST)
-- Tip: websearch_to_tsquery supports Google-like syntax; plainto_tsquery is simpler.
/*
SELECT p.*, u.username,
       ts_rank(p.search_tsv, websearch_to_tsquery('english', $1)) AS relevance
FROM posts p
JOIN users u ON p.user_id = u.user_id
WHERE p.search_tsv @@ websearch_to_tsquery('english', $1)
  AND (p.is_private = FALSE OR p.user_id = $2)
ORDER BY relevance DESC
LIMIT 50;
*/

-- Query 3: User's private posts
/*
SELECT p.*,
       COUNT(DISTINCT pl.user_id) AS like_count,
       COUNT(DISTINCT c.comment_id) AS comment_count
FROM posts p
LEFT JOIN post_likes pl ON p.post_id = pl.post_id
LEFT JOIN comments c ON p.post_id = c.post_id
WHERE p.user_id = $1 AND p.is_private = TRUE
GROUP BY p.post_id
ORDER BY p.created_at DESC;
*/

-- Query 4: Posts by category
/*
SELECT p.*, u.username, u.display_name
FROM posts p
JOIN users u ON p.user_id = u.user_id
JOIN post_categories pc ON p.post_id = pc.post_id
WHERE pc.category_id = $1 AND p.is_private = FALSE
ORDER BY p.created_at DESC
LIMIT 50;
*/

-- Query 5: Listening history
/*
SELECT p.*, u.username, alh.listened_at, alh.listen_duration_seconds, alh.completed
FROM audio_listening_history alh
JOIN posts p ON alh.post_id = p.post_id
JOIN users u ON p.user_id = u.user_id
WHERE alh.user_id = $1
ORDER BY alh.listened_at DESC
LIMIT 50;
*/
