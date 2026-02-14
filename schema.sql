-- ============================================
-- ARCHIVAL AUDIO SOCIAL MEDIA APP - DATABASE SCHEMA
-- ============================================

-- Users Table
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    profile_image_url VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Categories Table
CREATE TABLE categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id INT NULL, -- For subcategories
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    INDEX idx_name (name)
);

-- Posts Table
CREATE TABLE posts (
    post_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255),
    transcribed_text TEXT, -- Text generated from audio
    audio_url VARCHAR(255) NOT NULL, -- URL to stored audio file
    audio_duration_seconds INT, -- Duration in seconds
    image_url VARCHAR(255), -- Optional image
    is_private BOOLEAN DEFAULT FALSE, -- TRUE = private, FALSE = public
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_is_private (is_private),
    FULLTEXT idx_fulltext_search (title, transcribed_text)
);

-- Post Categories (Many-to-Many relationship)
CREATE TABLE post_categories (
    post_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (post_id, category_id),
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE,
    INDEX idx_category_id (category_id)
);

-- User Category Follows (for feed recommendations)
CREATE TABLE user_category_follows (
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, category_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_category_id (category_id)
);

-- User Follows (following other users)
CREATE TABLE user_follows (
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_follower_id (follower_id),
    INDEX idx_following_id (following_id)
);

-- Post Likes (engagement tracking)
CREATE TABLE post_likes (
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id),
    INDEX idx_liked_at (liked_at)
);

-- Comments (engagement tracking)
CREATE TABLE comments (
    comment_id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Audio Listening History (for recommendations)
CREATE TABLE audio_listening_history (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    listened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    listen_duration_seconds INT, -- How long they actually listened
    completed BOOLEAN DEFAULT FALSE, -- Did they listen to the end?
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_post_id (post_id),
    INDEX idx_listened_at (listened_at)
);

-- Search History (for recommendations)
CREATE TABLE search_history (
    search_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    search_query VARCHAR(255) NOT NULL,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_searched_at (searched_at),
    INDEX idx_search_query (search_query)
);

-- Bookmarks/Saved Posts
CREATE TABLE bookmarks (
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_bookmarked_at (bookmarked_at)
);

-- ============================================
-- SAMPLE SEED DATA
-- ============================================

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Historical Events', 'Posts about significant historical events and eras'),
('Cultural Traditions', 'Cultural practices, traditions, and heritage'),
('Personal Stories', 'Individual memories and personal narratives'),
('Oral History', 'Recorded oral histories and interviews'),
('Family History', 'Family stories and genealogy'),
('Local History', 'Community and local historical accounts');

-- ============================================
-- USEFUL QUERIES FOR THE APPLICATION
-- ============================================

-- Query 1: Get personalized feed for a user
-- (Combines posts from followed users, followed categories, and engagement patterns)
/*
SELECT DISTINCT p.*, u.username, u.display_name
FROM posts p
INNER JOIN users u ON p.user_id = u.user_id
LEFT JOIN post_categories pc ON p.post_id = pc.post_id
LEFT JOIN user_category_follows ucf ON pc.category_id = ucf.category_id AND ucf.user_id = ?
LEFT JOIN user_follows uf ON p.user_id = uf.following_id AND uf.follower_id = ?
WHERE p.is_private = FALSE
  AND (ucf.user_id IS NOT NULL OR uf.follower_id IS NOT NULL OR p.user_id = ?)
ORDER BY p.created_at DESC
LIMIT 50;
*/

-- Query 2: Search posts by text (uses FULLTEXT index)
/*
SELECT p.*, u.username, MATCH(p.title, p.transcribed_text) AGAINST(? IN NATURAL LANGUAGE MODE) AS relevance
FROM posts p
INNER JOIN users u ON p.user_id = u.user_id
WHERE MATCH(p.title, p.transcribed_text) AGAINST(? IN NATURAL LANGUAGE MODE)
  AND (p.is_private = FALSE OR p.user_id = ?)
ORDER BY relevance DESC
LIMIT 50;
*/

-- Query 3: Get user's private posts
/*
SELECT p.*, COUNT(DISTINCT pl.user_id) as like_count, COUNT(DISTINCT c.comment_id) as comment_count
FROM posts p
LEFT JOIN post_likes pl ON p.post_id = pl.post_id
LEFT JOIN comments c ON p.post_id = c.post_id
WHERE p.user_id = ? AND p.is_private = TRUE
GROUP BY p.post_id
ORDER BY p.created_at DESC;
*/

-- Query 4: Get posts by category
/*
SELECT p.*, u.username, u.display_name
FROM posts p
INNER JOIN users u ON p.user_id = u.user_id
INNER JOIN post_categories pc ON p.post_id = pc.post_id
WHERE pc.category_id = ? AND p.is_private = FALSE
ORDER BY p.created_at DESC
LIMIT 50;
*/

-- Query 5: Get user's listening history
/*
SELECT p.*, u.username, alh.listened_at, alh.listen_duration_seconds, alh.completed
FROM audio_listening_history alh
INNER JOIN posts p ON alh.post_id = p.post_id
INNER JOIN users u ON p.user_id = u.user_id
WHERE alh.user_id = ?
ORDER BY alh.listened_at DESC
LIMIT 50;
*/
