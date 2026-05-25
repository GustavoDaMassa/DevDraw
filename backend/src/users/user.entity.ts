import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  googleId: string

  @Column({ unique: true })
  email: string

  @Column()
  name: string

  @Column({ nullable: true })
  avatarUrl?: string

  @Column({ nullable: true })
  refreshToken?: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
