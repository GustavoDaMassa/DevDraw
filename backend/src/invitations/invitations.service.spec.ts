import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { InvitationsService } from './invitations.service'
import { Invitation, InvitationStatus } from './invitation.entity'
import { ProjectsService } from '../projects/projects.service'
import { ProjectMember, ProjectRole } from '../projects/project-member.entity'
import { NotFoundException } from '../common/exceptions/not-found.exception'
import { ForbiddenException } from '../common/exceptions/forbidden.exception'

const mockInvitation = (overrides: Partial<Invitation> = {}): Invitation =>
  ({
    id: 'inv-1',
    projectId: 'proj-1',
    invitedBy: 'user-1',
    invitedEmail: 'guest@example.com',
    token: 'tok-abc',
    status: InvitationStatus.PENDING,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    ...overrides,
  }) as Invitation

const mockMember = (overrides: Partial<ProjectMember> = {}): ProjectMember =>
  ({ projectId: 'proj-1', userId: 'user-1', role: ProjectRole.OWNER, ...overrides }) as ProjectMember

describe('InvitationsService', () => {
  let service: InvitationsService
  let invRepo: jest.Mocked<Repository<Invitation>>
  let projectsService: jest.Mocked<ProjectsService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: getRepositoryToken(Invitation),
          useValue: { findOne: jest.fn(), find: jest.fn(), save: jest.fn(), remove: jest.fn() },
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: ProjectsService,
          useValue: { assertMembership: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(InvitationsService)
    invRepo = module.get(getRepositoryToken(Invitation))
    projectsService = module.get(ProjectsService)
  })

  describe('create', () => {
    it('should create a pending invitation when user is OWNER', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      invRepo.save.mockResolvedValue(mockInvitation())

      const result = await service.create('proj-1', 'user-1', { invitedEmail: 'guest@example.com' })

      expect(projectsService.assertMembership).toHaveBeenCalledWith('proj-1', 'user-1', [ProjectRole.OWNER])
      expect(invRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          invitedBy: 'user-1',
          invitedEmail: 'guest@example.com',
          status: InvitationStatus.PENDING,
        }),
      )
      expect(result).toMatchObject({ id: 'inv-1' })
    })

    it('should throw ForbiddenException when user is not OWNER', async () => {
      projectsService.assertMembership.mockRejectedValue(new ForbiddenException())

      await expect(
        service.create('proj-1', 'user-1', { invitedEmail: 'x@example.com' }),
      ).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('findByToken', () => {
    it('should return invitation for a valid token', async () => {
      invRepo.findOne.mockResolvedValue(mockInvitation())

      const result = await service.findByToken('tok-abc')

      expect(result).toMatchObject({ token: 'tok-abc' })
    })

    it('should throw NotFoundException for unknown token', async () => {
      invRepo.findOne.mockResolvedValue(null)

      await expect(service.findByToken('bad-tok')).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('accept', () => {
    it('should mark invitation as ACCEPTED and add user as EDITOR member', async () => {
      const invitation = mockInvitation()
      invRepo.findOne.mockResolvedValue(invitation)
      invRepo.save.mockResolvedValue({ ...invitation, status: InvitationStatus.ACCEPTED })
      projectsService.assertMembership.mockRejectedValue(new Error('not member'))

      await service.accept('tok-abc', 'user-2')

      expect(invRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvitationStatus.ACCEPTED }),
      )
    })

    it('should throw NotFoundException for unknown or expired token', async () => {
      invRepo.findOne.mockResolvedValue(null)

      await expect(service.accept('bad-tok', 'user-2')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('should throw ForbiddenException when invitation is not PENDING', async () => {
      invRepo.findOne.mockResolvedValue(mockInvitation({ status: InvitationStatus.ACCEPTED }))

      await expect(service.accept('tok-abc', 'user-2')).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('should throw ForbiddenException when invitation is expired', async () => {
      invRepo.findOne.mockResolvedValue(
        mockInvitation({ expiresAt: new Date(Date.now() - 1000) }),
      )

      await expect(service.accept('tok-abc', 'user-2')).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('decline', () => {
    it('should mark invitation as DECLINED', async () => {
      const invitation = mockInvitation()
      invRepo.findOne.mockResolvedValue(invitation)
      invRepo.save.mockResolvedValue({ ...invitation, status: InvitationStatus.DECLINED })

      await service.decline('tok-abc')

      expect(invRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvitationStatus.DECLINED }),
      )
    })

    it('should throw ForbiddenException when invitation is not PENDING', async () => {
      invRepo.findOne.mockResolvedValue(mockInvitation({ status: InvitationStatus.ACCEPTED }))

      await expect(service.decline('tok-abc')).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('cancel', () => {
    it('should remove pending invitation when user is OWNER', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      invRepo.findOne.mockResolvedValue(mockInvitation())
      invRepo.remove.mockResolvedValue(mockInvitation())

      await service.cancel('proj-1', 'inv-1', 'user-1')

      expect(invRepo.remove).toHaveBeenCalled()
    })

    it('should throw NotFoundException when invitation does not exist', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      invRepo.findOne.mockResolvedValue(null)

      await expect(service.cancel('proj-1', 'inv-1', 'user-1')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('should throw ForbiddenException when invitation is not PENDING', async () => {
      projectsService.assertMembership.mockResolvedValue(mockMember())
      invRepo.findOne.mockResolvedValue(mockInvitation({ status: InvitationStatus.ACCEPTED }))

      await expect(service.cancel('proj-1', 'inv-1', 'user-1')).rejects.toBeInstanceOf(ForbiddenException)
    })
  })
})
