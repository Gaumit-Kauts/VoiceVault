

-- 1) Users
CREATE TABLE users (
  user_id       BIGSERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(120),
  avatar_url    VARCHAR(500),
  bio           TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2) Audio Posts
CREATE TABLE audio_posts (
  post_id        BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL,

  title          VARCHAR(255) NOT NULL,
  description    TEXT,

  visibility     VARCHAR(20) NOT NULL DEFAULT 'private',
  status         VARCHAR(20) NOT NULL DEFAULT 'uploaded',

  recorded_date  DATE,
  language       VARCHAR(20) DEFAULT 'en',

  storage_prefix VARCHAR(500) NOT NULL,

  manifest_sha256 CHAR(64),
  bundle_sha256   CHAR(64),

  published_at   TIMESTAMP,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_audio_posts_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
      ON DELETE CASCADE,

  CONSTRAINT chk_audio_visibility
    CHECK (visibility IN ('private','public')),

  CONSTRAINT chk_audio_status
    CHECK (status IN ('uploaded','processing','ready','failed'))
);

CREATE INDEX idx_audio_posts_user ON audio_posts(user_id);
CREATE INDEX idx_audio_posts_visibility ON audio_posts(visibility);

-- 3) Archive Files (integrity ledger)
CREATE TABLE archive_files (
  file_id      BIGSERIAL PRIMARY KEY,
  post_id      BIGINT NOT NULL,

  role         VARCHAR(30) NOT NULL,
  path         VARCHAR(500) NOT NULL,
  content_type VARCHAR(120),
  size_bytes   BIGINT,
  sha256       CHAR(64) NOT NULL,

  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_archive_files_post
    FOREIGN KEY (post_id) REFERENCES audio_posts(post_id)
      ON DELETE CASCADE,

  CONSTRAINT uq_archive_post_role UNIQUE (post_id, role),
  CONSTRAINT uq_archive_post_path UNIQUE (post_id, path),

  CONSTRAINT chk_archive_role CHECK (role IN (
    'original_audio',
    'normalized_audio',
    'transcript_json',
    'transcript_txt',
    'metadata',
    'rights',
    'manifest',
    'bundle'
  ))
);

CREATE INDEX idx_archive_files_post ON archive_files(post_id);

-- 4) Archive Metadata (store JSON as TEXT to keep it "plain")
CREATE TABLE archive_metadata (
  post_id     BIGINT PRIMARY KEY,
  metadata    TEXT NOT NULL,  -- JSON string

  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_archive_metadata_post
    FOREIGN KEY (post_id) REFERENCES audio_posts(post_id)
      ON DELETE CASCADE
);

-- 5) Archive Rights / Consent (store arrays as TEXT to keep it "plain")
CREATE TABLE archive_rights (
  post_id             BIGINT PRIMARY KEY,

  has_speaker_consent BOOLEAN NOT NULL DEFAULT FALSE,
  license             VARCHAR(50),
  consent_notes       TEXT,

  allowed_use         TEXT,  -- JSON string like ["education","research"]
  restrictions        TEXT,  -- JSON string like ["no_doxxing"]

  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_archive_rights_post
    FOREIGN KEY (post_id) REFERENCES audio_posts(post_id)
      ON DELETE CASCADE
);

-- 6) RAG Chunks (store embeddings as TEXT to keep it "plain")
CREATE TABLE rag_chunks (
  chunk_id    BIGSERIAL PRIMARY KEY,
  post_id     BIGINT NOT NULL,

  start_sec   DOUBLE PRECISION NOT NULL,
  end_sec     DOUBLE PRECISION NOT NULL,
  text        TEXT NOT NULL,
  confidence  DOUBLE PRECISION,

  embedding   TEXT, -- JSON string like [0.01, -0.02, ...]

  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_rag_chunks_post
    FOREIGN KEY (post_id) REFERENCES audio_posts(post_id)
      ON DELETE CASCADE
);

CREATE INDEX idx_rag_chunks_post ON rag_chunks(post_id);

-- 7) Audit Log
CREATE TABLE audit_log (
  log_id     BIGSERIAL PRIMARY KEY,
  post_id    BIGINT,
  user_id    BIGINT,
  action     VARCHAR(50) NOT NULL,
  details    TEXT, -- JSON string
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_audit_post
    FOREIGN KEY (post_id) REFERENCES audio_posts(post_id)
      ON DELETE SET NULL,

  CONSTRAINT fk_audit_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
      ON DELETE SET NULL
);

CREATE INDEX idx_audit_post ON audit_log(post_id);
