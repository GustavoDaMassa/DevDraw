import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProjectsService } from './projects.service'
import { Project } from './project.entity'
import { ProjectMember, ProjectRole } from './project-member.entity'
import { ProjectNotFoundException } from './project-not-found.exception'
import { ForbiddenException } from '../common/exceptions/forbidden.exception'

const mockProject = (overrides: Partial<Project> = {}): Project =>
  ({
    id: 'proj-1',
    ownerId: 'user-1',
    name: 'My Project',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Project

const mockMember = (overrides: Partial<ProjectMember> = {}): ProjectMember =>
  ({
    id: 'member-1',
    projectId: 'proj-1',
    userId: 'user-1',
    role: ProjectRole.OWNER,
    joinedAt: new Date(),
    ...overrides,
  }) as ProjectMember

describe('ProjectsService', () => {
  let service: ProjectsService
  let projectRepo: jest.Mocked<Repository<Project>>
  let memberRepo: jest.Mocked<Repository<ProjectMember>>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: { findOne: jest.fn(), find: jest.fn(), save: jest.fn(), create: jest.fn(), remove: jest.fn() },
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: { findOne: jest.fn(), find: jest.fn(), save: jest.fn(), create: jest.fn(), remove: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(ProjectsService)
    projectRepo = module.get(getRepositoryToken(Project))
    memberRepo = module.get(getRepositoryToken(ProjectMember))
  })

  describe('create', () => {
    it('should create a project and add creator as OWNER member', async () => {
      const project = mockProject()
      projectRepo.create.mockReturnValue(project)
      projectRepo.save.mockResolvedValue(project)
      memberRepo.save.mockResolvedValue(mockMember())

      const result = await service.create('user-1', { name: 'My Project' })

      expect(projectRepo.create).toHaveBeenCalledWith({ name: 'My Project', ownerId: 'user-1' })
      expect(memberRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: project.id, userId: 'user-1', role: ProjectRole.OWNER }),
      )
      expect(result).toMatchObject({ id: 'proj-1' })
    })
  })

  describe('findAllByUser', () => {
    it('should return all projects where user is a member', async () => {
      memberRepo.find.mockResolvedValue([mockMember({ projectId: 'proj-1' })])
      projectRepo.find.mockResolvedValue([mockProject()])

      const result = await service.findAllByUser('user-1')

      expect(memberRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }))
      expect(projectRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { id: expect.anything() } }))
      expect(result).toHaveLength(1)
    })
  })

  describe('findByIdOrFail', () => {
    it('should return project when user is a member', async () => {
      projectRepo.findOne.mockResolvedValue(mockProject())
      memberRepo.findOne.mockResolvedValue(mockMember())

      const result = await service.findByIdOrFail('proj-1', 'user-1')

      expect(result).toMatchObject({ id: 'proj-1' })
    })

    it('should throw ProjectNotFoundException when project does not exist', async () => {
      projectRepo.findOne.mockResolvedValue(null)

      await expect(service.findByIdOrFail('proj-1', 'user-1')).rejects.toBeInstanceOf(ProjectNotFoundException)
    })

    it('should throw ProjectNotFoundException when user is not a member', async () => {
      projectRepo.findOne.mockResolvedValue(mockProject())
      memberRepo.findOne.mockResolvedValue(null)

      await expect(service.findByIdOrFail('proj-1', 'user-2')).rejects.toBeInstanceOf(ProjectNotFoundException)
    })
  })

  describe('assertMembership', () => {
    it('should return member when user has sufficient role', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember({ role: ProjectRole.EDITOR }))

      const result = await service.assertMembership('proj-1', 'user-1', [ProjectRole.EDITOR, ProjectRole.OWNER])

      expect(result).toMatchObject({ role: ProjectRole.EDITOR })
    })

    it('should throw ProjectNotFoundException when user is not a member', async () => {
      memberRepo.findOne.mockResolvedValue(null)

      await expect(service.assertMembership('proj-1', 'user-1')).rejects.toBeInstanceOf(ProjectNotFoundException)
    })

    it('should throw ForbiddenException when user role is insufficient', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember({ role: ProjectRole.VIEWER }))

      await expect(
        service.assertMembership('proj-1', 'user-1', [ProjectRole.EDITOR, ProjectRole.OWNER]),
      ).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('update', () => {
    it('should rename project when user is OWNER', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember({ role: ProjectRole.OWNER }))
      const project = mockProject()
      projectRepo.findOne.mockResolvedValue(project)
      projectRepo.save.mockResolvedValue({ ...project, name: 'Renamed' } as Project)

      const result = await service.update('proj-1', 'user-1', { name: 'Renamed' })

      expect(result.name).toBe('Renamed')
    })

    it('should throw ForbiddenException when user is not OWNER', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember({ role: ProjectRole.EDITOR }))

      await expect(service.update('proj-1', 'user-1', { name: 'X' })).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('remove', () => {
    it('should delete project when user is OWNER', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember({ role: ProjectRole.OWNER }))
      const project = mockProject()
      projectRepo.findOne.mockResolvedValue(project)
      projectRepo.remove.mockResolvedValue(project)

      await service.remove('proj-1', 'user-1')

      expect(projectRepo.remove).toHaveBeenCalledWith(project)
    })

    it('should throw ForbiddenException when user is not OWNER', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember({ role: ProjectRole.EDITOR }))

      await expect(service.remove('proj-1', 'user-1')).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('getMembers', () => {
    it('should return members when user is a member', async () => {
      memberRepo.findOne.mockResolvedValue(mockMember())
      memberRepo.find.mockResolvedValue([mockMember()])

      const result = await service.getMembers('proj-1', 'user-1')

      expect(result).toHaveLength(1)
    })
  })

  describe('updateMemberRole', () => {
    it('should update role when user is OWNER and target is not OWNER', async () => {
      const ownerMember = mockMember({ userId: 'user-1', role: ProjectRole.OWNER })
      const editorMember = mockMember({ id: 'member-2', userId: 'user-2', role: ProjectRole.EDITOR })
      memberRepo.findOne
        .mockResolvedValueOnce(ownerMember)
        .mockResolvedValueOnce(editorMember)
      memberRepo.save.mockResolvedValue({ ...editorMember, role: ProjectRole.VIEWER } as ProjectMember)

      const result = await service.updateMemberRole('proj-1', 'user-1', 'user-2', ProjectRole.VIEWER)

      expect(result.role).toBe(ProjectRole.VIEWER)
    })

    it('should throw ForbiddenException when trying to change OWNER role', async () => {
      const ownerMember = mockMember({ userId: 'user-1', role: ProjectRole.OWNER })
      const targetOwner = mockMember({ id: 'member-2', userId: 'user-2', role: ProjectRole.OWNER })
      memberRepo.findOne
        .mockResolvedValueOnce(ownerMember)
        .mockResolvedValueOnce(targetOwner)

      await expect(
        service.updateMemberRole('proj-1', 'user-1', 'user-2', ProjectRole.EDITOR),
      ).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('removeMember', () => {
    it('should remove member when user is OWNER and target is not OWNER', async () => {
      const ownerMember = mockMember({ userId: 'user-1', role: ProjectRole.OWNER })
      const editorMember = mockMember({ id: 'member-2', userId: 'user-2', role: ProjectRole.EDITOR })
      memberRepo.findOne
        .mockResolvedValueOnce(ownerMember)
        .mockResolvedValueOnce(editorMember)
      memberRepo.remove.mockResolvedValue(editorMember)

      await service.removeMember('proj-1', 'user-1', 'user-2')

      expect(memberRepo.remove).toHaveBeenCalledWith(editorMember)
    })

    it('should throw ForbiddenException when trying to remove OWNER', async () => {
      const ownerMember = mockMember({ userId: 'user-1', role: ProjectRole.OWNER })
      const targetOwner = mockMember({ id: 'member-2', userId: 'user-2', role: ProjectRole.OWNER })
      memberRepo.findOne
        .mockResolvedValueOnce(ownerMember)
        .mockResolvedValueOnce(targetOwner)

      await expect(service.removeMember('proj-1', 'user-1', 'user-2')).rejects.toBeInstanceOf(ForbiddenException)
    })
  })
})
