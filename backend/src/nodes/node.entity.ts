import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm'
import { User } from '../users/user.entity'
import { Project } from '../projects/project.entity'

export enum NodeType {
  FOLDER = 'FOLDER',
  FILE = 'FILE',
}

@Entity('nodes')
export class Node {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string

  @ManyToOne(() => Node, (node) => node.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Node

  @OneToMany(() => Node, (node) => node.parent)
  children: Node[]

  @Column()
  name: string

  @Column({ type: 'enum', enum: NodeType })
  type: NodeType

  @Column({ type: 'bytea', nullable: true })
  content?: Buffer

  @Column({ name: 'sync_state', type: 'bytea', nullable: true })
  syncState?: Buffer

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
