import 'dotenv/config'
import { DataSource } from 'typeorm'
import { User } from './users/user.entity'
import { Node } from './nodes/node.entity'
import { NodeVersion } from './node-versions/node-version.entity'

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5433),
  username: process.env.DATABASE_USER ?? 'devdraw',
  password: process.env.DATABASE_PASSWORD ?? 'devdraw',
  database: process.env.DATABASE_NAME ?? 'devdraw_dev',
  entities: [User, Node, NodeVersion],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
})
