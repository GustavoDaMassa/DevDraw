import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NodeVersion } from './node-version.entity'
import { NodeVersionsService } from './node-versions.service'

@Module({
  imports: [TypeOrmModule.forFeature([NodeVersion])],
  providers: [NodeVersionsService],
  exports: [NodeVersionsService],
})
export class NodeVersionsModule {}
