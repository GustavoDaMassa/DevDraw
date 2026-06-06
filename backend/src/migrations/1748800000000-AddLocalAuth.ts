import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLocalAuth1748800000000 implements MigrationInterface {
  name = 'AddLocalAuth1748800000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "google_id" DROP NOT NULL`)
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "password_hash" VARCHAR`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_hash"`)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "google_id" SET NOT NULL`)
  }
}
