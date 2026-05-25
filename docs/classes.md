# DevDraw — Mapa de Classes

> Atualizado em: 2026-05-24 | Fase: Setup

---

<details id="dir-root">
<summary><strong>devDraw/ (raiz)</strong></summary>
<blockquote>

- [.gitignore](../.gitignore) — arquivos ignorados pelo git
- [docker-compose.dev.yml](../docker-compose.dev.yml) — PostgreSQL + pgAdmin para desenvolvimento local
- [Erros.md](../Erros.md) — registro de bugs corrigidos durante o desenvolvimento

</blockquote>
</details>

---

<details id="dir-docs">
<summary><strong>docs/</strong></summary>
<blockquote>

- [requisitos.md](requisitos.md) — requisitos funcionais e não-funcionais do projeto
- [arquitetura.md](arquitetura.md) — decisões técnicas, modelo de dados e endpoints
- [classes.md](classes.md) — este arquivo

</blockquote>
</details>

---

## backend/

<details id="dir-backend-root">
<summary><strong>backend/ (config)</strong></summary>
<blockquote>

- [package.json](../backend/package.json) — dependências e scripts
- [tsconfig.json](../backend/tsconfig.json) — configuração TypeScript base
- [tsconfig.build.json](../backend/tsconfig.build.json) — configuração TypeScript para build
- [nest-cli.json](../backend/nest-cli.json) — configuração do NestJS CLI
- [eslint.config.mjs](../backend/eslint.config.mjs) — regras de linting
- [.prettierrc](../backend/.prettierrc) — formatação de código
- [.env.example](../backend/.env.example) — variáveis de ambiente (template)

</blockquote>
</details>

<details id="dir-backend-src">
<summary><strong>backend/src/</strong></summary>
<blockquote>

<details id="main-ts">
<summary><strong><a href="../backend/src/main.ts">main.ts</a></strong></summary>
<blockquote>

Entry point da aplicação NestJS.

<details><summary>funcao</summary><blockquote>

- `bootstrap()` — cria a app, configura ValidationPipe global, CORS, Swagger e inicia o servidor

</blockquote></details>

<details><summary>configuracoes</summary><blockquote>

- ValidationPipe: `whitelist`, `forbidNonWhitelisted`, `transform`
- CORS: origem do frontend via `FRONTEND_URL`
- Swagger: `/api/docs`

</blockquote></details>

</blockquote>
</details>

<details id="app-module">
<summary><strong><a href="../backend/src/app.module.ts">app.module.ts</a> [@Module]</strong></summary>
<blockquote>

Módulo raiz da aplicação. Importará os módulos de domínio nas próximas fases.

</blockquote>
</details>

<details id="app-controller">
<summary><strong><a href="../backend/src/app.controller.ts">app.controller.ts</a> [@Controller]</strong></summary>
<blockquote>

Controller padrão gerado pelo NestJS CLI (placeholder — será removido ou substituído).

<details><summary>dependencias</summary><blockquote>

- [AppService](#app-service)

</blockquote></details>

</blockquote>
</details>

<details id="app-service">
<summary><strong><a href="../backend/src/app.service.ts">app.service.ts</a> [@Injectable]</strong></summary>
<blockquote>

Service padrão gerado pelo NestJS CLI (placeholder — será removido ou substituído).

</blockquote>
</details>

<details id="dir-backend-common">
<summary><strong>common/ — infraestrutura transversal</strong></summary>
<blockquote>

<details id="app-exception">
<summary><strong><a href="../backend/src/common/exceptions/app.exception.ts">exceptions/app.exception.ts</a></strong></summary>
<blockquote>

Base de toda a hierarquia de exceções de domínio. Carrega `statusCode` e `message`.

<details><summary>extends</summary><blockquote>Error</blockquote></details>
<details><summary>atributos</summary><blockquote>

- `statusCode: number` — HTTP status code a ser retornado
- `message: string` (herdado de Error)

</blockquote></details>

</blockquote>
</details>

<details id="not-found-exception">
<summary><strong><a href="../backend/src/common/exceptions/not-found.exception.ts">exceptions/not-found.exception.ts</a></strong></summary>
<blockquote>

<details><summary>extends</summary><blockquote><a href="#app-exception">AppException</a> — statusCode 404</blockquote></details>
<details><summary>metodos</summary><blockquote>

- `constructor(resource: string)` — mensagem: `"${resource} not found"`

</blockquote></details>

</blockquote>
</details>

<details id="conflict-exception">
<summary><strong><a href="../backend/src/common/exceptions/conflict.exception.ts">exceptions/conflict.exception.ts</a></strong></summary>
<blockquote>

<details><summary>extends</summary><blockquote><a href="#app-exception">AppException</a> — statusCode 409</blockquote></details>
<details><summary>metodos</summary><blockquote>

- `constructor(resource: string)` — mensagem: `"${resource} already exists"`

</blockquote></details>

</blockquote>
</details>

<details id="unauthorized-exception">
<summary><strong><a href="../backend/src/common/exceptions/unauthorized.exception.ts">exceptions/unauthorized.exception.ts</a></strong></summary>
<blockquote>

<details><summary>extends</summary><blockquote><a href="#app-exception">AppException</a> — statusCode 401</blockquote></details>

</blockquote>
</details>

<details id="error-response-dto">
<summary><strong><a href="../backend/src/common/dto/error-response.dto.ts">dto/error-response.dto.ts</a></strong></summary>
<blockquote>

Corpo padrão de todas as respostas de erro da API.

<details><summary>atributos</summary><blockquote>

- `statusCode: number`
- `message: string`
- `timestamp: string` — ISO 8601
- `path: string` — URL da requisição

</blockquote></details>

</blockquote>
</details>

<details id="global-exception-filter">
<summary><strong><a href="../backend/src/common/filters/global-exception.filter.ts">filters/global-exception.filter.ts</a> [@Catch()]</strong></summary>
<blockquote>

Intercepta todas as exceções e retorna [ErrorResponse](#error-response-dto) serializado.

<details><summary>implements</summary><blockquote>ExceptionFilter (NestJS)</blockquote></details>
<details><summary>metodos</summary><blockquote>

- `catch(exception, host)` — se `AppException`: usa `statusCode`/`message`; caso contrário: loga e retorna 500

</blockquote></details>

</blockquote>
</details>

</blockquote>
</details>

<details id="dir-backend-auth">
<summary><strong>auth/ — autenticação</strong></summary>
<blockquote>

<details id="auth-module">
<summary><strong><a href="../backend/src/auth/auth.module.ts">auth.module.ts</a> [@Module]</strong></summary>
<blockquote>

<details><summary>imports</summary><blockquote>UsersModule, PassportModule, JwtModule</blockquote></details>
<details><summary>providers</summary><blockquote><a href="#auth-service">AuthService</a>, <a href="#google-strategy">GoogleStrategy</a>, <a href="#jwt-strategy">JwtStrategy</a></blockquote></details>

</blockquote>
</details>

<details id="auth-service">
<summary><strong><a href="../backend/src/auth/auth.service.ts">auth.service.ts</a> [@Injectable]</strong></summary>
<blockquote>

<details><summary>dependencias</summary><blockquote>

- [UsersService](#users-service)
- JwtService (NestJS)

</blockquote></details>
<details><summary>metodos</summary><blockquote>

- `validateGoogleUser(profile)` — delega para `UsersService.findOrCreate`
- `generateTokens(user)` — emite access (15min) + refresh (7d) e persiste refresh
- `refreshTokens(userId, token)` — valida token armazenado, rota novo par; lança [UnauthorizedException](#unauthorized-exception)
- `logout(userId)` — limpa refreshToken no banco

</blockquote></details>

</blockquote>
</details>

<details id="auth-controller">
<summary><strong><a href="../backend/src/auth/auth.controller.ts">auth.controller.ts</a> [@Controller('auth')]</strong></summary>
<blockquote>

<details><summary>dependencias</summary><blockquote><a href="#auth-service">AuthService</a></blockquote></details>
<details><summary>metodos</summary><blockquote>

- `GET /auth/google` — redireciona para Google OAuth (guard: `AuthGuard('google')`)
- `GET /auth/google/callback` — callback OAuth; redireciona ao frontend com tokens na URL
- `POST /auth/refresh` — recebe [RefreshTokenDto](#refresh-token-dto), retorna novo par
- `POST /auth/logout` — guard: [JwtAuthGuard](#jwt-auth-guard); limpa sessão

</blockquote></details>

</blockquote>
</details>

<details id="google-strategy">
<summary><strong><a href="../backend/src/auth/strategies/google.strategy.ts">strategies/google.strategy.ts</a> [@Injectable]</strong></summary>
<blockquote>

Passport Strategy para Google OAuth2. Extrai perfil e delega para [AuthService.validateGoogleUser](#auth-service).

</blockquote>
</details>

<details id="jwt-strategy">
<summary><strong><a href="../backend/src/auth/strategies/jwt.strategy.ts">strategies/jwt.strategy.ts</a> [@Injectable]</strong></summary>
<blockquote>

Passport Strategy JWT. Extrai Bearer token do header, valida assinatura e retorna `{ id, email }`.

</blockquote>
</details>

<details id="jwt-auth-guard">
<summary><strong><a href="../backend/src/auth/guards/jwt-auth.guard.ts">guards/jwt-auth.guard.ts</a> [@Injectable]</strong></summary>
<blockquote>

<details><summary>extends</summary><blockquote>AuthGuard('jwt') — protege rotas autenticadas</blockquote></details>

</blockquote>
</details>

<details id="refresh-token-dto">
<summary><strong><a href="../backend/src/auth/dto/refresh-token.dto.ts">dto/refresh-token.dto.ts</a></strong></summary>
<blockquote>

<details><summary>atributos</summary><blockquote>

- `userId: string` (@IsUUID)
- `refreshToken: string` (@IsString)

</blockquote></details>

</blockquote>
</details>

</blockquote>
</details>

<details id="dir-backend-users">
<summary><strong>users/ — domínio de usuários</strong></summary>
<blockquote>

<details id="user-entity">
<summary><strong><a href="../backend/src/users/user.entity.ts">user.entity.ts</a> [@Entity('users')]</strong></summary>
<blockquote>

<details><summary>atributos</summary><blockquote>

- `id: string` (@PrimaryGeneratedColumn uuid)
- `googleId: string` (unique)
- `email: string` (unique)
- `name: string`
- `avatarUrl?: string` (nullable)
- `refreshToken?: string` (nullable — null quando deslogado)
- `createdAt: Date`, `updatedAt: Date`

</blockquote></details>

</blockquote>
</details>

<details id="users-service">
<summary><strong><a href="../backend/src/users/users.service.ts">users.service.ts</a> [@Injectable]</strong></summary>
<blockquote>

<details><summary>dependencias</summary><blockquote>Repository&lt;<a href="#user-entity">User</a>&gt; (@InjectRepository)</blockquote></details>
<details><summary>metodos</summary><blockquote>

- `findOrCreate(profile)` — busca por `googleId`; cria se não existir
- `findById(id)` — busca por PK
- `updateRefreshToken(userId, token)` — persiste ou limpa o refresh token

</blockquote></details>

</blockquote>
</details>

- [users.module.ts](../backend/src/users/users.module.ts) — registra `TypeOrmModule.forFeature([User])` e exporta `UsersService`

</blockquote>
</details>

<details id="dir-backend-nodes">
<summary><strong>nodes/ — domínio de nós (Vault)</strong></summary>
<blockquote>

<details id="node-entity">
<summary><strong><a href="../backend/src/nodes/node.entity.ts">node.entity.ts</a> [@Entity('nodes')]</strong></summary>
<blockquote>

<details><summary>atributos</summary><blockquote>

- `id: string` (uuid PK)
- `userId: string` (FK → [User](#user-entity))
- `parentId?: string` (FK auto-referência — null para raiz)
- `name: string`
- `type: NodeType` (enum: FOLDER | FILE)
- `content?: Buffer` (JSONB criptografado via AES-256-GCM — null se FOLDER)
- `deletedAt?: Date` (soft delete via @DeleteDateColumn)
- `createdAt: Date`, `updatedAt: Date`

</blockquote></details>
<details><summary>tipos</summary><blockquote>

- `enum NodeType { FOLDER = 'FOLDER', FILE = 'FILE' }`

</blockquote></details>

</blockquote>
</details>

<details id="node-not-found-exception">
<summary><strong><a href="../backend/src/nodes/node-not-found.exception.ts">node-not-found.exception.ts</a></strong></summary>
<blockquote>

<details><summary>extends</summary><blockquote><a href="#not-found-exception">NotFoundException</a> — `constructor(id)` → mensagem: `"Node ${id} not found"`</blockquote></details>

</blockquote>
</details>

<details id="nodes-service">
<summary><strong><a href="../backend/src/nodes/nodes.service.ts">nodes.service.ts</a> [@Injectable]</strong></summary>
<blockquote>

<details><summary>dependencias</summary><blockquote>

- Repository&lt;<a href="#node-entity">Node</a>&gt;
- DataSource (TypeORM) — para Recursive CTE raw query
- [CryptoService](#crypto-service) — encrypt/decrypt do content
- [NodeVersionsService](#node-versions-service)

</blockquote></details>
<details><summary>metodos</summary><blockquote>

- `getTree(userId)` — Recursive CTE: retorna flat list sem content (sem campo pesado)
- `findByIdOrFail(id, userId)` — busca + descriptografa content; lança [NodeNotFoundException](#node-not-found-exception)
- `create(userId, dto)` — cria FOLDER ou FILE
- `update(id, userId, dto)` — renomeia e/ou move (altera parentId)
- `saveContent(id, userId, content)` — criptografa + salva + cria versão via [NodeVersionsService](#node-versions-service)
- `softDelete(id, userId)` — seta `deletedAt`; lança [NodeNotFoundException](#node-not-found-exception) se inexistente

</blockquote></details>

</blockquote>
</details>

<details id="nodes-controller">
<summary><strong><a href="../backend/src/nodes/nodes.controller.ts">nodes.controller.ts</a> [@Controller('nodes')]</strong></summary>
<blockquote>

Protegido por [JwtAuthGuard](#jwt-auth-guard) em todas as rotas.

<details><summary>dependencias</summary><blockquote>

- [NodesService](#nodes-service)
- [NodeVersionsService](#node-versions-service)

</blockquote></details>
<details><summary>metodos</summary><blockquote>

- `GET /nodes` → `getTree()`
- `GET /nodes/:id` → `getOne()` — 404 se não encontrado
- `POST /nodes` → `create()` com [CreateNodeDto](#create-node-dto)
- `PATCH /nodes/:id` → `update()` com [UpdateNodeDto](#update-node-dto) — 404 se não encontrado
- `PATCH /nodes/:id/content` → `saveContent()` com [SaveContentDto](#save-content-dto) — 204; 404 se não encontrado
- `DELETE /nodes/:id` → `remove()` — 204; 404 se não encontrado
- `GET /nodes/:id/versions` → `listVersions()`
- `GET /nodes/:id/versions/:vid` → `getVersion()`
- `POST /nodes/:id/versions/:vid/restore` → `restoreVersion()`

</blockquote></details>

</blockquote>
</details>

<details id="create-node-dto">
<summary><strong><a href="../backend/src/nodes/dto/create-node.dto.ts">dto/create-node.dto.ts</a></strong></summary>
<blockquote>

`name: string`, `type: NodeType`, `parentId?: string` (UUID opcional)

</blockquote>
</details>

<details id="update-node-dto">
<summary><strong><a href="../backend/src/nodes/dto/update-node.dto.ts">dto/update-node.dto.ts</a></strong></summary>
<blockquote>

`name?: string`, `parentId?: string` (ambos opcionais)

</blockquote>
</details>

<details id="save-content-dto">
<summary><strong><a href="../backend/src/nodes/dto/save-content.dto.ts">dto/save-content.dto.ts</a></strong></summary>
<blockquote>

`content: string` — JSON serializado do estado TLDraw

</blockquote>
</details>

- [nodes.module.ts](../backend/src/nodes/nodes.module.ts) — importa TypeOrmModule, CryptoModule, NodeVersionsModule

</blockquote>
</details>

<details id="dir-backend-node-versions">
<summary><strong>node-versions/ — domínio de versionamento</strong></summary>
<blockquote>

<details id="node-version-entity">
<summary><strong><a href="../backend/src/node-versions/node-version.entity.ts">node-version.entity.ts</a> [@Entity('node_versions')]</strong></summary>
<blockquote>

<details><summary>atributos</summary><blockquote>

- `id: string` (uuid PK)
- `nodeId: string` (FK → [Node](#node-entity), onDelete CASCADE)
- `userId: string` (FK → [User](#user-entity))
- `content: Buffer` (snapshot criptografado)
- `versionNumber: number` (int, incrementado a cada save)
- `createdAt: Date`

</blockquote></details>

</blockquote>
</details>

<details id="node-versions-service">
<summary><strong><a href="../backend/src/node-versions/node-versions.service.ts">node-versions.service.ts</a> [@Injectable]</strong></summary>
<blockquote>

<details><summary>dependencias</summary><blockquote>Repository&lt;<a href="#node-version-entity">NodeVersion</a>&gt;</blockquote></details>
<details><summary>metodos</summary><blockquote>

- `createVersion(nodeId, userId, content)` — conta versões existentes, incrementa e salva
- `listVersions(nodeId, userId)` — lista sem content (campo pesado), ordenado por versionNumber DESC
- `findVersionOrFail(nodeId, versionId, userId)` — busca versão específica; lança [NotFoundException](#not-found-exception)

</blockquote></details>

</blockquote>
</details>

- [node-versions.module.ts](../backend/src/node-versions/node-versions.module.ts) — exporta [NodeVersionsService](#node-versions-service)

</blockquote>
</details>

<details id="dir-backend-crypto">
<summary><strong>crypto/ — serviço de criptografia (transversal)</strong></summary>
<blockquote>

<details id="crypto-service">
<summary><strong><a href="../backend/src/crypto/crypto.service.ts">crypto.service.ts</a> [@Injectable]</strong></summary>
<blockquote>

Criptografia AES-256-GCM com chave derivada por usuário via HMAC-SHA256.

<details><summary>metodos</summary><blockquote>

- `encrypt(plaintext, userId): Buffer` — IV aleatório (12 bytes) + authTag (16 bytes) + ciphertext
- `decrypt(data, userId): string` — extrai IV/authTag, decifra; lança se authTag inválido

</blockquote></details>

</blockquote>
</details>

- [crypto.module.ts](../backend/src/crypto/crypto.module.ts) — exporta [CryptoService](#crypto-service) para outros módulos

> Anteriormente a criar na Fase 4 — concluído.
> - `crypto.service.ts` — AES-256-GCM, `encrypt(data, userId)` e `decrypt(buffer, userId)`
> - `crypto.module.ts`

</blockquote>
</details>

</blockquote>
</details>

<details id="dir-backend-test">
<summary><strong>backend/test/</strong></summary>
<blockquote>

- [app.e2e-spec.ts](../backend/test/app.e2e-spec.ts) — smoke test e2e padrão do NestJS CLI

</blockquote>
</details>

---

## frontend/

<details id="dir-frontend-root">
<summary><strong>frontend/ (config)</strong></summary>
<blockquote>

- [package.json](../frontend/package.json) — dependências e scripts
- [tsconfig.json](../frontend/tsconfig.json) — configuração TypeScript base
- [vite.config.ts](../frontend/vite.config.ts) — Vite com plugin React + Tailwind CSS v4; proxy `/api` → backend
- [index.html](../frontend/index.html) — entry point HTML
- [.env.example](../frontend/.env.example) — variáveis de ambiente (template)

</blockquote>
</details>

<details id="dir-frontend-src">
<summary><strong>frontend/src/</strong></summary>
<blockquote>

<details id="frontend-main">
<summary><strong><a href="../frontend/src/main.tsx">main.tsx</a></strong></summary>
<blockquote>

Entry point React — monta `<App />` no DOM com `StrictMode`.

</blockquote>
</details>

<details id="frontend-app">
<summary><strong><a href="../frontend/src/App.tsx">App.tsx</a></strong></summary>
<blockquote>

Componente raiz — placeholder inicial. Receberá o roteador e providers nas próximas fases.

</blockquote>
</details>

- [index.css](../frontend/src/index.css) — importa Tailwind CSS v4

<details id="dir-frontend-features">
<summary><strong>features/</strong></summary>
<blockquote>

> A criar nas fases seguintes:
> - `auth/` — login Google, callback, guard de rota
> - `vault/` — árvore de pastas/arquivos, drag & drop
> - `canvas/` — editor TLDraw, auto-save, exportação, histórico de versões

</blockquote>
</details>

<details id="dir-frontend-shared">
<summary><strong>shared/</strong></summary>
<blockquote>

> A criar nas fases seguintes:
> - `components/` — Button, Modal, Sidebar, etc.
> - `api/` — cliente axios com interceptors de auth

</blockquote>
</details>

<details id="dir-frontend-hooks">
<summary><strong>hooks/</strong></summary>
<blockquote>

> A criar nas fases seguintes:
> - `useAuth.ts` — estado de autenticação
> - `useAutoSave.ts` — debounce para salvar o canvas

</blockquote>
</details>

</blockquote>
</details>
