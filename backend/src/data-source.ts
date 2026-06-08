import 'dotenv/config'
import { DataSource } from 'typeorm'
import { User } from './users/user.entity'
import { Project } from './projects/project.entity'
import { ProjectMember } from './projects/project-member.entity'
import { Invitation } from './invitations/invitation.entity'
import { Node } from './nodes/node.entity'
import { NodeVersion } from './node-versions/node-version.entity'

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5433),
  username: process.env.DATABASE_USER ?? 'devdraw',
  password: process.env.DATABASE_PASSWORD ?? 'devdraw',
  database: process.env.DATABASE_NAME ?? 'devdraw_dev',
  entities: [User, Project, ProjectMember, Invitation, Node, NodeVersion],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
})
