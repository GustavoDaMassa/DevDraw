import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './auth/auth.module'
import { CryptoModule } from './crypto/crypto.module'
import { ProjectsModule } from './projects/projects.module'
import { InvitationsModule } from './invitations/invitations.module'
import { NodesModule } from './nodes/nodes.module'
import { User } from './users/user.entity'
import { Project } from './projects/project.entity'
import { ProjectMember } from './projects/project-member.entity'
import { Invitation } from './invitations/invitation.entity'
import { Node } from './nodes/node.entity'
import { NodeVersion } from './node-versions/node-version.entity'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5433),
        username: config.get('DATABASE_USER', 'devdraw'),
        password: config.get('DATABASE_PASSWORD', 'devdraw'),
        database: config.get('DATABASE_NAME', 'devdraw_dev'),
        entities: [User, Project, ProjectMember, Invitation, Node, NodeVersion],
        synchronize: config.get('NODE_ENV') !== 'production',
        migrationsRun: config.get('NODE_ENV') === 'production',
        migrations: [__dirname + '/migrations/*.{ts,js}'],
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    CryptoModule,
    AuthModule,
    ProjectsModule,
    InvitationsModule,
    NodesModule,
  ],
})
export class AppModule {}
