import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Node } from './node.entity'
import { NodesService } from './nodes.service'
import { NodesController } from './nodes.controller'
import { CryptoModule } from '../crypto/crypto.module'
import { NodeVersionsModule } from '../node-versions/node-versions.module'

@Module({
  imports: [TypeOrmModule.forFeature([Node]), CryptoModule, NodeVersionsModule],
  providers: [NodesService],
  controllers: [NodesController],
})
export class NodesModule {}
