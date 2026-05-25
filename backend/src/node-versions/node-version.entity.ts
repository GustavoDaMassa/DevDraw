import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm'
import { Node } from '../nodes/node.entity'
import { User } from '../users/user.entity'

@Entity('node_versions')
export class NodeVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('uuid')
  nodeId: string

  @ManyToOne(() => Node, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'node_id' })
  node: Node

  @Column('uuid')
  userId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ type: 'bytea' })
  content: Buffer

  @Column({ type: 'int' })
  versionNumber: number

  @CreateDateColumn()
  createdAt: Date
}
