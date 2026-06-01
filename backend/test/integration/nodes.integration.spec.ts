import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request = require('supertest')
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { JwtService } from '@nestjs/jwt'
import { DataSource } from 'typeorm'
import { AppModule } from '../../src/app.module'
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter'
import { User } from '../../src/users/user.entity'
import { NodeType } from '../../src/nodes/node.entity'

describe('DevDraw Integration (Testcontainers)', () => {
  let app: INestApplication
  let container: StartedPostgreSqlContainer
  let authToken: string
  let projectId: string
  let folderId: string
  let fileId: string

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('devdraw_test')
      .withUsername('devdraw')
      .withPassword('devdraw')
      .start()

    process.env.DATABASE_HOST = container.getHost()
    process.env.DATABASE_PORT = String(container.getMappedPort(5432))
    process.env.DATABASE_USER = 'devdraw'
    process.env.DATABASE_PASSWORD = 'devdraw'
    process.env.DATABASE_NAME = 'devdraw_test'
    process.env.JWT_ACCESS_SECRET = 'integration-test-secret'
    process.env.ENCRYPTION_MASTER_KEY = 'a'.repeat(64)
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback'
    process.env.FRONTEND_URL = 'http://localhost:5173'
    process.env.NODE_ENV = 'test'

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalFilters(new GlobalExceptionFilter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
    await app.init()

    const jwtService = module.get(JwtService)
    const dataSource = module.get(DataSource)

    const userRepo = dataSource.getRepository(User)
    const user = await userRepo.save({
      googleId: 'test-google-id',
      email: 'test@devdraw.com',
      name: 'Test User',
    })

    authToken = jwtService.sign({ sub: user.id, id: user.id, email: user.email, name: user.name })
  }, 90_000)

  afterAll(async () => {
    await app.close()
    await container.stop()
  }, 30_000)

  // ─── Projects ─────────────────────────────────────────────────────────────

  describe('Projects', () => {
    describe('POST /projects', () => {
      it('should create a project and return 201', async () => {
        const res = await request(app.getHttpServer())
          .post('/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'My Architecture' })

        expect(res.status).toBe(201)
        expect(res.body).toMatchObject({ name: 'My Architecture' })
        expect(res.body.id).toBeDefined()
        projectId = res.body.id
      })

      it('should return 401 without auth token', async () => {
        const res = await request(app.getHttpServer())
          .post('/projects')
          .send({ name: 'Unauthorized' })

        expect(res.status).toBe(401)
      })
    })

    describe('GET /projects', () => {
      it('should list projects for the authenticated user', async () => {
        const res = await request(app.getHttpServer())
          .get('/projects')
          .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThanOrEqual(1)
      })
    })

    describe('GET /projects/:id', () => {
      it('should return the project', async () => {
        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}`)
          .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ id: projectId, name: 'My Architecture' })
      })

      it('should return 404 for nonexistent project', async () => {
        const res = await request(app.getHttpServer())
          .get('/projects/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(404)
      })
    })

    describe('PATCH /projects/:id', () => {
      it('should rename the project', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/projects/${projectId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Renamed Architecture' })

        expect(res.status).toBe(200)
        expect(res.body.name).toBe('Renamed Architecture')
      })
    })

    describe('GET /projects/:id/members', () => {
      it('should list project members', async () => {
        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/members`)
          .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBe(1)
        expect(res.body[0].role).toBe('OWNER')
      })
    })
  })

  // ─── Invitations ──────────────────────────────────────────────────────────

  describe('Invitations', () => {
    let invitationToken: string

    describe('POST /projects/:id/invitations', () => {
      it('should create a pending invitation', async () => {
        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/invitations`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ invitedEmail: 'colleague@example.com' })

        expect(res.status).toBe(201)
        expect(res.body).toMatchObject({
          invitedEmail: 'colleague@example.com',
          status: 'PENDING',
        })
        expect(res.body.token).toBeDefined()
        invitationToken = res.body.token
      })
    })

    describe('GET /invitations/:token', () => {
      it('should return invitation details for a valid token', async () => {
        const res = await request(app.getHttpServer())
          .get(`/invitations/${invitationToken}`)

        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ token: invitationToken, status: 'PENDING' })
      })

      it('should return 404 for unknown token', async () => {
        const res = await request(app.getHttpServer())
          .get('/invitations/invalid-token-xyz')

        expect(res.status).toBe(404)
      })
    })

    describe('POST /invitations/:token/decline', () => {
      it('should decline the invitation', async () => {
        const res = await request(app.getHttpServer())
          .post(`/invitations/${invitationToken}/decline`)

        expect(res.status).toBe(204)
      })

      it('should not accept a declined invitation', async () => {
        const res = await request(app.getHttpServer())
          .post(`/invitations/${invitationToken}/accept`)
          .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(403)
      })
    })
  })

  // ─── Nodes ────────────────────────────────────────────────────────────────

  describe('Nodes', () => {
    describe('POST /projects/:projectId/nodes — create', () => {
      it('should create a FOLDER node and return 201', async () => {
        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/nodes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Architecture', type: NodeType.FOLDER })

        expect(res.status).toBe(201)
        expect(res.body).toMatchObject({ name: 'Architecture', type: 'FOLDER' })
        expect(res.body.id).toBeDefined()
        folderId = res.body.id
      })

      it('should create a FILE inside the folder and return 201', async () => {
        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/nodes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'System Design', type: NodeType.FILE, parentId: folderId })

        expect(res.status).toBe(201)
        expect(res.body).toMatchObject({ name: 'System Design', type: 'FILE' })
        fileId = res.body.id
      })

      it('should return 401 without auth token', async () => {
        const res = await request(app.getHttpServer())
          .post(`/projects/${projectId}/nodes`)
          .send({ name: 'Unauthorized', type: NodeType.FOLDER })

        expect(res.status).toBe(401)
      })
    })

    describe('GET /projects/:projectId/nodes — tree', () => {
      it('should return flat list with both created nodes', async () => {
        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/nodes`)
          .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThanOrEqual(2)
      })
    })

    describe('PATCH /projects/:projectId/nodes/:id/content — auto-save', () => {
      it('should save canvas JSON and return 204', async () => {
        const content = JSON.stringify({ type: 'draw', elements: [{ id: 'shape-1' }] })

        const res = await request(app.getHttpServer())
          .patch(`/projects/${projectId}/nodes/${fileId}/content`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content })

        expect(res.status).toBe(204)
      })

      it('should create a version snapshot after saving', async () => {
        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/nodes/${fileId}/versions`)
          .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(200)
        expect(res.body.length).toBe(1)
        expect(res.body[0].versionNumber).toBe(1)
      })

      it('should increment version number on second save', async () => {
        const content = JSON.stringify({ type: 'draw', elements: [{ id: 'shape-2' }] })

        await request(app.getHttpServer())
          .patch(`/projects/${projectId}/nodes/${fileId}/content`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ content })

        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/nodes/${fileId}/versions`)
          .set('Authorization', `Bearer ${authToken}`)

        expect(res.body.length).toBe(2)
        const numbers = res.body.map((v: any) => v.versionNumber).sort()
        expect(numbers).toEqual([1, 2])
      })
    })

    describe('GET /projects/:projectId/nodes/:id — single node', () => {
      it('should return node with decrypted content', async () => {
        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/nodes/${fileId}`)
          .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(200)
        expect(res.body.id).toBe(fileId)
      })

      it('should return 404 for nonexistent node id', async () => {
        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/nodes/00000000-0000-0000-0000-000000000000`)
          .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(404)
        expect(res.body).toMatchObject({ statusCode: 404, path: expect.any(String) })
      })
    })

    describe('PATCH /projects/:projectId/nodes/:id — update', () => {
      it('should rename a node', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/projects/${projectId}/nodes/${folderId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Renamed Architecture' })

        expect(res.status).toBe(200)
        expect(res.body.name).toBe('Renamed Architecture')
      })

      it('should return 404 when updating nonexistent node', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/projects/${projectId}/nodes/00000000-0000-0000-0000-000000000000`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Ghost' })

        expect(res.status).toBe(404)
      })
    })

    describe('DELETE /projects/:projectId/nodes/:id — soft delete', () => {
      it('should soft delete a node and return 204', async () => {
        const res = await request(app.getHttpServer())
          .delete(`/projects/${projectId}/nodes/${folderId}`)
          .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(204)
      })

      it('should return 404 after soft delete', async () => {
        const res = await request(app.getHttpServer())
          .get(`/projects/${projectId}/nodes/${folderId}`)
          .set('Authorization', `Bearer ${authToken}`)

        expect(res.status).toBe(404)
      })
    })
  })

  // ─── Projects — cleanup ───────────────────────────────────────────────────

  describe('DELETE /projects/:id', () => {
    it('should delete project and return 204', async () => {
      const newProject = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'To Delete' })

      const res = await request(app.getHttpServer())
        .delete(`/projects/${newProject.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(204)
    })
  })
})
