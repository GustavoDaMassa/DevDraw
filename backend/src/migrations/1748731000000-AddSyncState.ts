import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSyncState1748731000000 implements MigrationInterface {
  name = 'AddSyncState1748731000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nodes" ADD COLUMN "sync_state" BYTEA
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "nodes" DROP COLUMN "sync_state"`)
  }
}
