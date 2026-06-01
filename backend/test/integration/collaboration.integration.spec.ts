import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { io, Socket } from 'socket.io-client'
import * as Y from 'yjs'
import request = require('supertest')
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { JwtService } from '@nestjs/jwt'
import { DataSource } from 'typeorm'
import { AppModule } from '../../src/app.module'
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter'
import { User } from '../../src/users/user.entity'
import { NodeType } from '../../src/nodes/node.entity'

// ─── Helpers ────────────────────────────────────────────────────────────────

function waitForEvent<T = unknown>(socket: Socket, event: string, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const onEvent = (data: T) => {
      clearTimeout(timer)
      socket.off('exception', onException)
      resolve(data)
    }
    const onException = (err: unknown) => {
      clearTimeout(timer)
      socket.off(event, onEvent)
      reject(new Error(`WS exception while waiting for '${event}': ${JSON.stringify(err)}`))
    }
    const timer = setTimeout(() => {
      socket.off(event, onEvent)
      socket.off('exception', onException)
      reject(new Error(`Timeout waiting for '${event}'`))
    }, timeout)
    socket.on(event, onEvent)
    socket.on('exception', onException)
  })
}

function waitForConnect(socket: Socket, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) return resolve()
    const timer = setTimeout(() => reject(new Error('Connection timeout')), timeout)
    socket.once('connect', () => { clearTimeout(timer); resolve() })
    socket.once('connect_error', (err) => { clearTimeout(timer); reject(err) })
  })
}

function waitForDisconnect(socket: Socket, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) return resolve()
    const timer = setTimeout(() => reject(new Error('Disconnect timeout')), timeout)
    socket.once('disconnect', () => { clearTimeout(timer); resolve() })
  })
}

function connectSocket(wsUrl: string, token?: string): Socket {
  return io(wsUrl, {
    auth: token ? { token } : {},
    transports: ['websocket'],
    autoConnect: false,
    reconnection: false,
  })
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('Collaboration WebSocket Integration (Testcontainers)', () => {
  let app: INestApplication
  let container: StartedPostgreSqlContainer
  let wsUrl: string

  let ownerToken: string
  let memberToken: string
  let projectId: string
  let nodeId: string

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('devdraw_test_collab')
      .withUsername('devdraw')
      .withPassword('devdraw')
      .start()

    process.env.DATABASE_HOST = container.getHost()
    process.env.DATABASE_PORT = String(container.getMappedPort(5432))
    process.env.DATABASE_USER = 'devdraw'
    process.env.DATABASE_PASSWORD = 'devdraw'
    process.env.DATABASE_NAME = 'devdraw_test_collab'
    process.env.JWT_ACCESS_SECRET = 'collab-test-secret'
    process.env.ENCRYPTION_MASTER_KEY = 'b'.repeat(64)
    process.env.GOOGLE_CLIENT_ID = 'test-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3001/auth/google/callback'
    process.env.FRONTEND_URL = 'http://localhost:5173'
    process.env.NODE_ENV = 'test'

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.useWebSocketAdapter(new IoAdapter(app))
    app.useGlobalFilters(new GlobalExceptionFilter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))

    await app.listen(0)
    const port = (app.getHttpServer().address() as { port: number }).port
    wsUrl = `http://localhost:${port}/collaboration`

    const jwtService = app.get(JwtService)
    const dataSource = app.get(DataSource)
    const userRepo = dataSource.getRepository(User)
    const http = app.getHttpServer()

    const owner = await userRepo.save({ googleId: 'owner-gid', email: 'owner@devdraw.com', name: 'Owner User' })
    const member = await userRepo.save({ googleId: 'member-gid', email: 'member@devdraw.com', name: 'Member User' })

    ownerToken = jwtService.sign({ sub: owner.id, email: owner.email })
    memberToken = jwtService.sign({ sub: member.id, email: member.email })

    const projectRes = await request(http)
      .post('/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Collab Project' })

    if (projectRes.status !== 201) {
      throw new Error(`Project creation failed: ${projectRes.status} — ${JSON.stringify(projectRes.body)}`)
    }
    projectId = projectRes.body.id

    const invRes = await request(http)
      .post(`/projects/${projectId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ invitedEmail: member.email })

    if (invRes.status !== 201) {
      throw new Error(`Invitation creation failed: ${invRes.status} — ${JSON.stringify(invRes.body)}`)
    }

    const acceptRes = await request(http)
      .post(`/invitations/${invRes.body.token}/accept`)
      .set('Authorization', `Bearer ${memberToken}`)

    if (acceptRes.status !== 204) {
      throw new Error(`Invitation accept failed: ${acceptRes.status} — ${JSON.stringify(acceptRes.body)}`)
    }

    const nodeRes = await request(http)
      .post(`/projects/${projectId}/nodes`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Canvas', type: NodeType.FILE })

    if (nodeRes.status !== 201) {
      throw new Error(`Node creation failed: ${nodeRes.status} — ${JSON.stringify(nodeRes.body)}`)
    }
    nodeId = nodeRes.body.id
  }, 90_000)

  afterAll(async () => {
    await app.close()
    await container.stop()
  }, 30_000)

  // ─── Connection ───────────────────────────────────────────────────────────

  describe('Connection', () => {
    it('should reject and disconnect a socket with no token', async () => {
      const socket = connectSocket(wsUrl)
      socket.connect()

      await waitForDisconnect(socket)

      expect(socket.connected).toBe(false)
    })

    it('should accept a connection with a valid JWT', async () => {
      const socket = connectSocket(wsUrl, ownerToken)
      socket.connect()
      await waitForConnect(socket)

      expect(socket.connected).toBe(true)
      socket.disconnect()
    })
  })

  // ─── Setup verification ───────────────────────────────────────────────────

  describe('Setup', () => {
    it('owner should be able to list project members via REST', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
      expect(res.status).toBe(200)
      expect(res.body.length).toBeGreaterThanOrEqual(2)
    })

    it('member socket should connect and join canvas', async () => {
      const socket = connectSocket(wsUrl, memberToken)
      socket.connect()
      await waitForConnect(socket)
      socket.emit('join-canvas', { nodeId, projectId })
      await waitForEvent(socket, 'sync-state')
      socket.disconnect()
      await waitForDisconnect(socket)
    })
  })

  // ─── join-canvas ──────────────────────────────────────────────────────────

  describe('join-canvas', () => {
    it('should receive sync-state and presence-snapshot on join', async () => {
      const socket = connectSocket(wsUrl, ownerToken)
      socket.connect()
      await waitForConnect(socket)

      socket.emit('join-canvas', { nodeId, projectId })

      const [, presence] = await Promise.all([
        waitForEvent(socket, 'sync-state'),
        waitForEvent<{ presence: unknown[] }>(socket, 'presence-snapshot'),
      ])

      expect(presence.presence).toBeInstanceOf(Array)
      socket.disconnect()
      await waitForDisconnect(socket)
    })

    it('should notify first member when a second user joins the same canvas', async () => {
      const socketOwner = connectSocket(wsUrl, ownerToken)
      socketOwner.connect()
      await waitForConnect(socketOwner)
      socketOwner.emit('join-canvas', { nodeId, projectId })
      await waitForEvent(socketOwner, 'sync-state')

      const socketMember = connectSocket(wsUrl, memberToken)
      socketMember.connect()
      await waitForConnect(socketMember)

      const userJoinedPromise = waitForEvent<{ name: string }>(socketOwner, 'user-joined')
      socketMember.emit('join-canvas', { nodeId, projectId })
      await waitForEvent(socketMember, 'sync-state')

      const joined = await userJoinedPromise
      expect(joined.name).toBe('Member User')

      socketOwner.disconnect()
      socketMember.disconnect()
      await Promise.all([waitForDisconnect(socketOwner), waitForDisconnect(socketMember)])
    })
  })

  // ─── sync-update ──────────────────────────────────────────────────────────

  describe('sync-update', () => {
    it('should broadcast Y.js update to all other clients in the room', async () => {
      const socketSender = connectSocket(wsUrl, ownerToken)
      socketSender.connect()
      await waitForConnect(socketSender)
      socketSender.emit('join-canvas', { nodeId, projectId })
      await waitForEvent(socketSender, 'sync-state')

      const socketReceiver = connectSocket(wsUrl, memberToken)
      socketReceiver.connect()
      await waitForConnect(socketReceiver)
      socketReceiver.emit('join-canvas', { nodeId, projectId })
      await waitForEvent(socketReceiver, 'sync-state')

      const doc = new Y.Doc()
      doc.getText('content').insert(0, 'hello collab')
      const update = Y.encodeStateAsUpdate(doc)

      const updatePromise = waitForEvent<{ update: Buffer }>(socketReceiver, 'sync-update')
      socketSender.emit('sync-update', { nodeId, update: Buffer.from(update) })

      const received = await updatePromise
      const receivedDoc = new Y.Doc()
      Y.applyUpdate(receivedDoc, new Uint8Array(received.update))
      expect(receivedDoc.getText('content').toString()).toBe('hello collab')

      socketSender.disconnect()
      socketReceiver.disconnect()
      await Promise.all([waitForDisconnect(socketSender), waitForDisconnect(socketReceiver)])
    })
  })

  // ─── presence ─────────────────────────────────────────────────────────────

  describe('presence', () => {
    it('should broadcast cursor position to other clients in the room', async () => {
      const socketA = connectSocket(wsUrl, ownerToken)
      socketA.connect()
      await waitForConnect(socketA)
      socketA.emit('join-canvas', { nodeId, projectId })
      await waitForEvent(socketA, 'sync-state')

      const socketB = connectSocket(wsUrl, memberToken)
      socketB.connect()
      await waitForConnect(socketB)
      socketB.emit('join-canvas', { nodeId, projectId })
      await waitForEvent(socketB, 'sync-state')

      const presencePromise = waitForEvent<{ cursor: { x: number; y: number } }>(socketB, 'presence')
      socketA.emit('presence', { nodeId, cursor: { x: 42, y: 99 } })

      const presence = await presencePromise
      expect(presence.cursor).toEqual({ x: 42, y: 99 })

      socketA.disconnect()
      socketB.disconnect()
      await Promise.all([waitForDisconnect(socketA), waitForDisconnect(socketB)])
    })
  })

  // ─── leave-canvas ─────────────────────────────────────────────────────────

  describe('leave-canvas', () => {
    it('should emit user-left to remaining clients when one leaves', async () => {
      const socketA = connectSocket(wsUrl, ownerToken)
      socketA.connect()
      await waitForConnect(socketA)
      socketA.emit('join-canvas', { nodeId, projectId })
      await waitForEvent(socketA, 'sync-state')

      const socketB = connectSocket(wsUrl, memberToken)
      socketB.connect()
      await waitForConnect(socketB)
      socketB.emit('join-canvas', { nodeId, projectId })
      await waitForEvent(socketB, 'sync-state')

      const userLeftPromise = waitForEvent<{ userId: string }>(socketA, 'user-left')
      socketB.emit('leave-canvas')

      const left = await userLeftPromise
      expect(left.userId).toBeDefined()

      socketA.disconnect()
      await waitForDisconnect(socketA)
    })
  })
})
