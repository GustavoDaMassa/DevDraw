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

  @Column({ name: 'google_id', unique: true, nullable: true })
  googleId?: string

  @Column({ name: 'password_hash', nullable: true })
  passwordHash?: string

  @Column({ unique: true })
  email: string

  @Column()
  name: string

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string

  @Column({ name: 'refresh_token', nullable: true })
  refreshToken?: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
