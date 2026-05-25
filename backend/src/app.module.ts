import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './auth/auth.module'
import { CryptoModule } from './crypto/crypto.module'
import { NodesModule } from './nodes/nodes.module'
import { User } from './users/user.entity'
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
        entities: [User, Node, NodeVersion],
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    CryptoModule,
    AuthModule,
    NodesModule,
  ],
})
export class AppModule {}
