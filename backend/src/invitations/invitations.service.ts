import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { randomUUID } from 'crypto'
import { Invitation, InvitationStatus } from './invitation.entity'
import { ProjectsService } from '../projects/projects.service'
import { ProjectMember, ProjectRole } from '../projects/project-member.entity'
import { NotFoundException } from '../common/exceptions/not-found.exception'
import { ForbiddenException } from '../common/exceptions/forbidden.exception'
import { CreateInvitationDto } from './dto/create-invitation.dto'

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationsRepository: Repository<Invitation>,
    private readonly projectsService: ProjectsService,
    @InjectRepository(ProjectMember)
    private readonly membersRepository: Repository<ProjectMember>,
  ) {}

  async create(projectId: string, userId: string, dto: CreateInvitationDto): Promise<Invitation> {
    await this.projectsService.assertMembership(projectId, userId, [ProjectRole.OWNER])

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    return this.invitationsRepository.save({
      projectId,
      invitedBy: userId,
      invitedEmail: dto.invitedEmail,
      token: randomUUID(),
      status: InvitationStatus.PENDING,
      expiresAt,
    })
  }

  async findByToken(token: string): Promise<Invitation> {
    const invitation = await this.invitationsRepository.findOne({ where: { token } })
    if (!invitation) throw new NotFoundException(`Invitation`)
    return invitation
  }

  async accept(token: string, userId: string): Promise<void> {
    const invitation = await this.invitationsRepository.findOne({ where: { token } })
    if (!invitation) throw new NotFoundException(`Invitation`)
    if (invitation.status !== InvitationStatus.PENDING) throw new ForbiddenException('Invitation is no longer pending')
    if (invitation.expiresAt < new Date()) throw new ForbiddenException('Invitation has expired')

    invitation.status = InvitationStatus.ACCEPTED
    await this.invitationsRepository.save(invitation)

    const alreadyMember = await this.membersRepository.findOne({
      where: { projectId: invitation.projectId, userId },
    })
    if (!alreadyMember) {
      await this.membersRepository.save({
        projectId: invitation.projectId,
        userId,
        role: ProjectRole.EDITOR,
      })
    }
  }

  async decline(token: string): Promise<void> {
    const invitation = await this.invitationsRepository.findOne({ where: { token } })
    if (!invitation) throw new NotFoundException(`Invitation`)
    if (invitation.status !== InvitationStatus.PENDING) throw new ForbiddenException('Invitation is no longer pending')

    invitation.status = InvitationStatus.DECLINED
    await this.invitationsRepository.save(invitation)
  }

  async cancel(projectId: string, invitationId: string, userId: string): Promise<void> {
    await this.projectsService.assertMembership(projectId, userId, [ProjectRole.OWNER])

    const invitation = await this.invitationsRepository.findOne({
      where: { id: invitationId, projectId },
    })
    if (!invitation) throw new NotFoundException(`Invitation ${invitationId}`)
    if (invitation.status !== InvitationStatus.PENDING) throw new ForbiddenException('Only pending invitations can be cancelled')

    await this.invitationsRepository.remove(invitation)
  }
}
