import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCollaboration1748730000000 implements MigrationInterface {
  name = 'AddCollaboration1748730000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id"         UUID      NOT NULL DEFAULT gen_random_uuid(),
        "owner_id"   UUID      NOT NULL,
        "name"       VARCHAR   NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects"          PRIMARY KEY ("id"),
        CONSTRAINT "FK_projects_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`CREATE TYPE "project_members_role_enum" AS ENUM ('OWNER', 'EDITOR', 'VIEWER')`)

    await queryRunner.query(`
      CREATE TABLE "project_members" (
        "id"         UUID                        NOT NULL DEFAULT gen_random_uuid(),
        "project_id" UUID                        NOT NULL,
        "user_id"    UUID                        NOT NULL,
        "role"       "project_members_role_enum" NOT NULL,
        "joined_at"  TIMESTAMP                   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_members"              PRIMARY KEY ("id"),
        CONSTRAINT "UQ_project_members_project_user" UNIQUE ("project_id", "user_id"),
        CONSTRAINT "FK_project_members_project_id"   FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_members_user_id"      FOREIGN KEY ("user_id")    REFERENCES "users"("id")    ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`CREATE INDEX "IDX_project_members_user_id" ON "project_members" ("user_id")`)

    await queryRunner.query(`CREATE TYPE "invitations_status_enum" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED')`)

    await queryRunner.query(`
      CREATE TABLE "invitations" (
        "id"            UUID                      NOT NULL DEFAULT gen_random_uuid(),
        "project_id"    UUID                      NOT NULL,
        "invited_by"    UUID                      NOT NULL,
        "invited_email" VARCHAR                   NOT NULL,
        "token"         VARCHAR                   NOT NULL,
        "status"        "invitations_status_enum" NOT NULL DEFAULT 'PENDING',
        "expires_at"    TIMESTAMPTZ               NOT NULL,
        "created_at"    TIMESTAMP                 NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invitations"            PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invitations_token"      UNIQUE ("token"),
        CONSTRAINT "FK_invitations_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invitations_invited_by" FOREIGN KEY ("invited_by") REFERENCES "users"("id")    ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`CREATE INDEX "IDX_invitations_project_id" ON "invitations" ("project_id")`)

    await queryRunner.query(`ALTER TABLE "nodes" DROP CONSTRAINT "FK_nodes_user_id"`)
    await queryRunner.query(`DROP INDEX "IDX_nodes_user_id"`)
    await queryRunner.query(`DROP INDEX "IDX_nodes_active"`)

    await queryRunner.query(`ALTER TABLE "nodes" ADD COLUMN "project_id" UUID`)
    await queryRunner.query(`ALTER TABLE "nodes" ADD COLUMN "created_by" UUID`)

    await queryRunner.query(`
      ALTER TABLE "nodes"
        ADD CONSTRAINT "FK_nodes_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_nodes_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id")    ON DELETE SET NULL
    `)

    await queryRunner.query(`ALTER TABLE "nodes" DROP COLUMN "user_id"`)

    await queryRunner.query(`ALTER TABLE "nodes" ALTER COLUMN "project_id" SET NOT NULL`)
    await queryRunner.query(`ALTER TABLE "nodes" ALTER COLUMN "created_by" SET NOT NULL`)

    await queryRunner.query(`CREATE INDEX "IDX_nodes_project_id" ON "nodes" ("project_id")`)
    await queryRunner.query(`
      CREATE INDEX "IDX_nodes_active" ON "nodes" ("project_id", "parent_id")
      WHERE deleted_at IS NULL
    `)

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_node_versions_node_user"`)
    await queryRunner.query(`CREATE INDEX "IDX_node_versions_node_id" ON "node_versions" ("node_id")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_node_versions_node_id"`)
    await queryRunner.query(`
      CREATE INDEX "IDX_node_versions_node_user" ON "node_versions" ("node_id", "user_id")
    `)

    await queryRunner.query(`DROP INDEX "IDX_nodes_active"`)
    await queryRunner.query(`DROP INDEX "IDX_nodes_project_id"`)
    await queryRunner.query(`ALTER TABLE "nodes" DROP CONSTRAINT "FK_nodes_project_id"`)
    await queryRunner.query(`ALTER TABLE "nodes" DROP CONSTRAINT "FK_nodes_created_by"`)
    await queryRunner.query(`ALTER TABLE "nodes" ADD COLUMN "user_id" UUID`)
    await queryRunner.query(`ALTER TABLE "nodes" DROP COLUMN "project_id"`)
    await queryRunner.query(`ALTER TABLE "nodes" DROP COLUMN "created_by"`)
    await queryRunner.query(`
      ALTER TABLE "nodes"
        ADD CONSTRAINT "FK_nodes_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `)
    await queryRunner.query(`CREATE INDEX "IDX_nodes_user_id" ON "nodes" ("user_id")`)
    await queryRunner.query(`
      CREATE INDEX "IDX_nodes_active" ON "nodes" ("user_id", "parent_id")
      WHERE deleted_at IS NULL
    `)

    await queryRunner.query(`DROP INDEX "IDX_invitations_project_id"`)
    await queryRunner.query(`DROP TABLE "invitations"`)
    await queryRunner.query(`DROP TYPE "invitations_status_enum"`)
    await queryRunner.query(`DROP INDEX "IDX_project_members_user_id"`)
    await queryRunner.query(`DROP TABLE "project_members"`)
    await queryRunner.query(`DROP TYPE "project_members_role_enum"`)
    await queryRunner.query(`DROP TABLE "projects"`)
  }
}
