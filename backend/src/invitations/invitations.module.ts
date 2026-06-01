import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Invitation } from './invitation.entity'
import { ProjectMember } from '../projects/project-member.entity'
import { InvitationsService } from './invitations.service'
import { InvitationsController } from './invitations.controller'
import { ProjectsModule } from '../projects/projects.module'

@Module({
  imports: [TypeOrmModule.forFeature([Invitation, ProjectMember]), ProjectsModule],
  providers: [InvitationsService],
  controllers: [InvitationsController],
})
export class InvitationsModule {}
