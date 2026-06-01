import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Server, Socket } from 'socket.io'
import { CollaborationService } from './collaboration.service'
import { ProjectsService } from '../projects/projects.service'
import { UsersService } from '../users/users.service'

interface JoinCanvasPayload {
  nodeId: string
  projectId: string
}

interface SyncUpdatePayload {
  nodeId: string
  update: Buffer
}

interface PresencePayload {
  nodeId: string
  cursor?: { x: number; y: number }
}

interface AuthenticatedSocket extends Socket {
  userId: string
  userName: string
  userAvatar?: string
}

@WebSocketGateway({
  namespace: '/collaboration',
  cors: { origin: '*', credentials: true },
})
export class CollaborationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(CollaborationGateway.name)
  private readonly socketRooms = new Map<string, string>()

  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.token as string) ??
        (client.handshake.query?.token as string)

      if (!token) throw new WsException('Missing token')

      const payload = this.jwtService.verify(token) as { sub: string; email: string }
      const user = await this.usersService.findById(payload.sub)

      if (!user) throw new WsException('User not found')

      client.userId = user.id
      client.userName = user.name
      client.userAvatar = user.avatarUrl
    } catch {
      this.logger.warn(`Rejected unauthenticated connection: ${client.id}`)
      client.disconnect()
    }
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const nodeId = this.socketRooms.get(client.id)
    if (!nodeId) return

    this.socketRooms.delete(client.id)
    this.collaborationService.removePresence(nodeId, client.id)

    const room = this.server.in(`canvas:${nodeId}`)
    const sockets = await room.fetchSockets()

    if (sockets.length === 0) {
      await this.collaborationService.freeDoc(nodeId)
    } else {
      room.emit('user-left', { userId: client.userId })
    }
  }

  @SubscribeMessage('join-canvas')
  async handleJoinCanvas(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinCanvasPayload,
  ): Promise<void> {
    const { nodeId, projectId } = payload

    try {
      await this.projectsService.assertMembership(projectId, client.userId)
    } catch {
      throw new WsException('Not a project member')
    }

    const previousRoom = this.socketRooms.get(client.id)
    if (previousRoom && previousRoom !== nodeId) {
      client.leave(`canvas:${previousRoom}`)
      this.collaborationService.removePresence(previousRoom, client.id)
    }

    await client.join(`canvas:${nodeId}`)
    this.socketRooms.set(client.id, nodeId)

    const doc = await this.collaborationService.getOrLoadDoc(nodeId)
    const state = this.collaborationService.encodeFullState(nodeId)

    if (state) {
      client.emit('sync-state', { state })
    }

    const presence = this.collaborationService.getPresence(nodeId)
    client.emit('presence-snapshot', { presence })

    client.to(`canvas:${nodeId}`).emit('user-joined', {
      userId: client.userId,
      name: client.userName,
      avatarUrl: client.userAvatar,
    })

    this.logger.log(`User ${client.userId} joined canvas ${nodeId}`)
  }

  @SubscribeMessage('leave-canvas')
  async handleLeaveCanvas(
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<void> {
    const nodeId = this.socketRooms.get(client.id)
    if (!nodeId) return

    client.leave(`canvas:${nodeId}`)
    this.socketRooms.delete(client.id)
    this.collaborationService.removePresence(nodeId, client.id)

    const room = this.server.in(`canvas:${nodeId}`)
    const sockets = await room.fetchSockets()

    if (sockets.length === 0) {
      await this.collaborationService.freeDoc(nodeId)
    } else {
      room.emit('user-left', { userId: client.userId })
      await this.collaborationService.persistDoc(nodeId)
    }
  }

  @SubscribeMessage('sync-update')
  handleSyncUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SyncUpdatePayload,
  ): void {
    const { nodeId, update } = payload
    const currentRoom = this.socketRooms.get(client.id)

    if (currentRoom !== nodeId) return

    this.collaborationService.applyUpdate(nodeId, new Uint8Array(update))
    client.to(`canvas:${nodeId}`).emit('sync-update', { update })
  }

  @SubscribeMessage('presence')
  handlePresence(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: PresencePayload,
  ): void {
    const { nodeId, cursor } = payload
    const currentRoom = this.socketRooms.get(client.id)

    if (currentRoom !== nodeId) return

    this.collaborationService.setPresence(nodeId, client.id, {
      userId: client.userId,
      name: client.userName,
      avatarUrl: client.userAvatar,
      cursor,
    })

    client.to(`canvas:${nodeId}`).emit('presence', {
      userId: client.userId,
      name: client.userName,
      avatarUrl: client.userAvatar,
      cursor,
    })
  }
}
