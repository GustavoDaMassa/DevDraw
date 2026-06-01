import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Node } from '../nodes/node.entity'
import { CollaborationService } from './collaboration.service'
import { CollaborationGateway } from './collaboration.gateway'
import { ProjectsModule } from '../projects/projects.module'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [TypeOrmModule.forFeature([Node]), ProjectsModule, AuthModule, UsersModule],
  providers: [CollaborationService, CollaborationGateway],
})
export class CollaborationModule {}
