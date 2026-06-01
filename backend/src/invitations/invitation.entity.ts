import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm'
import { User } from '../users/user.entity'
import { Project } from '../projects/project.entity'

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project

  @Column({ name: 'invited_by', type: 'uuid' })
  invitedBy: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invited_by' })
  invitedByUser: User

  @Column({ name: 'invited_email' })
  invitedEmail: string

  @Column({ unique: true })
  token: string

  @Column({ type: 'enum', enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
