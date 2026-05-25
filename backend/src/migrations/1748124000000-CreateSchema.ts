import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateSchema1748124000000 implements MigrationInterface {
  name = 'CreateSchema1748124000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
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
      )
    `)

    await queryRunner.query(`CREATE TYPE "nodes_type_enum" AS ENUM ('FOLDER', 'FILE')`)

    await queryRunner.query(`
      CREATE TABLE "nodes" (
        "id"         UUID              NOT NULL DEFAULT gen_random_uuid(),
        "user_id"    UUID              NOT NULL,
        "parent_id"  UUID,
        "name"       VARCHAR           NOT NULL,
        "type"       "nodes_type_enum" NOT NULL,
        "content"    BYTEA,
        "deleted_at" TIMESTAMP,
        "created_at" TIMESTAMP         NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_nodes"          PRIMARY KEY ("id"),
        CONSTRAINT "FK_nodes_user_id"  FOREIGN KEY ("user_id")   REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_nodes_parent"   FOREIGN KEY ("parent_id") REFERENCES "nodes"("id") ON DELETE SET NULL
      )
    `)

    await queryRunner.query(`CREATE INDEX "IDX_nodes_user_id"   ON "nodes" ("user_id")`)
    await queryRunner.query(`CREATE INDEX "IDX_nodes_parent_id" ON "nodes" ("parent_id")`)
    await queryRunner.query(`
      CREATE INDEX "IDX_nodes_active" ON "nodes" ("user_id", "parent_id")
      WHERE deleted_at IS NULL
    `)

    await queryRunner.query(`
      CREATE TABLE "node_versions" (
        "id"             UUID      NOT NULL DEFAULT gen_random_uuid(),
        "node_id"        UUID      NOT NULL,
        "user_id"        UUID      NOT NULL,
        "content"        BYTEA     NOT NULL,
        "version_number" INTEGER   NOT NULL,
        "created_at"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_node_versions"         PRIMARY KEY ("id"),
        CONSTRAINT "FK_node_versions_node_id" FOREIGN KEY ("node_id") REFERENCES "nodes"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_node_versions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE INDEX "IDX_node_versions_node_user" ON "node_versions" ("node_id", "user_id")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "node_versions"`)
    await queryRunner.query(`DROP INDEX "IDX_nodes_active"`)
    await queryRunner.query(`DROP INDEX "IDX_nodes_parent_id"`)
    await queryRunner.query(`DROP INDEX "IDX_nodes_user_id"`)
    await queryRunner.query(`DROP TABLE "nodes"`)
    await queryRunner.query(`DROP TYPE "nodes_type_enum"`)
    await queryRunner.query(`DROP TABLE "users"`)
  }
}
