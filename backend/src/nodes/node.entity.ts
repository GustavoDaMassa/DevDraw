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

export enum NodeType {
  FOLDER = 'FOLDER',
  FILE = 'FILE',
}

@Entity('nodes')
export class Node {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  userId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column('uuid', { nullable: true })
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

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
