import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Project } from './project.entity'
import { ProjectMember, ProjectRole } from './project-member.entity'
import { ProjectNotFoundException } from './project-not-found.exception'
import { ForbiddenException } from '../common/exceptions/forbidden.exception'
import { CreateProjectDto } from './dto/create-project.dto'
import { UpdateProjectDto } from './dto/update-project.dto'

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly membersRepository: Repository<ProjectMember>,
  ) {}

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    const project = this.projectsRepository.create({ name: dto.name, ownerId: userId })
    const saved = await this.projectsRepository.save(project)
    await this.membersRepository.save({ projectId: saved.id, userId, role: ProjectRole.OWNER })
    return saved
  }

  async findAllByUser(userId: string): Promise<Project[]> {
    const memberships = await this.membersRepository.find({
      where: { userId },
      select: { projectId: true },
    })
    const projectIds = memberships.map((m) => m.projectId)
    if (projectIds.length === 0) return []
    return this.projectsRepository.find({ where: { id: In(projectIds) } })
  }

  async findByIdOrFail(projectId: string, userId: string): Promise<Project> {
    const project = await this.projectsRepository.findOne({ where: { id: projectId } })
    if (!project) throw new ProjectNotFoundException(projectId)

    const member = await this.membersRepository.findOne({ where: { projectId, userId } })
    if (!member) throw new ProjectNotFoundException(projectId)

    return project
  }

  async assertMembership(
    projectId: string,
    userId: string,
    roles?: ProjectRole[],
  ): Promise<ProjectMember> {
    const member = await this.membersRepository.findOne({ where: { projectId, userId } })
    if (!member) throw new ProjectNotFoundException(projectId)
    if (roles && !roles.includes(member.role)) throw new ForbiddenException()
    return member
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto): Promise<Project> {
    await this.assertMembership(projectId, userId, [ProjectRole.OWNER])

    const project = await this.projectsRepository.findOne({ where: { id: projectId } })
    if (!project) throw new ProjectNotFoundException(projectId)

    if (dto.name) project.name = dto.name
    return this.projectsRepository.save(project)
  }

  async remove(projectId: string, userId: string): Promise<void> {
    await this.assertMembership(projectId, userId, [ProjectRole.OWNER])

    const project = await this.projectsRepository.findOne({ where: { id: projectId } })
    if (!project) throw new ProjectNotFoundException(projectId)

    await this.projectsRepository.remove(project)
  }

  async getMembers(projectId: string, userId: string): Promise<ProjectMember[]> {
    await this.assertMembership(projectId, userId)
    return this.membersRepository.find({ where: { projectId } })
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    targetUserId: string,
    role: ProjectRole,
  ): Promise<ProjectMember> {
    await this.assertMembership(projectId, userId, [ProjectRole.OWNER])

    const target = await this.membersRepository.findOne({ where: { projectId, userId: targetUserId } })
    if (!target) throw new ProjectNotFoundException(projectId)
    if (target.role === ProjectRole.OWNER) throw new ForbiddenException('Cannot change OWNER role')

    target.role = role
    return this.membersRepository.save(target)
  }

  async removeMember(projectId: string, userId: string, targetUserId: string): Promise<void> {
    await this.assertMembership(projectId, userId, [ProjectRole.OWNER])

    const target = await this.membersRepository.findOne({ where: { projectId, userId: targetUserId } })
    if (!target) throw new ProjectNotFoundException(projectId)
    if (target.role === ProjectRole.OWNER) throw new ForbiddenException('Cannot remove project owner')

    await this.membersRepository.remove(target)
  }
}
