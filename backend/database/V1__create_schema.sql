-- DevDraw — Schema v1
-- Gerado em: 2026-05-24
-- Executar com: psql -U devdraw -d devdraw_prod -f V1__create_schema.sql

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS "users" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "google_id"     VARCHAR     NOT NULL,
  "email"         VARCHAR     NOT NULL,
  "name"          VARCHAR     NOT NULL,
  "avatar_url"    VARCHAR,
  "refresh_token" VARCHAR,
  "created_at"    TIMESTAMP   NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMP   NOT NULL DEFAULT now(),

  CONSTRAINT "UQ_users_google_id" UNIQUE ("google_id"),
  CONSTRAINT "UQ_users_email"     UNIQUE ("email"),
  CONSTRAINT "PK_users"           PRIMARY KEY ("id")
);

-- ============================================================
-- NODES  (FOLDER | FILE, auto-referenciado para árvore recursiva)
-- ============================================================
CREATE TYPE IF NOT EXISTS "nodes_type_enum" AS ENUM ('FOLDER', 'FILE');

CREATE TABLE IF NOT EXISTS "nodes" (
  "id"         UUID              NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    UUID              NOT NULL,
  "parent_id"  UUID,
  "name"       VARCHAR           NOT NULL,
  "type"       "nodes_type_enum" NOT NULL,
  "content"    BYTEA,                       -- JSON TLDraw criptografado (AES-256-GCM)
  "deleted_at" TIMESTAMP,                   -- soft delete
  "created_at" TIMESTAMP         NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP         NOT NULL DEFAULT now(),

  CONSTRAINT "PK_nodes"         PRIMARY KEY ("id"),
  CONSTRAINT "FK_nodes_user_id" FOREIGN KEY ("user_id")   REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_nodes_parent"  FOREIGN KEY ("parent_id") REFERENCES "nodes"("id") ON DELETE SET NULL
);

-- Índices para Recursive CTE e queries por usuário
CREATE INDEX IF NOT EXISTS "IDX_nodes_user_id"   ON "nodes" ("user_id");
CREATE INDEX IF NOT EXISTS "IDX_nodes_parent_id" ON "nodes" ("parent_id");
-- Índice parcial: apenas nós não deletados (queries mais frequentes)
CREATE INDEX IF NOT EXISTS "IDX_nodes_active"    ON "nodes" ("user_id", "parent_id")
  WHERE deleted_at IS NULL;

-- ============================================================
-- NODE_VERSIONS  (histórico de snapshots do canvas)
-- ============================================================
CREATE TABLE IF NOT EXISTS "node_versions" (
  "id"             UUID      NOT NULL DEFAULT gen_random_uuid(),
  "node_id"        UUID      NOT NULL,
  "user_id"        UUID      NOT NULL,
  "content"        BYTEA     NOT NULL,    -- snapshot criptografado
  "version_number" INTEGER   NOT NULL,
  "created_at"     TIMESTAMP NOT NULL DEFAULT now(),

  CONSTRAINT "PK_node_versions"         PRIMARY KEY ("id"),
  CONSTRAINT "FK_node_versions_node_id" FOREIGN KEY ("node_id") REFERENCES "nodes"("id")  ON DELETE CASCADE,
  CONSTRAINT "FK_node_versions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_node_versions_node_user" ON "node_versions" ("node_id", "user_id");
