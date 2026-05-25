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

> Módulos a criar na Fase 4:
> - `common/exceptions/` — hierarquia de exceções (`AppException`, `NotFoundException`, etc.)
> - `common/filters/` — `GlobalExceptionFilter` (captura todas as exceções)
> - `common/interceptors/` — interceptors reutilizáveis

</blockquote>
</details>

<details id="dir-backend-auth">
<summary><strong>auth/ — autenticação</strong></summary>
<blockquote>

> A criar na Fase 4:
> - `auth.module.ts`
> - `auth.service.ts` — Google OAuth2, emissão e revogação de JWT
> - `auth.controller.ts` — `/auth/google`, `/auth/google/callback`, `/auth/refresh`, `/auth/logout`
> - `strategies/google.strategy.ts` — Passport Google OAuth2
> - `strategies/jwt.strategy.ts` — Passport JWT para validação de access token
> - `guards/jwt-auth.guard.ts` — protege rotas autenticadas

</blockquote>
</details>

<details id="dir-backend-users">
<summary><strong>users/ — domínio de usuários</strong></summary>
<blockquote>

> A criar na Fase 5:
> - `user.entity.ts`
> - `users.repository.ts`
> - `users.service.ts`
> - `users.controller.ts`

</blockquote>
</details>

<details id="dir-backend-nodes">
<summary><strong>nodes/ — domínio de nós (Vault)</strong></summary>
<blockquote>

> A criar na Fase 5:
> - `node.entity.ts`
> - `nodes.repository.ts` — inclui Recursive CTE
> - `nodes.service.ts`
> - `nodes.controller.ts`

</blockquote>
</details>

<details id="dir-backend-node-versions">
<summary><strong>node-versions/ — domínio de versionamento</strong></summary>
<blockquote>

> A criar na Fase 5:
> - `node-version.entity.ts`
> - `node-versions.service.ts`
> - `node-versions.controller.ts`

</blockquote>
</details>

<details id="dir-backend-crypto">
<summary><strong>crypto/ — serviço de criptografia (transversal)</strong></summary>
<blockquote>

> A criar na Fase 4:
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
